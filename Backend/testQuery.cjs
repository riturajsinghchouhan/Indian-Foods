const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://indianbites:indianbites@indianbites.y39vhkd.mongodb.net/IndianBites";

async function check() {
  await mongoose.connect(MONGODB_URI);
  
  const { FoodDeliveryPartner } = require('./src/modules/food/delivery/models/deliveryPartner.model.js');
  const { FoodOrder } = require('./src/modules/food/orders/models/order.model.js');

  const today = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const deliveryPartners = await FoodDeliveryPartner.find({ availabilityStatus: 'online', status: 'approved' }).lean();
  const dpIds = deliveryPartners.map(dp => dp._id);

  console.log("dpIds:", dpIds);

  const allDpOrdersToday = await FoodOrder.find({
      createdAt: { $gte: today },
      'dispatch.deliveryPartnerId': { $in: dpIds }
  }).lean();

  console.log("Orders found for these partners in last 24h:", allDpOrdersToday.length);
  allDpOrdersToday.forEach(o => {
    console.log(o.order_id, o.dispatch.deliveryPartnerId, o.createdAt);
  });

  await mongoose.disconnect();
}

check().catch(console.error);
