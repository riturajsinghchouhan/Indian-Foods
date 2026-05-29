import { logger } from '../../utils/logger.js';
import { FoodItem } from '../../modules/food/admin/models/food.model.js';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../../config/env.js';
import { HfInference } from '@huggingface/inference';

// Configure cloudinary
cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret
});

let hfClient = null;

if (process.env.HUGGINGFACE_API_KEY) {
    try {
        hfClient = new HfInference(process.env.HUGGINGFACE_API_KEY);
    } catch (e) {
        logger.error('Failed to initialize Hugging Face client: ' + e.message);
    }
}

async function uploadBufferToCloudinary(buffer, itemName) {
    return new Promise((resolve, reject) => {
        const publicId = `${itemName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'restaurants/menu_items',
                public_id: publicId,
                quality: 'auto',
                fetch_format: 'auto',
                resource_type: 'image'
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
}

/**
 * Build a highly specific, dish-aware prompt for FLUX.1-schnell
 */
export function buildImagePrompt(itemName, itemDescription, categoryName, foodType) {
    const dishName = itemName.trim();
    const category = categoryName ? categoryName.trim() : '';
    const type = foodType === 'Veg' ? 'vegetarian' : 'non-vegetarian';
    const desc = itemDescription ? itemDescription.trim() : '';

    let prompt = `A professional, highly realistic, appetizing food photography image of the exact Indian dish: "${dishName}".`;

    if (desc) prompt += ` The dish is described as: "${desc}".`;
    if (category) prompt += ` It belongs to the "${category}" category on an Indian restaurant menu.`;

    prompt += ` This is a ${type} Indian dish.`;
    prompt += ` The photo must show ONLY this specific dish — "${dishName}" — served in a traditional or modern Indian restaurant style.`;
    prompt += ` Shot from a 45-degree top-down angle, natural lighting, shallow depth of field, macro lens, 85mm, extremely detailed, garnished beautifully.`;
    prompt += ` Background: clean white or dark slate plate. No text, no watermarks, no people, no hands, no other dishes visible.`;
    prompt += ` Ultra-realistic, 8k resolution, cinematic food photography quality.`;

    return prompt;
}

/**
 * Core image generation logic — works both from BullMQ worker AND direct call (no-Redis fallback).
 */
export async function generateMenuImageForItem({ restaurantId, itemId, itemName, itemDescription, categoryName, foodType, sectionIndex, itemIndex }) {
    if (!hfClient) {
        throw new Error('Hugging Face client not initialized (Missing HUGGINGFACE_API_KEY)');
    }

    const prompt = buildImagePrompt(itemName, itemDescription, categoryName, foodType);

    logger.info(`[FLUX] Generating image for "${itemName}" | Category: ${categoryName} | Type: ${foodType}`);

    const blob = await hfClient.textToImage({
        model: 'black-forest-labs/FLUX.1-schnell',
        inputs: prompt,
        parameters: {
            guidance_scale: 3.5,
            num_inference_steps: 4,
            width: 1024,
            height: 1024
        }
    });

    if (!blob) throw new Error('No image blob returned from Hugging Face API');

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageUrl = await uploadBufferToCloudinary(buffer, itemName);

    // Update DB
    const itemDoc = await FoodItem.findOne({ _id: itemId, restaurantId });
    if (!itemDoc) throw new Error(`FoodItem not found for id ${itemId}`);

    itemDoc.image = imageUrl;
    await itemDoc.save();

    logger.info(`[FLUX] Image saved for "${itemName}" → ${imageUrl}`);
    return { success: true, imageUrl, restaurantId, itemId, sectionIndex, itemIndex, itemName };
}

/**
 * BullMQ job processor wrapper
 */
export const processMenuImageJob = async (job) => {
    try {
        return await generateMenuImageForItem(job.data);
    } catch (error) {
        logger.error(`Image generation failed for job ${job.id} ("${job.data.itemName}"): ${error.message}`);
        throw error;
    }
};
