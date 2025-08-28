const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeImages() {
  const sourceDir = '../uploads';
  const outputDir = 'public/deejaywg';

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get all JPG files
  const files = fs.readdirSync(sourceDir)
    .filter(file => file.endsWith('.JPG') || file.endsWith('.jpg'));

  console.log(`Found ${files.length} JPG files to optimize`);

  for (const file of files) {
    const inputPath = path.join(sourceDir, file);
    const outputFilename = file.replace(/\.[^/.]+$/, '') + '.jpg'; // Ensure lowercase extension
    const outputPath = path.join(outputDir, outputFilename);

    console.log(`Optimizing: ${inputPath} -> ${outputPath}`);

    try {
      await sharp(inputPath)
        .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toFile(outputPath);

      const inputStats = fs.statSync(inputPath);
      const outputStats = fs.statSync(outputPath);

      console.log(`Optimized ${file}: ${(inputStats.size / 1024 / 1024).toFixed(2)}MB -> ${(outputStats.size / 1024 / 1024).toFixed(2)}MB`);
    } catch (error) {
      console.error(`Error optimizing ${file}:`, error);
    }
  }
}

optimizeImages().then(() => console.log('Optimization complete'));
