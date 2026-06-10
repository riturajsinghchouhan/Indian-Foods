import EnvSetting from '../models/EnvSetting.js';
import { decrypt } from '../utils/encryption.js';
import { updateConfig } from './env.js';

export const loadEnvFromDb = async () => {
    try {
        const settings = await EnvSetting.find({});
        let count = 0;
        
        settings.forEach(setting => {
            if (setting.value !== undefined && setting.value !== null) {
                const decryptedValue = setting.isEncrypted ? decrypt(setting.value) : setting.value;
                process.env[setting.key] = decryptedValue;
                count++;
            }
        });
        
        if (count > 0) {
            updateConfig();
            console.log(`Loaded ${count} environment variables from Database`);
        }
    } catch (error) {
        console.error('Error loading env settings from DB:', error.message);
    }
};
