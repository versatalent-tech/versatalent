const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function compressImages() {
  const sourceDir = 'public/jessicadias';
  const outputDir = 'public/jessicadias/optimized';

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get all PNG files
  const files = fs.readdirSync(sourceDir)
    .filter(file => file.endsWith('.png') && !file.includes('optimized'));

  console.log(`Found ${files.length} PNG files to compress`);

  for (const file of files) {
    const inputPath = path.join(sourceDir, file);
    const outputFilename = file.replace('.png', '.jpg');
    const outputPath = path.join(outputDir, outputFilename);

    console.log(`Compressing: ${inputPath} -> ${outputPath}`);

    try {
      await sharp(inputPath)
        .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      const inputStats = fs.statSync(inputPath);
      const outputStats = fs.statSync(outputPath);

      console.log(`Compressed ${file}: ${(inputStats.size / 1024 / 1024).toFixed(2)}MB -> ${(outputStats.size / 1024 / 1024).toFixed(2)}MB`);
    } catch (error) {
      console.error(`Error compressing ${file}:`, error);
    }
  }
}

compressImages().then(() => console.log('Compression complete'));
