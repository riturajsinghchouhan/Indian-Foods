import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://IndinaFoods:IndinaFoods@cluster0.gptsvku.mongodb.net/?appName=Cluster0';

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const FoodZone = mongoose.model('FoodZone', new mongoose.Schema({}, { strict: false }), 'food_zones');
    const FoodRestaurant = mongoose.model('FoodRestaurant', new mongoose.Schema({}, { strict: false }), 'food_restaurants');

    const delhiZone = await FoodZone.findOne({ name: /delhi/i });
    if (!delhiZone) {
      console.log('Delhi zone not found!');
      process.exit(1);
    }
    console.log('Found Delhi zone with ID:', delhiZone._id);

    const result = await FoodRestaurant.updateMany(
      { zoneId: delhiZone._id, status: 'approved' },
      { $set: { status: 'pending' } }
    );

    console.log(`Matched ${result.matchedCount} restaurants, modified ${result.modifiedCount} restaurants.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
