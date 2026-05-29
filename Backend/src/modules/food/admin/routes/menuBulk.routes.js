import express from 'express';
import { upload } from '../../../../middleware/upload.js';
import * as xlsx from 'xlsx';
import { FoodItem } from '../models/food.model.js';
import { FoodCategory } from '../models/category.model.js';
import { Queue } from 'bullmq';
import { getBullMQConnection } from '../../../../queues/connection.js';
import { MENU_IMAGE_QUEUE } from '../../../../queues/queue.constants.js';
import { generateMenuImageForItem } from '../../../../queues/processors/menuImage.processor.js';
import { getSocketIo } from '../../../../utils/socket.js';
import { logger } from '../../../../utils/logger.js';

const router = express.Router();

let menuImageQueue = null;
try {
    const connection = getBullMQConnection();
    if (connection) {
        menuImageQueue = new Queue(MENU_IMAGE_QUEUE, { connection });
        logger.info('Menu Image Queue initialized via BullMQ (Redis mode)');
    }
} catch (e) {
    logger.warn('BullMQ/Redis not available. Will use direct async fallback for image generation.');
}

/**
 * Fire-and-forget direct image generation (no Redis needed).
 * Emits socket events just like the BullMQ worker does.
 */
async function generateImageDirect(jobData) {
    const { restaurantId, itemId, itemName, sectionIndex, itemIndex } = jobData;
    try {
        const result = await generateMenuImageForItem(jobData);

        const io = getSocketIo();
        if (io && result?.success) {
            io.to('admin').emit('menuImageGenerated', {
                restaurantId,
                itemId,
                sectionIndex,
                itemIndex,
                imageUrl: result.imageUrl,
                itemName
            });
            logger.info(`[Direct] Image generated & emitted for "${itemName}"`);
        }
    } catch (err) {
        logger.error(`[Direct] Image generation failed for "${itemName}": ${err.message}`);
        const io = getSocketIo();
        if (io) {
            io.to('admin').emit('menuImageFailed', {
                restaurantId,
                itemId,
                sectionIndex,
                itemIndex,
                itemName,
                error: err.message
            });
        }
    }
}

/**
 * Queue a job — uses BullMQ if available, otherwise fires directly in background.
 */
async function enqueueImageJob(jobData) {
    if (menuImageQueue) {
        await menuImageQueue.add('generateImage', jobData);
        logger.info(`[BullMQ] Job queued for "${jobData.itemName}"`);
    } else {
        // No Redis — run directly in background (non-blocking)
        setImmediate(() => generateImageDirect(jobData));
        logger.info(`[Direct Fallback] Generating image for "${jobData.itemName}"`);
    }
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
        
        // 1. Get unique sections/categories and create if missing
        const uniqueSections = [...new Set(validRows.map(r => (r['Category Name'] || r.Section || r.section || '').trim()))];
        const categoryMap = {};

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

        // 2. Create / find Food Items
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
            
            const variantsStr = (row['Variants (Name:Price, ...)'] || row.Variants || '').toString().trim();
            const variants = [];
            if (variantsStr) {
                const parts = variantsStr.split(',');
                for (const part of parts) {
                    const [vName, vPrice] = part.split(':');
                    if (vName && vPrice && !isNaN(parseFloat(vPrice))) {
                        variants.push({ name: vName.trim(), price: parseFloat(vPrice.trim()) });
                    }
                }
            }

            // Check if item already exists
            const existingItem = await FoodItem.findOne({
                restaurantId,
                name: { $regex: new RegExp(`^${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            });

            let item;
            let hasPredefinedImage;

            if (existingItem) {
                if (existingItem.image) {
                    logger.info(`Skipping "${itemName}" — already has image`);
                    newItems.push({ itemDoc: existingItem, sectionName, hasPredefinedImage: true });
                    continue;
                } else {
                    item = existingItem;
                    hasPredefinedImage = false;
                }
            } else {
                item = await FoodItem.create({
                    restaurantId,
                    categoryId: categoryMap[sectionName],
                    categoryName: sectionName,
                    name: itemName,
                    description,
                    price,
                    foodType,
                    preparationTime,
                    variants,
                    image: imageUrl,
                    isAvailable,
                    approvalStatus: 'approved'
                });
                hasPredefinedImage = !!imageUrl;
            }
            
            newItems.push({ itemDoc: item, sectionName, hasPredefinedImage });
        }
        
        // 3. Build response & enqueue image generation
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
            
            if (!hasPredefinedImage) {
                const sectionIndex = Object.keys(sectionsResponseMap).indexOf(sectionName);
                const itemIndex = sectionsResponseMap[sectionName].items.length - 1;

                await enqueueImageJob({
                    restaurantId,
                    itemId: itemDoc._id.toString(),
                    itemName: itemDoc.name,
                    itemDescription: itemDoc.description,
                    categoryName: itemDoc.categoryName,
                    foodType: itemDoc.foodType,
                    sectionIndex,
                    itemIndex
                });
                queuedJobsCount++;
            }
        }

        const menuResponse = Object.values(sectionsResponseMap);
        
        res.status(200).json({
            success: true,
            message: `Menu uploaded successfully. Generating ${queuedJobsCount} image(s) in background.`,
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
        const { restaurantId, itemId, sectionIndex, itemIndex } = req.body;
        
        if (!restaurantId || !itemId) {
            return res.status(400).json({ success: false, message: 'restaurantId and itemId are required' });
        }
        
        const itemDoc = await FoodItem.findOne({ _id: itemId, restaurantId });
        if (!itemDoc) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Clear image so it re-generates fresh
        itemDoc.image = '';
        await itemDoc.save();
        
        await enqueueImageJob({
            restaurantId,
            itemId: itemDoc._id.toString(),
            itemName: itemDoc.name,
            itemDescription: itemDoc.description,
            categoryName: itemDoc.categoryName,
            foodType: itemDoc.foodType,
            sectionIndex,
            itemIndex
        });

        return res.status(200).json({ success: true, message: 'Image regeneration started' });
        
    } catch (error) {
        logger.error(`Regenerate Image Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to regenerate image' });
    }
});

/**
 * Get current image status for all items of a restaurant (polling fallback)
 */
router.get('/items-status/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        if (!restaurantId) {
            return res.status(400).json({ success: false, message: 'restaurantId is required' });
        }

        const items = await FoodItem.find({ restaurantId })
            .select('_id name image categoryName')
            .lean();

        // Map: itemId -> imageUrl
        const statusMap = {};
        for (const item of items) {
            statusMap[item._id.toString()] = item.image || '';
        }

        return res.status(200).json({ success: true, data: statusMap });
    } catch (error) {
        logger.error(`Items Status Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch status' });
    }
});

export default router;
