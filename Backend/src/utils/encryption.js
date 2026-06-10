import crypto from 'crypto';

// Get a stable encryption key from process.env or fallback to a hardcoded string
// Note: We use process.env.ENCRYPTION_KEY if available, else a secure default
const getSecretKey = () => {
    const secret = process.env.ENCRYPTION_KEY || 'indianbites_secure_fallback_encryption_key_32_chars!';
    // Create a 32 byte key for aes-256-cbc
    return crypto.createHash('sha256').update(String(secret)).digest('base64').substring(0, 32);
};

export const encrypt = (text) => {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(getSecretKey()), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
        console.error('Encryption error:', error.message);
        return text;
    }
};

export const decrypt = (text) => {
    if (!text) return text;
    try {
        const textParts = text.split(':');
        if (textParts.length !== 2) return text; // Not encrypted with our specific format
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(getSecretKey()), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        // Return original text if decryption fails (e.g. if key changed or text was not encrypted properly)
        console.error('Decryption error:', error.message);
        return text;
    }
};
