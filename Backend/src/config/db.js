import dns from 'node:dns';
import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongodbUri, {
            maxPoolSize: 100,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 20000,
            connectTimeoutMS: 20000,
            socketTimeoutMS: 45000,
        });
        logger.info(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        logger.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

/**
 * Close MongoDB connection (e.g. graceful shutdown).
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
};
