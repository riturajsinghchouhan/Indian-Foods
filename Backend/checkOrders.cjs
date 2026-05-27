const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://indianbites:indianbites@indianbites.y39vhkd.mongodb.net/IndianBites";

async function check() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  
  const orders = await db.collection('food_orders').find({ 'dispatch.deliveryPartnerId': { $ne: null } }).toArray();
  console.log('Orders with assigned delivery partner:');
  for (const o of orders) {
     console.log('ID:', o.order_id || o._id, 'Status:', o.orderStatus, 'PartnerID:', o.dispatch?.deliveryPartnerId, 'Created At:', o.createdAt);
  }
  
  await mongoose.disconnect();
}

check().catch(console.error);
