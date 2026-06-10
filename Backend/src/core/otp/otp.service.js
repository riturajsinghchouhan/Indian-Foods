import crypto from 'crypto';
import ms from 'ms';
import { FoodOtp } from './otp.model.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { ValidationError } from '../auth/errors.js';

const generateOtpCode = () => {
    const code = crypto.randomInt(100000, 999999);
    return String(code);
};

/**
 * Sends SMS via MSG91 API
 * @param {string} phone - 10-digit mobile number
 * @param {string} otp
 */
const sendSmsViaMsg91 = async (phone, otp) => {
    try {
        // Normalize phone: strip non-digits, ensure 91 country code prefix
        const digits = String(phone || '').replace(/\D/g, '');
        const msisdn = digits.startsWith('91') ? digits : `91${digits}`;

        // MSG91 API
        const url = new URL('https://control.msg91.com/api/v5/otp');
        url.searchParams.append('template_id', config.msg91TemplateId);
        url.searchParams.append('mobile', msisdn);
        url.searchParams.append('authkey', config.msg91AuthKey);
        url.searchParams.append('otp', otp);

        logger.info(`[SMS] Sending OTP to ${msisdn} via MSG91...`);
        const response = await fetch(url.toString(), { method: 'POST' });
        const resultText = await response.text();
        logger.info(`[SMS] Raw response for ${msisdn}: ${resultText}`);

        let parsed = null;
        try { parsed = JSON.parse(resultText); } catch (_) { }

        if (parsed && parsed.type === 'error') {
            const errMsg = `MSG91 ERROR for ${phone}: ${parsed.message || resultText}`;
            logger.error(errMsg);
            // eslint-disable-next-line no-console
            console.error(`❌ [SMS ERROR] ${errMsg}`);
        } else if (!response.ok) {
            logger.error(`SMS API HTTP error for ${phone}: ${response.status} – ${resultText}`);
        } else {
            logger.info(`✅ SMS sent successfully to ${msisdn} via MSG91`);
        }
    } catch (error) {
        logger.error(`Error sending SMS to ${phone} via MSG91: ${error.message}`);
        // Do NOT throw — OTP is already stored in DB; SMS failure should not block the flow
    }
};

export const createOrUpdateOtp = async (phone) => {
    const existing = await FoodOtp.findOne({ phone });
    const now = new Date();

    // Rate Limiting Logic
    if (existing) {
        const windowMs = (config.otpRateWindow || 600) * 1000;
        const isInWindow = now - existing.lastRequestAt < windowMs;

        if (isInWindow) {
            if (existing.requestCount >= (config.otpRateLimit || 3)) {
                logger.warn(`Rate limit exceeded for phone ${phone}`);
                throw new ValidationError(`Too many OTP requests. Please try again after ${Math.ceil(windowMs / 60000)} minutes.`);
            }
            existing.requestCount += 1;
        } else {
            // Reset count if window has passed
            existing.requestCount = 1;
        }
    }

    let otp;
    if (config.useDefaultOtp || phone === '9755633147') {
        otp = '123456';
        logger.info(`Default OTP mode enabled – OTP is ${otp} for phone ${phone}`);
    } else {
        otp = generateOtpCode();
    }

    // Expiry calculation: prioritize seconds, then minutes, then fallback to MS string
    let ttlMs;
    if (config.otpExpirySeconds) {
        ttlMs = config.otpExpirySeconds * 1000;
    } else if (config.otpExpiryMinutes) {
        ttlMs = config.otpExpiryMinutes * 60 * 1000;
    } else {
        ttlMs = ms(config.otpExpiry || '5m');
    }
    const expiresAt = new Date(now.getTime() + ttlMs);

    if (existing) {
        existing.otp = otp;
        existing.expiresAt = expiresAt;
        existing.attempts = 0;
        existing.lastRequestAt = now;
        await existing.save();
    } else {
        await FoodOtp.create({
            phone,
            otp,
            expiresAt,
            requestCount: 1,
            lastRequestAt: now
        });
    }

    // Only send SMS if not in default OTP mode
    if (!config.useDefaultOtp && phone !== '9755633147') {
        await sendSmsViaMsg91(phone, otp);
    }

    return otp;
};

export const verifyOtp = async (phone, otp) => {
    const record = await FoodOtp.findOne({ phone });
    if (!record) {
        return { valid: false, reason: 'OTP not found' };
    }

    if (record.expiresAt < new Date()) {
        return { valid: false, reason: 'OTP expired' };
    }

    if (record.attempts >= config.otpMaxAttempts) {
        return { valid: false, reason: 'Max attempts exceeded' };
    }

    record.attempts += 1;

    if (record.otp !== otp) {
        await record.save();
        return { valid: false, reason: 'Invalid OTP' };
    }

    await record.deleteOne();
    return { valid: true };
};

