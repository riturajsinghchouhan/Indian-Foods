import http from 'http';
import app from './src/app.js';
import { config } from './src/config/env.js';
import { validateConfig } from './src/config/validateEnv.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { connectRedis, closeRedis } from './src/config/redis.js';
import { initializeQueues, closeBullMQConnection } from './src/queues/index.js';

import { logger } from './src/utils/logger.js';
import { initializeFirebaseRealtime } from './src/config/firebase.js';
import { loadEnvFromDb } from './src/config/envLoader.js';

const SHUTDOWN_TIMEOUT_MS = 10000;
let server = null;

const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, starting graceful shutdown`);
    if (!server) {
        process.exit(0);
        return;
    }
    server.close(async () => {
        try {
            await disconnectDB();
            await closeRedis();
            await closeBullMQConnection();
            logger.info('Graceful shutdown complete');
            process.exit(0);
        } catch (err) {
            logger.error(`Shutdown error: ${err.message}`);
            process.exit(1);
        }
    });
    setTimeout(() => {
        logger.error('Shutdown timeout, forcing exit');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
};

const startServer = async () => {
    try {
        validateConfig();
        initializeFirebaseRealtime();

        // 1. Connect to Database (MongoDB)
        await connectDB();

        // 1.5 Load Environment Variables from Database overrides
        await loadEnvFromDb();

        // 2. Create HTTP server from Express app
        const httpServer = http.createServer(app);

        // Socket initialized in socket-server.js


        if (config.redisEnabled) {
            await connectRedis();
        }
        
        // Watchdog recovered stuck orders is moved to scheduler-server.js

        // 5. Conditionally initialize BullMQ queues.
        // BullMQ requires Redis; skip queue bootstrap when Redis is disabled.
        if (config.bullmqEnabled && config.redisEnabled) {
            try {
                initializeQueues();
            } catch (err) {
                logger.error(`BullMQ initialization error (server continues): ${err.message}`);
            }
        } else if (config.bullmqEnabled && !config.redisEnabled) {
            logger.warn('BullMQ is enabled but Redis is disabled. Queue initialization skipped.');
        }

        // 6. Start the HTTP server
        server = httpServer.listen(config.port, config.host, () => {
            logger.info(`Server running in ${config.nodeEnv} mode on ${config.host}:${config.port}`);
            console.log(`🌐 [URL] http://localhost:${config.port}`);
        });

        // Schedulers (expire offers, fssai sync) are moved to scheduler-server.js

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

        // Handle server errors (like EADDRINUSE)
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`Port ${config.port} is already in use. Please kill the process or use a different port.`);
            } else {
                logger.error(`Server Error: ${err.message}`);
            }
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            logger.error(`Unhandled Rejection: ${err?.message || err}`);
            if (config.nodeEnv === 'production') {
                if (server) server.close(() => process.exit(1));
                else process.exit(1);
            }
        });

        process.on('uncaughtException', (err) => {
            logger.error(`Uncaught Exception: ${err?.message || err}`);
            if (config.nodeEnv === 'production') {
                process.exit(1);
            }
        });

    } catch (error) {
        logger.error(`Error starting server: ${error.message}`);
        process.exit(1);
    }
};

startServer();

