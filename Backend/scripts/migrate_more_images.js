import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../src/config/env.js';

// Models
import { FoodCategory as Category } from '../src/modules/food/admin/models/category.model.js';
import { FoodBusinessSettings as BusinessSettings } from '../src/modules/food/admin/models/businessSettings.model.js';

const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'src', 'uploads');

async function processImage(url, entityType, width, height, quality, prefix, targetSubfolder) {
    if (!url || !url.includes('cloudinary.com')) return url;

    try {
        const urlParts = url.split('/');
        const filenameWithExt = urlParts[urlParts.length - 1];
        const originalFilename = filenameWithExt.split('?')[0];

        // Potential places where it was downloaded
        const potentialPaths = [
            path.join(UPLOAD_BASE_DIR, targetSubfolder, originalFilename),
            path.join(UPLOAD_BASE_DIR, entityType, originalFilename),
            path.join(UPLOAD_BASE_DIR, entityType, 'favicons', originalFilename),
            path.join(UPLOAD_BASE_DIR, entityType, 'logos', originalFilename),
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
            console.log(`[${entityType}] File not found locally: ${originalFilename}`);
            return url; // Return original if not found
        }

        const newFilename = `${prefix}_${uuidv4().replace(/-/g, '').substring(0, 8)}.webp`;
        const targetFolder = path.join(UPLOAD_BASE_DIR, targetSubfolder);
        if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });
        
        const targetPath = path.join(targetFolder, newFilename);

        await sharp(foundPath)
            .resize({ width, height, fit: 'inside', withoutEnlargement: true })
            .webp({ quality })
            .toFile(targetPath);

        return `/uploads/${targetSubfolder}/${newFilename}`;
    } catch (err) {
        console.error(`[${entityType}] Error processing ${url}:`, err.message);
        return url;
    }
}

async function migrateCategories() {
    console.log('Migrating Categories...');
    const items = await Category.find({ image: { $regex: 'cloudinary', $options: 'i' } });
    for (const item of items) {
        if (item.image) {
            const newUrl = await processImage(item.image, 'categories', 800, 800, 85, 'cat', 'categories');
            if (newUrl !== item.image) {
                item.image = newUrl;
                await item.save();
                console.log(`✅ Migrated category: ${item.name}`);
            }
        }
    }
}

async function migrateBusinessSettings() {
    console.log('Migrating Business Settings...');
    const items = await BusinessSettings.find();
    for (const item of items) {
        let changed = false;
        if (item.logo && item.logo.url && item.logo.url.includes('cloudinary')) {
            const newUrl = await processImage(item.logo.url, 'business', 400, 400, 85, 'logo', 'business/logos');
            if (newUrl !== item.logo.url) {
                item.logo.url = newUrl;
                changed = true;
            }
        }
        if (item.favicon && item.favicon.url && item.favicon.url.includes('cloudinary')) {
            const newUrl = await processImage(item.favicon.url, 'business', 100, 100, 90, 'fav', 'business/favicons');
            if (newUrl !== item.favicon.url) {
                item.favicon.url = newUrl;
                changed = true;
            }
        }
        if (changed) {
            await item.save();
            console.log(`✅ Migrated business settings`);
        }
    }
}

async function run() {
    try {
        await mongoose.connect(config.mongodbUri);
        console.log('Connected to MongoDB');

        await migrateCategories();
        await migrateBusinessSettings();
        
        console.log('Migration Complete.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
