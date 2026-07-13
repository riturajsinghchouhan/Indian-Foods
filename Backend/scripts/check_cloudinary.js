import mongoose from 'mongoose';
import { config } from '../src/config/env.js';

import { FoodCategory } from '../src/modules/food/admin/models/category.model.js';
import { FoodBusinessSettings } from '../src/modules/food/admin/models/businessSettings.model.js';
import { FoodRestaurant } from '../src/modules/food/restaurant/models/restaurant.model.js';
import { FoodItem } from '../src/modules/food/admin/models/food.model.js';
// We don't have FoodBanner available directly, but we can query raw collections.

async function checkCloudinary() {
    console.log('Checking for Cloudinary URLs...');
    
    const foods = await FoodItem.find({ image: { $regex: 'cloudinary', $options: 'i' } });
    console.log(`FoodItems with Cloudinary: ${foods.length}`);
    if (foods.length > 0) {
        console.log(`Example: ${foods[0].name} -> ${foods[0].image}`);
    }

    const categories = await FoodCategory.find({ image: { $regex: 'cloudinary', $options: 'i' } });
    console.log(`Categories with Cloudinary: ${categories.length}`);

    const settings = await FoodBusinessSettings.find();
    let settingsCount = 0;
    settings.forEach(s => {
        if ((s.logo && s.logo.url && s.logo.url.includes('cloudinary')) || 
            (s.favicon && s.favicon.url && s.favicon.url.includes('cloudinary'))) {
            settingsCount++;
        }
    });
    console.log(`BusinessSettings with Cloudinary: ${settingsCount}`);

    const restaurants = await FoodRestaurant.find({
        $or: [
            { image: { $regex: 'cloudinary', $options: 'i' } },
            { profileImage: { $regex: 'cloudinary', $options: 'i' } },
            { coverImage: { $regex: 'cloudinary', $options: 'i' } }
        ]
    });
    console.log(`Restaurants with Cloudinary: ${restaurants.length}`);
    
    // Check if food items have other image fields? FoodItem has `images`? 
    // Let's check the schema of FoodItem.
}

async function run() {
    try {
        await mongoose.connect(config.mongodbUri);
        await checkCloudinary();
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
