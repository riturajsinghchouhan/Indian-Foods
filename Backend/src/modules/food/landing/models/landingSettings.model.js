import mongoose from 'mongoose';

const foodLandingSettingsSchema = new mongoose.Schema(
    {
        exploreMoreHeading: {
            type: String,
            default: 'Explore more'
        },
        recommendedRestaurantIds: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'FoodRestaurant',
            default: []
        },
        showHeroBanners: {
            type: Boolean,
            default: true
        },
        showUnder250: {
            type: Boolean,
            default: true
        },
        showDining: {
            type: Boolean,
            default: true
        },
        showExploreIcons: {
            type: Boolean,
            default: true
        },
        showTop10: {
            type: Boolean,
            default: true
        },
        showGourmet: {
            type: Boolean,
            default: true
        },
        under250PriceLimit: {
            type: Number,
            default: 250,
            min: 1,
            max: 10000
        },
        festBannerImages: {
            type: [String],
            default: []
        },
        stats: {
            restaurants: { type: String, default: '3,00,000+' },
            cities: { type: String, default: '800+' },
            orders: { type: String, default: '3 billion+' }
        },
        appLinks: {
            playStore: { type: String, default: 'https://play.google.com/store/apps/details?id=com.indian.bite.user' },
            appStore: { type: String, default: '' }
        },
        socialLinks: {
            instagram: { type: String, default: '' },
            twitter: { type: String, default: '' },
            facebook: { type: String, default: '' },
            linkedin: { type: String, default: '' },
            youtube: { type: String, default: '' }
        },
        footerLinks: {
            about: { type: Array, default: [
                { label: 'Who We Are', url: '#' },
                { label: 'Blog', url: '#' },
                { label: 'Work With Us', url: '#' },
                { label: 'Investor Relations', url: '#' },
                { label: 'Report Fraud', url: '#' }
            ]},
            forRestaurants: { type: Array, default: [
                { label: 'Partner With Us', url: '#' },
                { label: 'Apps For You', url: '#' }
            ]},
            learnMore: { type: Array, default: [
                { label: 'Privacy', url: '#' },
                { label: 'Security', url: '#' },
                { label: 'Terms', url: '#' },
                { label: 'Sitemap', url: '#' }
            ]}
        },
        copyrightText: {
            type: String,
            default: '© 2026 Indian Bites™ Ltd. All rights reserved.'
        },
        heroSlides: {
            type: Array,
            default: [
                {
                    id: 1,
                    type: 'image',
                    image: "https://imgs.search.brave.com/M6LwR711rO-G0_jYd0Z9oPoxxK-a34nZgI1_5qU6Rzw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWcu/ZnJlZXBpay5jb20v/ZnJlZS1waG90by9o/YW1idXJnZXItd2l0/aC1iZWVmLWNoZWVz/ZV8xNDQ2MjctNjQy/NS5qcGc_c2l6ZT02/MjYmZXh0PWpwZw",
                    title: "Master Chef",
                    subtitle: "Experience the art of fine dining"
                },
                {
                    id: 2,
                    type: 'image',
                    image: "https://imgs.search.brave.com/hIq0w1x2X2gJzYv1fXQn41hU7lqP-t1sO62m7pX5B_I/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTA4/MTQyMjg5OC9waG90/by9wYW4tZnJpZWQt/ZHVjay5qcGc_cz02/MTJ4NjEyJnc9MCZr/PTIwJmM9eUhMck1N/RndqUkpSM1JOS3ZN/MmV1OWR4OW1YNUZH/amRjOVRlWGd2YTBx/RT0",
                    title: "Exquisite Taste",
                    subtitle: "High-class Professional Service"
                },
                {
                    id: 3,
                    type: 'image',
                    image: "https://imgs.search.brave.com/2bZ2bQHFZyIX3VGaUH-pJljecOdn0jb37I7zQZhhFv0/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvODg4/OTk0OTYyL3Bob3Rv/L2Nsb3NlLXVwLW9m/LWZhc3QtZm9vZC1v/bi10YWJsZS5qcGc_/cz02MTJ4NjEyJnc9/MCZrPTIwJmM9dGt5/c0daOFl1VURtNWkt/VTgzWWtqaUc2V2lR/TFRpWmEyZlVsc1JT/VnVhaz0",
                    title: "Tradition & Passion",
                    subtitle: "Only the best ingredients for our dishes"
                }
            ]
        }
    },
    {
        collection: 'food_landing_settings',
        timestamps: true
    }
);

export const FoodLandingSettings = mongoose.model('FoodLandingSettings', foodLandingSettingsSchema);

