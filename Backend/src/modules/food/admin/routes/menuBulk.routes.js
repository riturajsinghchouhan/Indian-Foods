import express from 'express';
import { upload } from '../../../../middleware/upload.js';
import * as xlsx from 'xlsx';
import { FoodItem } from '../models/food.model.js';
import { FoodCategory } from '../models/category.model.js';
import { Queue } from 'bullmq';
import { getBullMQConnection } from '../../../../queues/connection.js';
import { MENU_IMAGE_QUEUE } from '../../../../queues/queue.constants.js';
import { logger } from '../../../../utils/logger.js';

const router = express.Router();

let menuImageQueue = null;
try {
    const connection = getBullMQConnection();
    if (connection) {
        menuImageQueue = new Queue(MENU_IMAGE_QUEUE, { connection });
    }
} catch (e) {
    logger.warn('Failed to initialize Menu Image Queue in routes');
}

/**
 * Bulk upload menu via Excel/CSV
 */
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
    try {
        const { restaurantId } = req.body;
        
        if (!restaurantId) {
            return res.status(400).json({ success: false, message: 'restaurantId is required' });
        }
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Excel or CSV file is required' });
        }
        
        // Parse Excel/CSV
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = xlsx.utils.sheet_to_json(worksheet);
        
        if (!rows || rows.length === 0) {
            return res.status(400).json({ success: false, message: 'File is empty or invalid format' });
        }

        const validRows = rows.filter(row => {
            const sectionName = (row['Category Name'] || row.Section || row.section || '').trim();
            const itemName = (row.Name || row['Item Name'] || row.itemName || row.name || '').trim();
            const price = parseFloat(row.Price || row.price || 0);
            return sectionName && itemName && !isNaN(price);
        });

        if (validRows.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid menu items found in file. Check column names (Category Name, Name, Price).' });
        }
        
        // 1. Get unique sections/categories
        const uniqueSections = [...new Set(validRows.map(r => (r['Category Name'] || r.Section || r.section || '').trim()))];
        const categoryMap = {}; // sectionName -> categoryId

        // Find existing categories or create them
        for (const section of uniqueSections) {
            let category = await FoodCategory.findOne({ name: section, restaurantId });
            if (!category) {
                category = await FoodCategory.create({
                    name: section,
                    restaurantId,
                    createdByRestaurantId: restaurantId,
                    approvalStatus: 'approved',
                    isApproved: true
                });
            }
            categoryMap[section] = category._id;
        }

        // 2. Create Food Items
        const newItems = [];
        for (const row of validRows) {
            const sectionName = (row['Category Name'] || row.Section || row.section || '').trim();
            const itemName = (row.Name || row['Item Name'] || row.itemName || row.name || '').trim();
            const price = parseFloat(row.Price || row.price || 0);
            const description = (row.Description || row.description || '').trim();
            
            const rawType = (row['Food Type (Veg/Non-Veg)'] || row.Type || row.type || 'veg').trim().toLowerCase();
            const foodType = (rawType.includes('non-veg') || rawType === 'nonveg') ? 'Non-Veg' : 'Veg';
            
            const preparationTime = (row['Preparation Time'] || '').toString().trim();
            
            const rawIsAvailable = row['Is Available (TRUE/FALSE)'];
            let isAvailable = true;
            if (rawIsAvailable !== undefined && rawIsAvailable !== null) {
                isAvailable = String(rawIsAvailable).toLowerCase().trim() === 'true';
            }
            
            const imageUrl = (row['Image URL'] || '').trim();
            
            // Parse Variants (e.g. "Half:180, Full:350")
            const variantsStr = (row['Variants (Name:Price, ...)'] || row.Variants || '').toString().trim();
            const variants = [];
            if (variantsStr) {
                const parts = variantsStr.split(',');
                for (const part of parts) {
                    const [vName, vPrice] = part.split(':');
                    if (vName && vPrice && !isNaN(parseFloat(vPrice))) {
                        variants.push({
                            name: vName.trim(),
                            price: parseFloat(vPrice.trim())
                        });
                    }
                }
            }

            const item = await FoodItem.create({
                restaurantId,
                categoryId: categoryMap[sectionName],
                categoryName: sectionName,
                name: itemName,
                description,
                price,
                foodType,
                preparationTime,
                variants,
                image: imageUrl, // Uses provided image if any, otherwise will be AI generated
                isAvailable,
                approvalStatus: 'approved'
            });
            
            newItems.push({
                itemDoc: item,
                sectionName,
                hasPredefinedImage: !!imageUrl
            });
        }
        
        // 3. Structure response for frontend (sections -> items array)
        // Group new items by section
        const sectionsResponseMap = {};
        let queuedJobsCount = 0;

        for (const { itemDoc, sectionName, hasPredefinedImage } of newItems) {
            if (!sectionsResponseMap[sectionName]) {
                sectionsResponseMap[sectionName] = { name: sectionName, items: [] };
            }

            const itemForUI = {
                id: itemDoc._id.toString(),
                name: itemDoc.name,
                price: itemDoc.price,
                description: itemDoc.description,
                type: itemDoc.foodType === 'Veg' ? 'veg' : 'non-veg',
                image: itemDoc.image,
                inStock: itemDoc.isAvailable
            };

            sectionsResponseMap[sectionName].items.push(itemForUI);
            
            // Queue image generation ONLY if no image was provided in the excel file
            if (menuImageQueue && !hasPredefinedImage) {
                await menuImageQueue.add('generateImage', {
                    restaurantId,
                    itemId: itemDoc._id.toString(), // Pass itemId instead of array indices
                    itemName: itemDoc.name,
                    itemDescription: itemDoc.description,
                    // Keeping indices for backward compatibility with frontend socket logic
                    sectionIndex: Object.keys(sectionsResponseMap).indexOf(sectionName),
                    itemIndex: sectionsResponseMap[sectionName].items.length - 1
                });
                queuedJobsCount++;
            }
        }

        const menuResponse = Object.values(sectionsResponseMap);
        
        res.status(200).json({
            success: true,
            message: 'Menu uploaded successfully',
            queuedJobsCount,
            menu: menuResponse
        });
        
    } catch (error) {
        logger.error(`Menu Bulk Upload Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to process file' });
    }
});

/**
 * Trigger manual regeneration for a specific item
 */
router.post('/regenerate-image', async (req, res) => {
    try {
        // Wait, the frontend passes sectionIndex and itemIndex, but also could pass itemId if we modify it.
        // Let's modify frontend to pass itemId later, or we can look it up if needed.
        // Actually it's easier to change frontend to pass `itemId` since it knows `item.id`.
        const { restaurantId, itemId, sectionIndex, itemIndex } = req.body;
        
        if (!restaurantId || (!itemId && sectionIndex === undefined)) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        let itemDoc;
        if (itemId) {
            itemDoc = await FoodItem.findOne({ _id: itemId, restaurantId });
        } else {
            // Fallback for old frontend behavior
            return res.status(400).json({ success: false, message: 'Please provide itemId to regenerate' });
        }

        if (!itemDoc) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        
        if (menuImageQueue) {
            await menuImageQueue.add('generateImage', {
                restaurantId,
                itemId: itemDoc._id.toString(),
                itemName: itemDoc.name,
                itemDescription: itemDoc.description,
                sectionIndex, // Pass along so frontend socket event works
                itemIndex
            });
            return res.status(200).json({ success: true, message: 'Image regeneration queued' });
        } else {
            return res.status(500).json({ success: false, message: 'Queue is not initialized' });
        }
        
    } catch (error) {
        logger.error(`Regenerate Image Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to queue image generation' });
    }
});

export default router;
