const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

(async function optimizeJoaoRodolfo() {
  const sourceFiles = [
    path.join(__dirname, '../uploads/JROD_1.jpg'),
    path.join(__dirname, '../uploads/JROD_2.jpg'),
  ];
  const outputDir = path.join(__dirname, 'public/joaorodolfo');
  const targetSizeKB = 120; // ~ mid quality
  const maxQuality = 85;
  const minQuality = 60;
  const maxWidth = 1400;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const inputPath of sourceFiles) {
    if (!fs.existsSync(inputPath)) {
      console.warn(`Source file missing: ${inputPath}`);
      continue;
    }
    const baseName = path.basename(inputPath).replace(/\.[^/.]+$/, '');
    const outputPath = path.join(outputDir, `${baseName}.jpg`);
    console.log(`Optimising ${baseName} -> ${outputPath}`);

    try {
      await sharp(inputPath)
        .rotate()
        .resize(maxWidth, null, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: maxQuality, progressive: true })
        .toFile(outputPath);

      let stats = fs.statSync(outputPath);
      let currentKB = stats.size / 1024;
      let quality = maxQuality;
      while (currentKB > targetSizeKB * 1.5 && quality > minQuality) {
        quality -= 5;
        await sharp(inputPath)
          .rotate()
          .resize(maxWidth, null, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality, progressive: true })
          .toFile(outputPath);
        stats = fs.statSync(outputPath);
        currentKB = stats.size / 1024;
      }
      console.log(`${baseName}: ${currentKB.toFixed(1)}KB at quality ${quality}`);
    } catch (e) {
      console.error(`Failed to optimise ${inputPath}`, e);
    }
  }
})();
