import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const UPLOAD_DIR = path.join(__dirname, '../src/uploads/foods');

// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const BACKUP_URI = 'mongodb+srv://indianbite1:indianbite1@indianbitebackup.fgbam3x.mongodb.net/indianbitebackup';
const LIVE_URI = process.env.MONGODB_URI;

const backupConnection = mongoose.createConnection(BACKUP_URI);
const liveConnection = mongoose.createConnection(LIVE_URI);

const getModel = (conn, name, collectionName) => {
    return conn.model(name, new mongoose.Schema({
        image: { type: String, default: '' },
    }, { strict: false }), collectionName);
};

const BackupFoodItem = getModel(backupConnection, 'BackupFoodItem', 'food_items');
const LiveFoodItem = getModel(liveConnection, 'LiveFoodItem', 'food_items');

const downloadImage = (url, filepath) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
            }
            const file = fs.createWriteStream(filepath);
            res.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
            file.on('error', (err) => {
                fs.unlink(filepath, () => reject(err));
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
};

async function recoverImages() {
    try {
        console.log('Connecting to databases...');
        await backupConnection.asPromise();
        await liveConnection.asPromise();
        console.log('Connected to Backup and Live DBs.');

        const liveDocs = await LiveFoodItem.find({ $or: [{ image: "" }, { image: null }] }).lean();
        console.log(`Found ${liveDocs.length} food items with missing images in Live DB.`);

        const missingIds = liveDocs.map(d => d._id);
        const backupDocs = await BackupFoodItem.find({ _id: { $in: missingIds } }).lean();
        
        let successCount = 0;
        let failCount = 0;
        let skipCount = 0;

        for (const backupDoc of backupDocs) {
            const originalUrl = backupDoc.image;
            if (originalUrl && originalUrl.includes('cloudinary.com')) {
                try {
                    const urlParts = originalUrl.split('/');
                    const filenameWithExt = urlParts[urlParts.length - 1];
                    const filename = filenameWithExt.split('?')[0]; // Clean query params if any
                    
                    const localPath = path.join(UPLOAD_DIR, filename);
                    const relativeDbPath = `/uploads/foods/${filename}`;

                    if (!fs.existsSync(localPath)) {
                        console.log(`Downloading: ${filename}`);
                        await downloadImage(originalUrl, localPath);
                    } else {
                        // File might exist if a previous run crashed
                    }

                    await LiveFoodItem.updateOne(
                        { _id: backupDoc._id },
                        { $set: { image: relativeDbPath } }
                    );
                    successCount++;
                } catch (err) {
                    console.error(`Failed to process ${backupDoc._id}:`, err.message);
                    failCount++;
                }
            } else {
                skipCount++;
            }
        }

        console.log(`\nRecovery Complete!`);
        console.log(`Successfully downloaded & updated: ${successCount}`);
        console.log(`Skipped (no original cloudinary url): ${skipCount}`);
        console.log(`Failed: ${failCount}`);

    } catch (error) {
        console.error('Error during recovery:', error);
    } finally {
        await backupConnection.close();
        await liveConnection.close();
        process.exit(0);
    }
}

recoverImages();
