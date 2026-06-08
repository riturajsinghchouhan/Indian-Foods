import mongoose from 'mongoose';

mongoose.connect('mongodb+srv://indianbites:indianbites@indianbites.y39vhkd.mongodb.net/IndianBites').then(async () => {
  const cols = await mongoose.connection.db.collections();
  const id1 = new mongoose.Types.ObjectId('6a26ac7e1184b06ea0b261ba');
  const id2 = new mongoose.Types.ObjectId('6a26b8f23dd26fd4263a4a51');
  
  for (let c of cols) {
    const doc1 = await c.findOne({ _id: id1 });
    if (doc1) console.log('id1 found in', c.collectionName, doc1.name || doc1.restaurantName || doc1.title);
    
    const doc2 = await c.findOne({ _id: id2 });
    if (doc2) console.log('id2 found in', c.collectionName, doc2.name || doc2.restaurantName || doc2.title);
  }
  process.exit(0);
});
