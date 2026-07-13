import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Destination folder
const DEST_FOLDER = 'D:\\Indian-Foods\\Frontend\\cloudimages';

// Helper to download file
const downloadImage = (url, destPath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {}); // Delete the file async. (But we don't check the result)
      reject(err);
    });
  });
};

const backupImages = async () => {
  try {
    console.log(`\n===========================================`);
    console.log(`Starting Cloudinary Backup...`);
    console.log(`Destination Folder: ${DEST_FOLDER}`);
    console.log(`===========================================\n`);

    if (!fs.existsSync(DEST_FOLDER)) {
      fs.mkdirSync(DEST_FOLDER, { recursive: true });
    }

    let nextCursor = null;
    let totalDownloaded = 0;
    let totalErrors = 0;
    let allResourcesCount = 0;

    // Loop through all pages of results
    do {
      console.log('Fetching next batch from Cloudinary API...');
      const result = await cloudinary.v2.api.resources({
        type: 'upload',
        max_results: 500, // Max allowed per request is 500
        next_cursor: nextCursor
      });

      const resources = result.resources;
      allResourcesCount += resources.length;
      console.log(`Found ${resources.length} images in this batch. (Total Found So Far: ${allResourcesCount})\n`);

      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        
        // Extract original file extension from secure_url (if not provided explicitly by format, but format is usually there)
        const format = resource.format || 'jpg';
        const publicId = resource.public_id;
        
        // Create full path and ensure subdirectories exist if public_id contains slashes (e.g., 'products/image')
        const relPath = `${publicId}.${format}`;
        const absPath = path.join(DEST_FOLDER, relPath);
        const fileDir = path.dirname(absPath);
        
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        try {
          // Process string padding for clean output (e.g. [ 1/500 ])
          const currentIndex = (i + 1).toString().padStart(resources.length.toString().length, '0');
          process.stdout.write(`Downloading [${currentIndex}/${resources.length}] (Overall: ${totalDownloaded + 1}) -> ${relPath} ... `);
          
          await downloadImage(resource.secure_url, absPath);
          totalDownloaded++;
          process.stdout.write(`DONE\n`);
        } catch (err) {
          totalErrors++;
          process.stdout.write(`FAILED (${err.message})\n`);
        }
      }

      nextCursor = result.next_cursor;
    } while (nextCursor);

    console.log(`\n===========================================`);
    console.log(`Backup Completed!`);
    console.log(`Total Images Downloaded: ${totalDownloaded}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`===========================================\n`);

  } catch (error) {
    console.error('An error occurred during backup:', error);
  }
};

backupImages();
