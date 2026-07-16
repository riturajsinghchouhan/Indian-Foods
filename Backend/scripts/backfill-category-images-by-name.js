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

const categorySchema = new mongoose.Schema({}, { strict: false, collection: 'food_categories' });
const FoodCategory = mongoose.model('FoodCategoryBackfillByName', categorySchema);

const trim = (value) => String(value || '').trim();

const normalizeName = (value) =>
    trim(value)
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const isUsableImageValue = (value) => Boolean(trim(normalizeMediaUrl(value || '')));

const getCategoryPriority = (candidate, target) => {
    const sameRestaurant = String(candidate.restaurantId || '') === String(target.restaurantId || '') ? 8 : 0;
    const approved = String(candidate.approvalStatus || '').toLowerCase() === 'approved' ? 4 : 0;
    const globalCategory = !candidate.restaurantId ? 2 : 0;
    const active = candidate.isActive === false ? 0 : 1;
    const timeScore = new Date(candidate.updatedAt || candidate.createdAt || 0).getTime() || 0;
    return { score: sameRestaurant + approved + globalCategory + active, timeScore };
};

const pickBetterDonor = (current, candidate, target) => {
    if (!candidate) return current;
    if (!current) return candidate;

    const currentPriority = getCategoryPriority(current, target);
    const candidatePriority = getCategoryPriority(candidate, target);

    if (candidatePriority.score !== currentPriority.score) {
        return candidatePriority.score > currentPriority.score ? candidate : current;
    }

    return candidatePriority.timeScore > currentPriority.timeScore ? candidate : current;
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
                ? 'Running category image by-name backfill in APPLY mode.'
                : 'Running category image by-name backfill in DRY-RUN mode. Use --apply to persist changes.'
        );

        const categories = await FoodCategory.find({}, '_id name image restaurantId approvalStatus isActive createdAt updatedAt').lean();
        const donorsByName = new Map();
        const missingCategories = [];

        for (const category of categories) {
            const normalizedName = normalizeName(category.name);
            if (!normalizedName) continue;

            if (isUsableImageValue(category.image)) {
                const current = donorsByName.get(normalizedName) || null;
                donorsByName.set(normalizedName, pickBetterDonor(current, category, category));
            } else {
                missingCategories.push(category);
            }
        }

        let exactMatches = 0;
        let updated = 0;
        let unresolved = 0;
        const sampleMatches = [];

        for (const category of missingCategories) {
            const normalizedName = normalizeName(category.name);
            const donor = donorsByName.get(normalizedName) || null;

            if (!donor || String(donor._id) === String(category._id) || !isUsableImageValue(donor.image)) {
                unresolved += 1;
                continue;
            }

            exactMatches += 1;
            const nextImage = trim(donor.image);

            if (sampleMatches.length < 40) {
                sampleMatches.push({
                    targetId: String(category._id),
                    targetName: category.name || '',
                    donorId: String(donor._id),
                    donorName: donor.name || '',
                    image: nextImage
                });
            }

            if (VERBOSE) {
                console.log(`[exact] ${category.name} (${category._id}) <= ${donor.name} (${donor._id})`);
            }

            if (APPLY) {
                const result = await FoodCategory.updateOne(
                    { _id: category._id, $or: [{ image: '' }, { image: null }, { image: { $exists: false } }] },
                    { $set: { image: nextImage } }
                );
                if (result.modifiedCount > 0) updated += 1;
            }
        }

        console.log('\nSummary:');
        console.log(JSON.stringify({
            scanned: categories.length,
            missingImages: missingCategories.length,
            exactMatches,
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
    console.error('Category image by-name backfill failed:', error);
    process.exitCode = 1;
});
