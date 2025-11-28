const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const eventsDir = path.join(__dirname, 'public/images/events');

// Get all image files
const files = fs.readdirSync(eventsDir).filter(file =>
  file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')
);

console.log(`Found ${files.length} images to optimize...`);

const optimizePromises = files.map(async (file) => {
  const inputPath = path.join(eventsDir, file);
  const stats = fs.statSync(inputPath);
  const originalSize = (stats.size / 1024).toFixed(2);

  try {
    // Optimize: resize to max 1200px width, compress to 80% quality
    await sharp(inputPath)
      .resize(1200, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80, progressive: true })
      .toFile(inputPath + '.tmp');

    // Replace original with optimized version
    fs.renameSync(inputPath + '.tmp', inputPath);

    const newStats = fs.statSync(inputPath);
    const newSize = (newStats.size / 1024).toFixed(2);
    const savings = ((1 - newStats.size / stats.size) * 100).toFixed(1);

    console.log(`✓ ${file}: ${originalSize}KB → ${newSize}KB (${savings}% reduction)`);
  } catch (error) {
    console.error(`✗ Failed to optimize ${file}:`, error.message);
  }
});

Promise.all(optimizePromises)
  .then(() => {
    console.log('\n✓ All images optimized!');
  })
  .catch((error) => {
    console.error('Error during optimization:', error);
    process.exit(1);
  });
