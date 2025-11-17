const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function rotateImages() {
  const imageDir = path.join(__dirname, 'public/deejaywg');
  const backupDir = path.join(__dirname, 'public/deejaywg/original');

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Get all jpg files
  const files = fs.readdirSync(imageDir)
    .filter(file => {
      const lowerCaseFile = file.toLowerCase();
      return lowerCaseFile.endsWith('.jpg') && !file.includes('rotated');
    });

  console.log(`Found ${files.length} images to rotate`);

  if (files.length === 0) {
    console.log(`No images found in ${imageDir}.`);
    return;
  }

  for (const file of files) {
    const filePath = path.join(imageDir, file);

    // Skip directories
    if (fs.statSync(filePath).isDirectory()) {
      continue;
    }

    const backupPath = path.join(backupDir, file);
    const outputPath = path.join(imageDir, file);

    console.log(`Rotating ${file} to the left (counterclockwise)...`);

    try {
      // Create a backup of the original image
      fs.copyFileSync(filePath, backupPath);

      // Rotate the image counterclockwise (270 degrees)
      await sharp(filePath)
        .rotate(270)
        .toFile(path.join(imageDir, 'temp_' + file));

      // Replace the original file with the rotated one
      fs.unlinkSync(filePath);
      fs.renameSync(path.join(imageDir, 'temp_' + file), outputPath);

      console.log(`Successfully rotated ${file}`);
    } catch (error) {
      console.error(`Error rotating ${file}:`, error);
    }
  }
}

rotateImages().then(() => console.log('Rotation complete'));
