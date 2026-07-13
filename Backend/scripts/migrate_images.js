import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../src/config/env.js';

// Models
import { FoodItem } from '../src/modules/food/admin/models/food.model.js';

const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'src', 'uploads');

async function migrateFoodItems() {
    console.log('Migrating Food Items...');
    const foods = await FoodItem.find({ image: { $regex: 'cloudinary', $options: 'i' } });
    console.log(`Found ${foods.length} food items with cloudinary URLs.`);

    for (const food of foods) {
        try {
            if (!food.image) continue;

            const urlParts = food.image.split('/');
            const filenameWithExt = urlParts[urlParts.length - 1];
            const originalFilename = filenameWithExt.split('?')[0];

            // Look for the file in the downloaded folders
            const potentialPaths = [
                path.join(UPLOAD_BASE_DIR, 'foods', originalFilename),
                path.join(UPLOAD_BASE_DIR, 'food', originalFilename),
                path.join(UPLOAD_BASE_DIR, originalFilename)
            ];

            let foundPath = null;
            for (const p of potentialPaths) {
                if (fs.existsSync(p)) {
                    foundPath = p;
                    break;
                }
            }

            if (!foundPath) {
                console.log(`File not found locally for food: ${food.name} (ID: ${food._id}) - ${originalFilename}`);
                continue;
            }

            // Process image using sharp
            const newFilename = `food_${uuidv4().replace(/-/g, '').substring(0, 8)}.webp`;
            const targetFolder = path.join(UPLOAD_BASE_DIR, 'food/items');
            if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });
            const targetPath = path.join(targetFolder, newFilename);

            await sharp(foundPath)
                .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toFile(targetPath);

            food.image = `/uploads/food/items/${newFilename}`;
            await food.save();
            console.log(`✅ Migrated food: ${food.name}`);

        } catch (err) {
            console.error(`❌ Error migrating food ID ${food._id}:`, err.message);
        }
    }
}

async function run() {
    try {
        await mongoose.connect(config.mongodbUri);
        console.log('Connected to MongoDB');

        await migrateFoodItems();
        
        console.log('Migration Complete.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
