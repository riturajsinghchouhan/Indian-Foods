import 'dotenv/config';
import { Worker } from 'bullmq';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { getBullMQConnection } from '../connection.js';
import { MENU_IMAGE_QUEUE } from '../queue.constants.js';
import { processMenuImageJob } from '../processors/menuImage.processor.js';
import { getSocketIo } from '../../utils/socket.js';

const defaultJobOptions = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }
};

const startMenuImageWorker = () => {
    if (!config.bullmqEnabled) {
        logger.info('BullMQ is disabled. Menu Image worker not started.');
        return null;
    }
    const connection = getBullMQConnection();
    if (!connection) {
        logger.error('Menu Image worker: Redis connection unavailable. Exiting.');
        process.exit(1);
    }
    const worker = new Worker(MENU_IMAGE_QUEUE, processMenuImageJob, {
        connection,
        concurrency: 3, // 3 parallel jobs for faster generation
        limiter: {
            max: 30,
            duration: 60000 // Max 30 images per minute (Imagen API limit-safe)
        },
        defaultJobOptions
    });
    
    worker.on('completed', (job, returnvalue) => {
        logger.info(`Menu Image job ${job.id} completed for ${job.data.itemName}`);
        // Notify frontend via socket
        const io = getSocketIo();
        if (io && returnvalue?.success) {
            io.to('admin').emit('menuImageGenerated', {
                restaurantId: returnvalue.restaurantId,
                itemId: returnvalue.itemId,
                sectionIndex: returnvalue.sectionIndex,
                itemIndex: returnvalue.itemIndex,
                imageUrl: returnvalue.imageUrl,
                itemName: job.data.itemName
            });
        }
    });
    
    worker.on('failed', (job, err) => {
        logger.error(`Menu Image job ${job?.id} failed for ${job?.data?.itemName}: ${err.message}`);
        // Notify frontend if all retries exhausted
        if (job?.attemptsMade >= (job?.opts?.attempts ?? 3)) {
            const io = getSocketIo();
            if (io) {
                io.to('admin').emit('menuImageFailed', {
                    restaurantId: job.data.restaurantId,
                    itemId: job.data.itemId,
                    sectionIndex: job.data.sectionIndex,
                    itemIndex: job.data.itemIndex,
                    itemName: job.data.itemName,
                    error: err.message
                });
            }
        }
    });
    
    worker.on('error', (err) => logger.error(`Menu Image worker error: ${err.message}`));
    
    logger.info('Menu Image worker started');
    return worker;
};

const worker = startMenuImageWorker();
if (worker) {
    const shutdown = async () => {
        await worker.close();
        process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
