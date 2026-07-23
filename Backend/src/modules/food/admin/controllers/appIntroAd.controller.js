import AppIntroAd from '../models/appIntroAd.model.js';
import { uploadImageBuffer, uploadVideoBuffer } from '../../../../services/upload.service.js';

export const getAppIntroAds = async (req, res) => {
    try {
        const ads = await AppIntroAd.find().sort({ order: 1, createdAt: -1 });
        res.status(200).json({ success: true, data: ads });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const createAppIntroAd = async (req, res) => {
    try {
        const { title, mediaType, duration, isActive, order, type, startDate, endDate } = req.body;
        
        let mediaUrl = req.body.mediaUrl;
        
        // Handle file upload if present
        if (req.files && req.files.media) {
            const file = req.files.media[0];
            if (file.mimetype.startsWith('video/')) {
                mediaUrl = await uploadVideoBuffer(file.buffer, 'app_intro_ads');
            } else {
                mediaUrl = await uploadImageBuffer(file.buffer, 'app_intro_ads');
            }
        } else if (req.file) {
            const file = req.file;
            if (file.mimetype.startsWith('video/')) {
                mediaUrl = await uploadVideoBuffer(file.buffer, 'app_intro_ads');
            } else {
                mediaUrl = await uploadImageBuffer(file.buffer, 'app_intro_ads');
            }
        }

        if (!mediaUrl) {
            return res.status(400).json({ success: false, message: 'Media file or URL is required' });
        }

        const newAd = new AppIntroAd({
            title,
            mediaUrl,
            mediaType,
            duration: Number(duration) || 3,
            isActive: isActive === 'true' || isActive === true,
            order: Number(order) || 0,
            type: type || 'ad',
            startDate: startDate || null,
            endDate: endDate || null
        });

        await newAd.save();
        res.status(201).json({ success: true, data: newAd, message: 'Ad created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const updateAppIntroAd = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        if (req.files && req.files.media) {
            const file = req.files.media[0];
            if (file.mimetype.startsWith('video/')) {
                updates.mediaUrl = await uploadVideoBuffer(file.buffer, 'app_intro_ads');
            } else {
                updates.mediaUrl = await uploadImageBuffer(file.buffer, 'app_intro_ads');
            }
        } else if (req.file) {
            const file = req.file;
            if (file.mimetype.startsWith('video/')) {
                updates.mediaUrl = await uploadVideoBuffer(file.buffer, 'app_intro_ads');
            } else {
                updates.mediaUrl = await uploadImageBuffer(file.buffer, 'app_intro_ads');
            }
        }

        // convert types where necessary
        if (updates.duration) updates.duration = Number(updates.duration);
        if (updates.order) updates.order = Number(updates.order);
        if (updates.isActive !== undefined) {
            updates.isActive = updates.isActive === 'true' || updates.isActive === true;
        }

        const ad = await AppIntroAd.findByIdAndUpdate(id, updates, { new: true });
        
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }

        res.status(200).json({ success: true, data: ad, message: 'Ad updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const deleteAppIntroAd = async (req, res) => {
    try {
        const { id } = req.params;
        const ad = await AppIntroAd.findByIdAndDelete(id);
        
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }

        res.status(200).json({ success: true, message: 'Ad deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const toggleAppIntroAdStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const ad = await AppIntroAd.findById(id);
        
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }

        ad.isActive = !ad.isActive;
        await ad.save();

        res.status(200).json({ success: true, data: ad, message: `Ad ${ad.isActive ? 'enabled' : 'disabled'} successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const updateAppIntroAdsOrder = async (req, res) => {
    try {
        const { orders } = req.body; // array of { id, order }
        
        if (!orders || !Array.isArray(orders)) {
            return res.status(400).json({ success: false, message: 'Invalid orders array' });
        }

        for (const item of orders) {
            await AppIntroAd.findByIdAndUpdate(item.id, { order: item.order });
        }

        res.status(200).json({ success: true, message: 'Order updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const getPublicActiveAds = async (req, res) => {
    try {
        const now = new Date();
        const query = {
            isActive: true,
            $or: [
                { startDate: null, endDate: null },
                { startDate: { $lte: now }, endDate: { $gte: now } },
                { startDate: { $lte: now }, endDate: null },
                { startDate: null, endDate: { $gte: now } }
            ]
        };

        const ads = await AppIntroAd.find(query).sort({ order: 1, createdAt: -1 });
        res.status(200).json({ success: true, data: ads });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
