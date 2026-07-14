import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

const UPLOAD_DIR = path.join(process.cwd(), 'src', 'uploads');

async function processDirectory(dir, mappings) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await processDirectory(fullPath, mappings);
    } else {
      const ext = path.extname(fullPath).toLowerCase();
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        const newPath = fullPath.substring(0, fullPath.length - ext.length) + '.webp';
        
        try {
          // Read buffer first to avoid file locks
          const buffer = await fs.readFile(fullPath);
          
          // Convert to WebP
          await sharp(buffer)
            .webp({ quality: 80 })
            .toFile(newPath);
          
          // Delete old file
          await fs.unlink(fullPath);
          
          // Record mapping (old relative url -> new relative url)
          const relativeOld = fullPath.substring(UPLOAD_DIR.length).replace(/\\/g, '/');
          const relativeNew = newPath.substring(UPLOAD_DIR.length).replace(/\\/g, '/');
          mappings[`/uploads${relativeOld}`] = `/uploads${relativeNew}`;
          
        } catch (err) {
          console.error(`Failed to convert ${fullPath}:`, err.message);
        }
      }
    }
  }
}

async function updateCollection(collectionName, mappings) {
  const collection = mongoose.connection.collection(collectionName);
  const docs = await collection.find({}).toArray();
  let updatedCount = 0;
  const updates = [];

  for (const doc of docs) {
    let modified = false;
    
    const traverse = (obj) => {
      for (const key in obj) {
        if (!obj.hasOwnProperty(key)) continue;
        const val = obj[key];
        
        if (typeof val === 'string') {
          if (mappings[val]) {
            obj[key] = mappings[val];
            modified = true;
          } else {
            for (const [oldUrl, newUrl] of Object.entries(mappings)) {
              if (val.includes(oldUrl)) {
                obj[key] = val.replaceAll(oldUrl, newUrl);
                modified = true;
              }
            }
          }
        } else if (val !== null && typeof val === 'object') {
          traverse(val);
        }
      }
    };

    traverse(doc);

    if (modified) {
      updates.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: doc }
        }
      });
      updatedCount++;
    }
  }

  if (updates.length > 0) {
    const chunkSize = 1000;
    for (let i = 0; i < updates.length; i += chunkSize) {
      await collection.bulkWrite(updates.slice(i, i + chunkSize));
    }
    console.log(`Updated ${updatedCount} documents in collection: ${collectionName}`);
  }
}

async function main() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");

    console.log("Scanning and converting images in uploads directory...");
    const mappings = {};
    await processDirectory(UPLOAD_DIR, mappings);
    console.log(`Converted ${Object.keys(mappings).length} images.`);

    if (Object.keys(mappings).length > 0) {
      console.log("Updating database references...");
      
      const collections = await mongoose.connection.db.listCollections().toArray();
      for (const coll of collections) {
        await updateCollection(coll.name, mappings);
      }
      console.log("Database update complete.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
