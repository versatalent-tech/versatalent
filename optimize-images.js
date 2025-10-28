const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeImages() {
  const sourceDir = path.join(__dirname, '../uploads');
  const outputDir = path.join(__dirname, 'public/deejaywg');
  const targetSizeKB = 100; // Target file size in KB (midpoint of 50-170KB range)
  const maxQuality = 85;
  const minQuality = 60;
  const maxWidth = 1200;

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get all image files (PNG and JPG)
  const files = fs.readdirSync(sourceDir)
    .filter(file => {
      const lowerCaseFile = file.toLowerCase();
      return lowerCaseFile.endsWith('.png') ||
             lowerCaseFile.endsWith('.jpg') ||
             lowerCaseFile.endsWith('.jpeg') ||
             lowerCaseFile.endsWith('.JPG');
    });

  console.log(`Found ${files.length} image files to optimize`);

  if (files.length === 0) {
    console.log(`No image files found in ${sourceDir}. Please check the directory path.`);
    return;
  }

  for (const file of files) {
    const inputPath = path.join(sourceDir, file);
    const outputFilename = file.replace(/\.[^/.]+$/, '') + '.jpg'; // Convert all to jpg
    const outputPath = path.join(outputDir, outputFilename);

    console.log(`Optimizing: ${inputPath} -> ${outputPath}`);

    try {
      // First attempt with default quality
      await sharp(inputPath)
        .resize(maxWidth, null, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: maxQuality, progressive: true })
        .toFile(outputPath);

      // Check if the size is within our target range
      let stats = fs.statSync(outputPath);
      let currentSizeKB = stats.size / 1024;
      let quality = maxQuality;

      // If the file is too large, progressively reduce quality until we reach target size
      // or hit minimum quality threshold
      while (currentSizeKB > targetSizeKB * 1.7 && quality > minQuality) {
        quality -= 5;
        console.log(`File too large (${currentSizeKB.toFixed(2)}KB), reducing quality to ${quality}...`);

        await sharp(inputPath)
          .resize(maxWidth, null, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality, progressive: true })
          .toFile(outputPath);

        stats = fs.statSync(outputPath);
        currentSizeKB = stats.size / 1024;
      }

      const inputStats = fs.statSync(inputPath);

      console.log(`Optimized ${file}: ${(inputStats.size / 1024 / 1024).toFixed(2)}MB -> ${currentSizeKB.toFixed(2)}KB (quality: ${quality})`);
    } catch (error) {
      console.error(`Error optimizing ${file}:`, error);
    }
  }
}

optimizeImages().then(() => console.log('Optimization complete'));
