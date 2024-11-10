const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'static', 'test_images', 'dogs');

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Generate 10 different colored rectangles as placeholder dog images
for (let i = 1; i <= 10; i++) {
    const width = 300;
    const height = 300;
    const r = Math.floor(Math.random() * 100 + 155);
    const g = Math.floor(Math.random() * 100);
    const b = Math.floor(Math.random() * 100);
    const color = { r, g, b }; // Brownish colors as RGB object

    sharp({
        create: {
            width: width,
            height: height,
            channels: 3,
            background: color
        }
    })
    .jpeg()
    .toFile(path.join(outputDir, `dog${i}.jpg`))
    .then(() => {
        console.log(`Generated ${path.join(outputDir, `dog${i}.jpg`)}`);
    })
    .catch(err => {
        console.error(`Error generating dog${i}.jpg:`, err);
    });
}
