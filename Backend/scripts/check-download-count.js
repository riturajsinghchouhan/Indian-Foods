import fs from 'fs';
import path from 'path';

const DEST_FOLDER = 'D:\\Indian-Foods\\Frontend\\cloudimages';
const TOTAL_EXPECTED = 7582; // Total images in Cloudinary

// Recursive function to get all files in directory
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach((file) => {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });

  return arrayOfFiles;
}

try {
  if (fs.existsSync(DEST_FOLDER)) {
    const allFiles = getAllFiles(DEST_FOLDER);
    const count = allFiles.length;
    const percentage = ((count / TOTAL_EXPECTED) * 100).toFixed(2);
    
    console.log('\n=======================================');
    console.log(`📂 Folder: ${DEST_FOLDER}`);
    console.log(`✅ Total Downloaded Images: ${count}`);
    console.log(`🎯 Remaining Images: ${TOTAL_EXPECTED - count}`);
    console.log(`📊 Progress: ${percentage}%`);
    console.log('=======================================\n');
  } else {
    console.log(`Abhi tak folder '${DEST_FOLDER}' nahi bana hai.`);
  }
} catch (error) {
  console.error("Count check karne me error aayi:", error.message);
}
