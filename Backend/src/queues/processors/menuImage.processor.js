import { logger } from '../../utils/logger.js';
import { FoodItem } from '../../modules/food/admin/models/food.model.js';
import cloudinary from '../../utils/cloudinary.js';
import { GoogleGenAI } from '@google/genai';
import { config } from '../../config/env.js';

let aiClient = null;

if (process.env.GEMINI_API_KEY) {
    try {
        aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
        logger.error('Failed to initialize Google GenAI: ' + e.message);
    }
}

async function uploadBase64ToCloudinary(base64Data, itemName) {
    return new Promise((resolve, reject) => {
        const uploadStr = `data:image/jpeg;base64,${base64Data}`;
        const folderName = `restaurants/menu_items`;
        
        cloudinary.uploader.upload(uploadStr, {
            folder: folderName,
            public_id: `${itemName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
            quality: 'auto',
            fetch_format: 'auto'
        }, (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
        });
    });
}

export const processMenuImageJob = async (job) => {
    const { restaurantId, itemId, sectionIndex, itemIndex, itemName, itemDescription } = job.data;
    
    if (!aiClient) {
        throw new Error('Google GenAI client not initialized (Missing GEMINI_API_KEY)');
    }

    try {
        const prompt = `Generate a highly realistic, professional, appetizing food photography shot of an Indian dish called '${itemName}'. Description: '${itemDescription || 'Delicious Indian food'}'. Close-up, well-lit, isolated background, no text.`;
        
        logger.info(`Requesting image for ${itemName} (Job ${job.id})`);

        const response = await aiClient.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1'
            }
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error('No image returned from Gemini/Imagen API');
        }

        const base64Image = response.generatedImages[0].image.imageBytes;

        const imageUrl = await uploadBase64ToCloudinary(base64Image, itemName);

        // Update database
        const itemDoc = await FoodItem.findOne({ _id: itemId, restaurantId });
        if (!itemDoc) {
            throw new Error(`Menu item not found for id ${itemId}`);
        }

        itemDoc.image = imageUrl;
        await itemDoc.save();

        logger.info(`Successfully generated and saved image for ${itemName}`);
        return { success: true, imageUrl, restaurantId, itemId, sectionIndex, itemIndex };

    } catch (error) {
        logger.error(`Error processing menu image job ${job.id}: ${error.message}`);
        throw error;
    }
};
