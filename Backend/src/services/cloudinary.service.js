import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// Map UPLOAD_DIR to project root /src/uploads for local or /var/www/uploads for VPS
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'src', 'uploads');

const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const getProcessingOptions = (folder) => {
    // defaults
    let width = 800;
    let height = 800;
    let quality = 80;
    let prefix = 'img';

    if (folder.includes('food/items')) {
        width = 800; height = 800; quality = 85; prefix = 'food';
    } else if (folder.includes('food/restaurants/profile') || folder.includes('users/profiles')) {
        width = 400; height = 400; quality = 80; prefix = 'user';
    } else if (folder.includes('food/restaurants') || folder.includes('restaurants')) { 
        // cover, menu, pan, gst, fssai
        width = 1200; height = 800; quality = 80; prefix = 'restaurant';
    } else if (folder.includes('landing/banners') || folder.includes('banners')) {
        width = 1600; height = 600; quality = 85; prefix = 'banner';
    }

    return { width, height, quality, prefix };
};

export const uploadImageBuffer = async (buffer, folder = 'uploads') => {
    if (!buffer) {
        throw new Error('File buffer is required');
    }

    const { width, height, quality, prefix } = getProcessingOptions(folder);
    const fileName = `${prefix}_${uuidv4().replace(/-/g, '').substring(0, 8)}.webp`;
    
    const targetDir = path.join(UPLOAD_BASE_DIR, folder);
    ensureDirectoryExists(targetDir);

    const filePath = path.join(targetDir, fileName);

    await sharp(buffer)
        .resize({ width, height, fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toFile(filePath);

    // Return the relative URL starting with /uploads/
    return `/uploads/${folder}/${fileName}`;
};

export const uploadImageBufferDetailed = async (buffer, folder = 'uploads') => {
    const secure_url = await uploadImageBuffer(buffer, folder);
    return { secure_url };
};

export const uploadVideoBuffer = async (buffer, folder = 'uploads') => {
    // For now, just save it directly if it's a video (sharp doesn't support video)
    if (!buffer) throw new Error('File buffer is required');
    const targetDir = path.join(UPLOAD_BASE_DIR, folder);
    ensureDirectoryExists(targetDir);
    const fileName = `video_${uuidv4().replace(/-/g, '').substring(0, 8)}.mp4`;
    const filePath = path.join(targetDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${folder}/${fileName}`;
};

export const uploadFileBuffer = async (buffer, folder = 'uploads', options = {}) => {
    if (!buffer) throw new Error('File buffer is required');
    
    const targetDir = path.join(UPLOAD_BASE_DIR, folder);
    ensureDirectoryExists(targetDir);

    let fileName = options.fileName ? options.fileName.replace(/\s+/g, '_') : `file_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
    // ensure extension if format provided
    if (options.format && !fileName.endsWith(`.${options.format}`)) {
        fileName += `.${options.format}`;
    }

    const filePath = path.join(targetDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return `/uploads/${folder}/${fileName}`;
};

export const uploadFileBufferDetailed = async (buffer, folder = 'uploads', options = {}) => {
    const secure_url = await uploadFileBuffer(buffer, folder, options);
    return { secure_url };
};

export const buildRawDownloadUrlFromFileUrl = (fileUrl, options = {}) => {
    // Already a local URL, just return it
    return fileUrl;
};
