import path from 'path';

const DEFAULT_UPLOAD_ROOT = path.join(process.cwd(), 'src', 'uploads');

const toAbsolutePath = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return null;
    return path.isAbsolute(normalized)
        ? path.normalize(normalized)
        : path.normalize(path.resolve(process.cwd(), normalized));
};

export const resolveUploadRoot = () => {
    const fromUploadDir = toAbsolutePath(process.env.UPLOAD_DIR);
    if (fromUploadDir) return fromUploadDir;

    const fromUploadPath = toAbsolutePath(process.env.UPLOAD_PATH);
    if (fromUploadPath) return fromUploadPath;

    return DEFAULT_UPLOAD_ROOT;
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
