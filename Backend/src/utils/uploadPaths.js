import fs from 'fs';
import path from 'path';

const DEFAULT_UPLOAD_ROOT = path.join(process.cwd(), 'src', 'uploads');
const LEGACY_UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

const toAbsolutePath = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return null;
    return path.isAbsolute(normalized)
        ? path.normalize(normalized)
        : path.normalize(path.resolve(process.cwd(), normalized));
};

const pathExists = (value) => {
    if (!value) return false;
    try {
        return fs.existsSync(value);
    } catch {
        return false;
    }
};

export const resolveUploadRoot = () => {
    const fromUploadDir = toAbsolutePath(process.env.UPLOAD_DIR);
    const fromUploadPath = toAbsolutePath(process.env.UPLOAD_PATH);
    const configured = fromUploadDir || fromUploadPath;

    if (configured && pathExists(configured)) return configured;
    if (pathExists(DEFAULT_UPLOAD_ROOT)) return DEFAULT_UPLOAD_ROOT;
    if (pathExists(LEGACY_UPLOAD_ROOT)) return LEGACY_UPLOAD_ROOT;

    return configured || DEFAULT_UPLOAD_ROOT;
};

export const getUploadPublicUrl = (folder, fileName) => {
    const safeFolder = String(folder || '')
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '');
    const safeFileName = String(fileName || '').trim();

    if (!safeFolder || !safeFileName) {
        throw new Error('Folder and file name are required to build upload URL');
    }

    return `/uploads/${safeFolder}/${safeFileName}`;
};
