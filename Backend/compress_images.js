import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

// Auto-detect absolute path from .env exactly like app.js
const UPLOAD_DIR = (process.env.UPLOAD_PATH && path.isAbsolute(process.env.UPLOAD_PATH)) 
    ? process.env.UPLOAD_PATH 
    : path.join(process.cwd(), 'src', 'uploads');

async function gatherImages(dir, filesList = []) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await gatherImages(fullPath, filesList);
      } else {
        const ext = path.extname(fullPath).toLowerCase();
        if (['.jpg', '.jpeg', '.png'].includes(ext)) {
          filesList.push(fullPath);
        }
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error reading directory ${dir}:`, err.message);
    }
  }
  return filesList;
}

function updateProgressBar(current, total) {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((percentage / 100) * 40);
  const empty = 40 - filled;
  const bar = '█'.repeat(filled) + '-'.repeat(empty);
  process.stdout.write(`\r[${bar}] ${percentage}% (${current}/${total} images converted)`);
}

async function convertImages(files, mappings) {
  const total = files.length;
  if (total === 0) return;
  
  for (let i = 0; i < total; i++) {
    const fullPath = files[i];
    const ext = path.extname(fullPath).toLowerCase();
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
      process.stdout.write(`\nFailed to convert ${fullPath}: ${err.message}\n`);
    }
    
    updateProgressBar(i + 1, total);
  }
  console.log('\n'); // Move to next line after progress bar finishes
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

    console.log(`\nScanning uploads directory: ${UPLOAD_DIR}`);
    const filesToConvert = await gatherImages(UPLOAD_DIR);
    console.log(`Found ${filesToConvert.length} images to convert.\n`);

    const mappings = {};
    if (filesToConvert.length > 0) {
      await convertImages(filesToConvert, mappings);
    }

    if (Object.keys(mappings).length > 0) {
      console.log("Updating database references...");
      
      const collections = await mongoose.connection.db.listCollections().toArray();
      for (const coll of collections) {
        await updateCollection(coll.name, mappings);
      }
      console.log("Database update complete.");
    } else {
      console.log("No images were converted (either empty or already WebP).");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
