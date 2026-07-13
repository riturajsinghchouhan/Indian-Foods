import mongoose from 'mongoose';
import { config } from '../src/config/env.js';

// Models
import { FoodCategory } from '../src/modules/food/admin/models/category.model.js';
import { FoodBusinessSettings } from '../src/modules/food/admin/models/businessSettings.model.js';
import { FoodItem } from '../src/modules/food/admin/models/food.model.js';
import { FoodRestaurant } from '../src/modules/food/restaurant/models/restaurant.model.js';

async function removeCloudinaryUrls() {
    console.log('Removing broken Cloudinary URLs from Categories...');
    const categories = await FoodCategory.find({ image: { $regex: 'cloudinary', $options: 'i' } });
    for (const cat of categories) {
        cat.image = '';
        await cat.save();
    }
    console.log(`✅ Cleared image for ${categories.length} Categories.`);

    console.log('Removing broken Cloudinary URLs from Business Settings...');
    const settings = await FoodBusinessSettings.find();
    let settingsCount = 0;
    for (const setting of settings) {
        let changed = false;
        if (setting.logo && setting.logo.url && setting.logo.url.includes('cloudinary')) {
            setting.logo.url = '';
            setting.logo.publicId = '';
            changed = true;
        }
        if (setting.favicon && setting.favicon.url && setting.favicon.url.includes('cloudinary')) {
            setting.favicon.url = '';
            setting.favicon.publicId = '';
            changed = true;
        }
        if (changed) {
            await setting.save();
            settingsCount++;
        }
    }
    console.log(`✅ Cleared logo/favicon for ${settingsCount} Business Settings`);

    console.log('Removing broken Cloudinary URLs from Food Items...');
    const foods = await FoodItem.find({ image: { $regex: 'cloudinary', $options: 'i' } });
    let clearedFoods = 0;
    for (const food of foods) {
        food.image = '';
        await food.save();
        clearedFoods++;
    }
    console.log(`✅ Cleared image for ${clearedFoods} Food Items.`);

    console.log('Removing broken Cloudinary URLs from Restaurants...');
    const restaurants = await FoodRestaurant.find({
        $or: [
            { image: { $regex: 'cloudinary', $options: 'i' } },
            { profileImage: { $regex: 'cloudinary', $options: 'i' } },
            { coverImage: { $regex: 'cloudinary', $options: 'i' } }
        ]
    });
    let restCount = 0;
    for (const rest of restaurants) {
        let changed = false;
        if (rest.image && rest.image.includes('cloudinary')) {
            rest.image = '';
            changed = true;
        }
        if (rest.profileImage && rest.profileImage.includes('cloudinary')) {
            rest.profileImage = '';
            changed = true;
        }
        if (rest.coverImage && rest.coverImage.includes('cloudinary')) {
            rest.coverImage = '';
            changed = true;
        }
        if (Array.isArray(rest.images)) {
            const initialLength = rest.images.length;
            rest.images = rest.images.filter(img => !img.includes('cloudinary'));
            if (rest.images.length !== initialLength) changed = true;
        }
        if (changed) {
            await rest.save();
            restCount++;
        }
    }
    console.log(`✅ Cleared images for ${restCount} Restaurants.`);
}

async function run() {
    try {
        await mongoose.connect(config.mongodbUri);
        console.log('Connected to MongoDB');

        await removeCloudinaryUrls();
        
        console.log('Successfully removed all broken Cloudinary references.');
    } catch (err) {
        console.error('Operation failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
