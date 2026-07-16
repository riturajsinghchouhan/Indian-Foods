import fs from 'fs';
import https from 'https';
import path from 'path';
import dns from 'node:dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import { resolveUploadRoot } from '../src/utils/uploadPaths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

dns.setServers(['8.8.8.8', '1.1.1.1']);

const LIVE_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const BACKUP_URI =
    process.env.BACKUP_MONGODB_URI ||
    process.env.IMAGE_BACKUP_MONGODB_URI ||
    process.env.LEGACY_MONGODB_URI ||
    'mongodb+srv://indianbite1:indianbite1@indianbitebackup.fgbam3x.mongodb.net/indianbitebackup';

if (!LIVE_URI) {
    throw new Error('Missing MONGODB_URI or MONGO_URI in Backend/.env');
}

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const DOWNLOAD_MISSING = args.has('--download-missing');
const VERBOSE = args.has('--verbose');

const UPLOAD_ROOT = resolveUploadRoot();

const ABSOLUTE_URL_RE = /^(?:https?:)?\/\//i;
const CLOUDINARY_RE = /cloudinary\.com/i;
const UPLOADS_RE = /^\/?(?:api\/v1\/)?uploads\//i;

const collectionConfigs = [
    {
        collection: 'food_items',
        fields: [{ target: 'image' }]
    },
    {
        collection: 'food_categories',
        fields: [{ target: 'image' }]
    },
    {
        collection: 'food_restaurants',
        fields: [
            { target: 'profileImage', aliases: ['image'] },
            { target: 'coverImages', kind: 'array', aliases: ['coverImage', 'images'] },
            { target: 'menuImages', kind: 'array' },
            { target: 'panImage' },
            { target: 'gstImage' },
            { target: 'fssaiImage' },
            { target: 'upiQrImage' }
        ]
    },
    {
        collection: 'food_delivery_partners',
        fields: [
            { target: 'profilePhoto', aliases: ['profileImage'] },
            { target: 'aadharPhoto', aliases: ['aadharFrontPhoto'] },
            { target: 'aadharFrontPhoto', aliases: ['aadharPhoto'] },
            { target: 'aadharBackPhoto' },
            { target: 'panPhoto' },
            { target: 'drivingLicenseFrontPhoto', aliases: ['drivingLicensePhoto'] },
            { target: 'drivingLicenseBackPhoto', aliases: ['drivingLicensePhoto'] },
            { target: 'rcPhoto' },
            { target: 'upiQrCode' },
            { target: 'shiftStartPic' }
        ]
    },
    {
        collection: 'food_users',
        fields: [{ target: 'profileImage' }]
    },
    {
        collection: 'food_banners',
        fields: [{ target: 'image' }]
    },
    {
        collection: 'food_business_settings',
        fields: [
            { target: 'logo.url', aliases: ['logo'] },
            { target: 'favicon.url', aliases: ['favicon'] }
        ]
    },
    {
        collection: 'food_hero_banners',
        fields: [{ target: 'imageUrl' }]
    },
    {
        collection: 'food_under250_banners',
        fields: [{ target: 'imageUrl' }]
    },
    {
        collection: 'food_dining_banners',
        fields: [{ target: 'imageUrl' }]
    },
    {
        collection: 'food_explore_icons',
        fields: [{ target: 'iconUrl' }]
    },
    {
        collection: 'food_dining_categories',
        fields: [{ target: 'imageUrl' }]
    },
    {
        collection: 'food_page_contents',
        fields: [{ target: 'about.logo' }]
    },
    {
        collection: 'food_addons',
        fields: [
            { target: 'draft.image' },
            { target: 'draft.images', kind: 'array' },
            { target: 'published.image' },
            { target: 'published.images', kind: 'array' }
        ]
    },
    {
        collection: 'appintroads',
        fields: [{ target: 'mediaUrl' }]
    }
];

const createLooseModel = (connection, collectionName) =>
    connection.model(
        `Loose_${collectionName}_${Math.random().toString(36).slice(2, 8)}`,
        new mongoose.Schema({}, { strict: false, collection: collectionName })
    );

const trim = (value) => String(value || '').trim();

const normalizeUploadDbPath = (value) => {
    const normalized = trim(value).replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized) return '';
    if (normalized.toLowerCase().startsWith('api/v1/uploads/')) return `/${normalized}`;
    if (normalized.toLowerCase().startsWith('uploads/')) return `/${normalized}`;
    return '';
};

const uploadPathToAbsoluteFile = (value) => {
    const dbPath = normalizeUploadDbPath(value);
    if (!dbPath) return null;
    const relative = dbPath.replace(/^\/?(?:api\/v1\/)?uploads\//i, '');
    return path.join(UPLOAD_ROOT, relative);
};

const cloudinaryUrlToLocalUploadPath = (value) => {
    const raw = trim(value);
    if (!raw || !CLOUDINARY_RE.test(raw)) return '';

    const match = raw.match(/\/upload\/(?:v\d+\/)?(.+)$/i);
    if (!match?.[1]) return '';

    const relative = decodeURIComponent(match[1]).replace(/\\/g, '/').replace(/^\/+/, '');
    if (!relative) return '';

    const absolute = path.join(UPLOAD_ROOT, relative);
    if (!fs.existsSync(absolute)) return '';

    return `/uploads/${relative}`;
};

const isEmptyValue = (value) => {
    if (value == null) return true;
    if (Array.isArray(value)) return value.length === 0 || value.every((item) => isEmptyValue(item));
    if (typeof value === 'object') {
        const nested = value.url ?? value.secure_url ?? value.image ?? '';
        return isEmptyValue(nested);
    }
    return trim(value) === '';
};

const isUsableImageValue = (value) => {
    if (Array.isArray(value)) return value.some((item) => isUsableImageValue(item));
    if (typeof value === 'object' && value) {
        return isUsableImageValue(value.url ?? value.secure_url ?? value.image ?? '');
    }
    const raw = trim(value);
    if (!raw) return false;
    if (UPLOADS_RE.test(raw)) return true;
    if (ABSOLUTE_URL_RE.test(raw)) return true;
    return false;
};

const getNested = (obj, dottedPath) =>
    dottedPath.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

const setNested = (obj, dottedPath, value) => {
    const parts = dottedPath.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i += 1) {
        const key = parts[i];
        if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) {
            current[key] = {};
        }
        current = current[key];
    }
    current[parts[parts.length - 1]] = value;
};

const normalizeScalarCandidate = (value) => {
    if (typeof value === 'object' && value) {
        return normalizeScalarCandidate(value.url ?? value.secure_url ?? value.image ?? '');
    }

    const raw = trim(value);
    if (!raw) return '';

    if (UPLOADS_RE.test(raw)) {
        const dbPath = normalizeUploadDbPath(raw);
        const absolute = uploadPathToAbsoluteFile(dbPath);
        return absolute && fs.existsSync(absolute) ? dbPath : '';
    }

    if (CLOUDINARY_RE.test(raw)) {
        return cloudinaryUrlToLocalUploadPath(raw) || raw;
    }

    if (ABSOLUTE_URL_RE.test(raw)) {
        return raw;
    }

    return '';
};

const downloadToUploadRoot = (sourceUrl) =>
    new Promise((resolve, reject) => {
        const match = trim(sourceUrl).match(/\/upload\/(?:v\d+\/)?(.+)$/i);
        if (!match?.[1]) {
            reject(new Error('Could not derive upload path from Cloudinary URL'));
            return;
        }

        const relative = decodeURIComponent(match[1]).replace(/\\/g, '/').replace(/^\/+/, '');
        const absolute = path.join(UPLOAD_ROOT, relative);
        const dir = path.dirname(absolute);
        fs.mkdirSync(dir, { recursive: true });

        const request = https.get(sourceUrl, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }

            const fileStream = fs.createWriteStream(absolute);
            response.pipe(fileStream);
            fileStream.on('finish', () => fileStream.close(() => resolve(`/uploads/${relative}`)));
            fileStream.on('error', (error) => reject(error));
        });

        request.on('error', (error) => reject(error));
    });

const materializeCloudinaryIfNeeded = async (sourceValue) => {
    const raw = trim(sourceValue);
    if (!raw || !CLOUDINARY_RE.test(raw)) return '';

    const existingLocalPath = cloudinaryUrlToLocalUploadPath(raw);
    if (existingLocalPath) return existingLocalPath;
    if (!DOWNLOAD_MISSING) return raw;

    try {
        return await downloadToUploadRoot(raw);
    } catch (error) {
        if (VERBOSE) {
            console.warn(`Download failed for ${raw}: ${error.message}`);
        }
        return raw;
    }
};

const selectSourceValue = (backupDoc, fieldConfig) => {
    const candidates = [fieldConfig.target, ...(fieldConfig.aliases || [])];
    for (const dottedPath of candidates) {
        const value = getNested(backupDoc, dottedPath);
        if (!isEmptyValue(value)) return value;
    }
    return undefined;
};

const summarizeValue = (value) => {
    if (Array.isArray(value)) return `${value.length} image(s)`;
    return trim(value).slice(0, 120);
};

async function repairCollection(liveConnection, backupConnection, collectionConfig) {
    const LiveModel = createLooseModel(liveConnection, collectionConfig.collection);
    const BackupModel = createLooseModel(backupConnection, collectionConfig.collection);

    const liveDocs = await LiveModel.find({}).lean();
    const liveIds = liveDocs.map((doc) => doc._id);
    const backupDocs = await BackupModel.find({ _id: { $in: liveIds } }).lean();
    const backupById = new Map(backupDocs.map((doc) => [String(doc._id), doc]));

    const summary = {
        collection: collectionConfig.collection,
        scanned: liveDocs.length,
        updatedDocs: 0,
        updatedFields: 0,
        skippedValid: 0,
        missingBackup: 0,
        unresolved: 0
    };

    for (const liveDoc of liveDocs) {
        const { _id } = liveDoc;
        const backupDoc = backupById.get(String(_id));

        if (!backupDoc) {
            summary.missingBackup += collectionConfig.fields.length;
            continue;
        }

        const updatePayload = {};
        let docChanged = false;

        for (const fieldConfig of collectionConfig.fields) {
            const currentValue = getNested(liveDoc, fieldConfig.target);

            if (isUsableImageValue(currentValue)) {
                summary.skippedValid += 1;
                continue;
            }

            const sourceValue = selectSourceValue(backupDoc, fieldConfig);
            if (isEmptyValue(sourceValue)) {
                summary.unresolved += 1;
                continue;
            }

            let nextValue;
            if (fieldConfig.kind === 'array') {
                const normalizedItems = [];
                for (const item of Array.isArray(sourceValue) ? sourceValue : [sourceValue]) {
                    const normalized = normalizeScalarCandidate(item);
                    if (normalized) {
                        normalizedItems.push(normalized);
                        continue;
                    }

                    const materialized = await materializeCloudinaryIfNeeded(item);
                    if (materialized) normalizedItems.push(materialized);
                }
                nextValue = Array.from(new Set(normalizedItems.filter(Boolean)));
            } else {
                nextValue = normalizeScalarCandidate(sourceValue);
                if (!nextValue) {
                    nextValue = await materializeCloudinaryIfNeeded(sourceValue);
                }
            }

            if (!isUsableImageValue(nextValue)) {
                summary.unresolved += 1;
                continue;
            }

            setNested(updatePayload, fieldConfig.target, nextValue);
            summary.updatedFields += 1;
            docChanged = true;

            if (VERBOSE) {
                console.log(
                    `[${collectionConfig.collection}] ${String(_id)} ${fieldConfig.target} <= ${summarizeValue(nextValue)}`
                );
            }
        }

        if (docChanged) {
            summary.updatedDocs += 1;
            if (APPLY) {
                await LiveModel.updateOne({ _id }, { $set: updatePayload });
            }
        }
    }

    return summary;
}

async function run() {
    const liveConnection = await mongoose.createConnection(LIVE_URI).asPromise();
    const backupConnection = await mongoose.createConnection(BACKUP_URI).asPromise();

    try {
        console.log(
            APPLY
                ? 'Running image backfill in APPLY mode.'
                : 'Running image backfill in DRY-RUN mode. Use --apply to persist changes.'
        );
        if (DOWNLOAD_MISSING) {
            console.log('Missing local files will be downloaded from Cloudinary when possible.');
        }

        const results = [];
        for (const collectionConfig of collectionConfigs) {
            const summary = await repairCollection(liveConnection, backupConnection, collectionConfig);
            results.push(summary);
            console.log(
                [
                    `[${summary.collection}]`,
                    `scanned=${summary.scanned}`,
                    `updatedDocs=${summary.updatedDocs}`,
                    `updatedFields=${summary.updatedFields}`,
                    `skippedValid=${summary.skippedValid}`,
                    `missingBackup=${summary.missingBackup}`,
                    `unresolved=${summary.unresolved}`
                ].join(' ')
            );
        }

        const totals = results.reduce(
            (acc, item) => {
                acc.scanned += item.scanned;
                acc.updatedDocs += item.updatedDocs;
                acc.updatedFields += item.updatedFields;
                acc.skippedValid += item.skippedValid;
                acc.missingBackup += item.missingBackup;
                acc.unresolved += item.unresolved;
                return acc;
            },
            { scanned: 0, updatedDocs: 0, updatedFields: 0, skippedValid: 0, missingBackup: 0, unresolved: 0 }
        );

        console.log('\nTotals:');
        console.log(JSON.stringify(totals, null, 2));
    } finally {
        await Promise.all([liveConnection.close(), backupConnection.close()]);
    }
}

run().catch((error) => {
    console.error('Image backfill failed:', error);
    process.exitCode = 1;
});
