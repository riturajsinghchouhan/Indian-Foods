import mongoose from 'mongoose';

const businessSettingsSchema = new mongoose.Schema(
    {
        companyName: { type: String, required: true, default: 'Appzeto' },
        email: { type: String, required: true, default: 'admin@appzeto.com' },
        phone: {
            countryCode: { type: String, default: '+91' },
            number: { type: String, default: '' }
        },
        address: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        region: { type: String, default: 'India' },
        logo: {
            url: { type: String, default: '' },
            publicId: { type: String, default: '' }
        },
        favicon: {
            url: { type: String, default: '' },
            publicId: { type: String, default: '' }
        },
        supportEmail: { type: String, default: 'support@indianbites.com' },
        supportPhone: { type: String, default: '+91 1234567890' },
        supportHours: { type: String, default: '24/7 Availability' },
        termsAndConditionsPdf: {
            url: { type: String, default: '' },
            publicId: { type: String, default: '' }
        },
        onlinePaymentOnly: { type: Boolean, default: false }
    },
    { timestamps: true }
);

export const FoodBusinessSettings = mongoose.model('FoodBusinessSettings', businessSettingsSchema);
