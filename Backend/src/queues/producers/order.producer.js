import { getOrderQueue } from '../index.js';
import { logger } from '../../utils/logger.js';

/**
 * Add an order processing job to the queue. No-op if BullMQ is disabled.
 * @param {object} data - Job data (e.g. { orderId, action })
 * @param {object} [options] - BullMQ job options override
 * @returns {Promise<import('bullmq').Job | null>}
 */
export const addOrderJob = async (data, options = {}) => {
    const queue = getOrderQueue();
    if (!queue) {
        logger.warn('BullMQ order queue not available. Using setTimeout fallback for job.');
        
        // Asynchronous fallback when BullMQ is disabled
        setTimeout(async () => {
            try {
                // Dynamically import to avoid circular dependencies
                const { processOrderJob } = await import('../processors/order.processor.js');
                await processOrderJob({ id: `fallback-${Date.now()}`, data });
            } catch (err) {
                logger.error(`Fallback order job failed: ${err.message}`);
            }
        }, options.delay || 0);
        
        return { id: `fallback-${Date.now()}` };
    }
    try {
        const job = await queue.add('process-order', data, options);
        logger.info(`Order job added: ${job.id}`);
        return job;
    } catch (err) {
        logger.error(`Failed to add order job: ${err.message}`);
        throw err;
    }
};
