import dns from 'node:dns';
import path from 'node:path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

import { normalizeMediaUrl } from '../src/utils/mediaUrl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

dns.setServers(['8.8.8.8', '1.1.1.1']);

const LIVE_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!LIVE_URI) {
    throw new Error('Missing MONGODB_URI or MONGO_URI in Backend/.env');
}

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const VERBOSE = args.has('--verbose');

const foodSchema = new mongoose.Schema({}, { strict: false, collection: 'food_items' });
const FoodItem = mongoose.model('FoodItemBackfillByName', foodSchema);

const trim = (value) => String(value || '').trim();

const normalizeName = (value) =>
    trim(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const tokenizeName = (value) =>
    normalizeName(value)
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length >= 3);

const isUsableImageValue = (value) => Boolean(trim(normalizeMediaUrl(value || '')));

const getFoodPriority = (candidate, target) => {
    const sameRestaurant = String(candidate.restaurantId || '') === String(target.restaurantId || '') ? 8 : 0;
    const approved = String(candidate.approvalStatus || '').toLowerCase() === 'approved' ? 4 : 0;
    const sameCategory = String(candidate.categoryId || '') === String(target.categoryId || '') ? 2 : 0;
    const timeScore = new Date(candidate.updatedAt || candidate.createdAt || 0).getTime() || 0;
    return { score: sameRestaurant + approved + sameCategory, timeScore };
};

const pickBetterDonor = (current, candidate, target) => {
    if (!candidate) return current;
    if (!current) return candidate;

    const currentPriority = getFoodPriority(current, target);
    const candidatePriority = getFoodPriority(candidate, target);
    if (candidatePriority.score !== currentPriority.score) {
        return candidatePriority.score > currentPriority.score ? candidate : current;
    }

    return candidatePriority.timeScore > currentPriority.timeScore ? candidate : current;
};

const countSharedTokens = (leftTokens, rightTokens) => {
    const rightSet = new Set(rightTokens);
    return leftTokens.filter((token) => rightSet.has(token)).length;
};

const isContainedVariant = (leftName, rightName) => {
    if (!leftName || !rightName) return false;
    return leftName.includes(rightName) || rightName.includes(leftName);
};

const isFuzzyMatch = (target, candidate) => {
    const targetName = normalizeName(target.name);
    const candidateName = normalizeName(candidate.name);
    if (!targetName || !candidateName || targetName === candidateName) return false;

    const targetTokens = tokenizeName(target.name);
    const candidateTokens = tokenizeName(candidate.name);
    if (targetTokens.length === 0 || candidateTokens.length === 0) return false;

    const sharedTokens = countSharedTokens(targetTokens, candidateTokens);
    const minTokenCount = Math.min(targetTokens.length, candidateTokens.length);
    const maxTokenCount = Math.max(targetTokens.length, candidateTokens.length);
    const sameRestaurant = String(target.restaurantId || '') === String(candidate.restaurantId || '');
    const sameCategory = String(target.categoryId || '') === String(candidate.categoryId || '');
    const containedVariant = isContainedVariant(targetName, candidateName);

    if (sameRestaurant && sharedTokens >= 2) return true;
    if (sameRestaurant && sameCategory && sharedTokens >= 1 && containedVariant) return true;
    if (sameRestaurant && maxTokenCount <= 3 && sharedTokens === minTokenCount && minTokenCount >= 1) return true;
    if (sameCategory && containedVariant && sharedTokens >= 2) return true;
    if (containedVariant && sharedTokens >= 2 && minTokenCount >= 2) return true;
    if (maxTokenCount <= 3 && sharedTokens === minTokenCount && minTokenCount >= 2) return true;

    return false;
};

async function run() {
    await mongoose.connect(LIVE_URI, {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000
    });

    try {
        console.log(
            APPLY
                ? 'Running food image by-name backfill in APPLY mode.'
                : 'Running food image by-name backfill in DRY-RUN mode. Use --apply to persist changes.'
        );

        const foods = await FoodItem.find({}, '_id name image restaurantId categoryId approvalStatus createdAt updatedAt').lean();
        const donorsByName = new Map();
        const donorFoods = [];
        const missingFoods = [];

        for (const food of foods) {
            const normalizedName = normalizeName(food.name);
            if (!normalizedName) continue;

            if (isUsableImageValue(food.image)) {
                const current = donorsByName.get(normalizedName) || null;
                donorsByName.set(normalizedName, pickBetterDonor(current, food, food));
                donorFoods.push(food);
            } else {
                missingFoods.push(food);
            }
        }

        let exactMatches = 0;
        let fuzzyMatches = 0;
        let updated = 0;
        let unresolved = 0;
        const sampleMatches = [];

        for (const food of missingFoods) {
            const normalizedName = normalizeName(food.name);
            const exactDonor = donorsByName.get(normalizedName) || null;
            let donor = exactDonor && String(exactDonor._id) !== String(food._id)
                ? exactDonor
                : null;
            let matchType = donor ? 'exact' : '';

            if (!donor) {
                for (const candidate of donorFoods) {
                    if (String(candidate._id) === String(food._id)) continue;
                    if (!isFuzzyMatch(food, candidate)) continue;
                    donor = pickBetterDonor(donor, candidate, food);
                    matchType = 'fuzzy';
                }
            }

            if (!donor || !isUsableImageValue(donor.image)) {
                unresolved += 1;
                continue;
            }

            if (matchType === 'exact') exactMatches += 1;
            if (matchType === 'fuzzy') fuzzyMatches += 1;
            const nextImage = trim(donor.image);

            if (sampleMatches.length < 40) {
                sampleMatches.push({
                    matchType,
                    targetId: String(food._id),
                    targetName: food.name || '',
                    donorId: String(donor._id),
                    donorName: donor.name || '',
                    image: nextImage
                });
            }

            if (VERBOSE) {
                console.log(`[${matchType}] ${food.name} (${food._id}) <= ${donor.name} (${donor._id})`);
            }

            if (APPLY) {
                const result = await FoodItem.updateOne(
                    { _id: food._id, $or: [{ image: '' }, { image: null }, { image: { $exists: false } }] },
                    { $set: { image: nextImage } }
                );
                if (result.modifiedCount > 0) updated += 1;
            }
        }

        console.log('\nSummary:');
        console.log(JSON.stringify({
            scanned: foods.length,
            missingImages: missingFoods.length,
            exactMatches,
            fuzzyMatches,
            matchedTotal: exactMatches + fuzzyMatches,
            updated,
            unresolved
        }, null, 2));

        if (sampleMatches.length > 0) {
            console.log('\nSample matches:');
            console.log(JSON.stringify(sampleMatches, null, 2));
        }
    } finally {
        await mongoose.disconnect();
    }
}

run().catch((error) => {
    console.error('Food image by-name backfill failed:', error);
    process.exitCode = 1;
});