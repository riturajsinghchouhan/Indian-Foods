import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const BACKUP_URI = 'mongodb+srv://indianbite1:indianbite1@indianbitebackup.fgbam3x.mongodb.net/indianbitebackup';
const LIVE_URI = process.env.MONGODB_URI;
const UPLOAD_DIR = path.join(__dirname, '../src/uploads');

const backupConnection = mongoose.createConnection(BACKUP_URI);
const liveConnection = mongoose.createConnection(LIVE_URI);

const getModel = (conn, name, collectionName) => {
    return conn.model(name, new mongoose.Schema({
        image: { type: String, default: '' },
        profileImage: { type: String, default: '' },
        coverImage: { type: String, default: '' },
        logo: { type: String, default: '' },
        favicon: { type: String, default: '' },
    }, { strict: false }), collectionName);
};

const BackupFoodItem = getModel(backupConnection, 'BackupFoodItem', 'food_items');
const LiveFoodItem = getModel(liveConnection, 'LiveFoodItem', 'food_items');

const BackupFoodCategory = getModel(backupConnection, 'BackupFoodCategory', 'food_categories');
const LiveFoodCategory = getModel(liveConnection, 'LiveFoodCategory', 'food_categories');

const BackupFoodRestaurant = getModel(backupConnection, 'BackupFoodRestaurant', 'food_restaurants');
const LiveFoodRestaurant = getModel(liveConnection, 'LiveFoodRestaurant', 'food_restaurants');

const BackupBusinessSettings = getModel(backupConnection, 'BackupBusinessSettings', 'food_business_settings');
const LiveBusinessSettings = getModel(liveConnection, 'LiveBusinessSettings', 'food_business_settings');

const BackupFoodBanner = getModel(backupConnection, 'BackupFoodBanner', 'food_banners');
const LiveFoodBanner = getModel(liveConnection, 'LiveFoodBanner', 'food_banners');

function extractRelativePath(cloudinaryUrl) {
    if (!cloudinaryUrl) return null;
    const match = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (match && match[1]) return match[1];
    return null;
}

async function processCollection(BackupModel, LiveModel, collectionName, fieldsToCheck) {
    console.log(`\nProcessing collection: ${collectionName}...`);
    const backupDocs = await BackupModel.find({}).lean();
    console.log(`Found ${backupDocs.length} documents in backup.`);

    // Fetch all live docs for this collection in one go to avoid N queries
    const liveDocs = await LiveModel.find({ _id: { $in: backupDocs.map(d => d._id) } }).lean();
    const liveDocMap = new Map();
    liveDocs.forEach(d => liveDocMap.set(d._id.toString(), d));

    const bulkOps = [];
    let restoredCount = 0;
    let missingFileCount = 0;
    let alreadyMigratedCount = 0;

    for (const backupDoc of backupDocs) {
        const liveDoc = liveDocMap.get(backupDoc._id.toString());
        if (!liveDoc) continue;

        const updateData = {};
        let needsUpdate = false;

        for (const field of fieldsToCheck) {
            const backupUrl = backupDoc[field];
            const liveUrl = liveDoc[field];

            if (backupUrl && backupUrl.includes('cloudinary')) {
                if (liveUrl && liveUrl.startsWith('/uploads/') && !liveUrl.includes('cloudinary')) {
                    alreadyMigratedCount++;
                    continue;
                }

                const relPath = extractRelativePath(backupUrl);
                if (relPath) {
                    const absPath = path.join(UPLOAD_DIR, relPath);
                    if (fs.existsSync(absPath)) {
                        updateData[field] = `/uploads/${relPath}`;
                        needsUpdate = true;
                        restoredCount++;
                    } else {
                        const decodedPath = path.join(UPLOAD_DIR, decodeURIComponent(relPath));
                        if (fs.existsSync(decodedPath)) {
                            updateData[field] = `/uploads/${decodeURIComponent(relPath)}`;
                            needsUpdate = true;
                            restoredCount++;
                        } else {
                            missingFileCount++;
                        }
                    }
                }
            }
        }

        if (needsUpdate) {
            bulkOps.push({
                updateOne: {
                    filter: { _id: backupDoc._id },
                    update: { $set: updateData }
                }
            });
        }
    }

    if (bulkOps.length > 0) {
        console.log(`Executing ${bulkOps.length} bulk updates...`);
        await LiveModel.bulkWrite(bulkOps);
    }

    console.log(`[${collectionName}] Restored: ${restoredCount} | Missing Files: ${missingFileCount} | Already Migrated: ${alreadyMigratedCount}`);
}

async function runRestore() {
    try {
        console.log('Connecting to databases...');
        await backupConnection.asPromise();
        console.log('Connected to Backup DB.');
        await liveConnection.asPromise();
        console.log('Connected to Live DB.');

        await processCollection(BackupFoodItem, LiveFoodItem, 'food_items', ['image']);
        await processCollection(BackupFoodCategory, LiveFoodCategory, 'food_categories', ['image']);
        await processCollection(BackupFoodRestaurant, LiveFoodRestaurant, 'food_restaurants', ['image', 'profileImage', 'coverImage']);
        await processCollection(BackupBusinessSettings, LiveBusinessSettings, 'food_business_settings', ['logo', 'favicon']);
        await processCollection(BackupFoodBanner, LiveFoodBanner, 'food_banners', ['image']);

        console.log('\nAll collections processed successfully!');
    } catch (error) {
        console.error('Error during restore:', error);
    } finally {
        await backupConnection.close();
        await liveConnection.close();
        process.exit(0);
    }
}

runRestore();
