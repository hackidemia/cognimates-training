const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateTestImages() {
    // Create directories if they don't exist
    const catsDir = path.join(__dirname, 'static', 'test_images', 'cats');
    const dogsDir = path.join(__dirname, 'static', 'test_images', 'dogs');

    await fs.mkdir(catsDir, { recursive: true });
    await fs.mkdir(dogsDir, { recursive: true });

    // Generate 10 cat images (orange rectangles)
    for (let i = 1; i <= 10; i++) {
        await sharp({
            create: {
                width: 300,
                height: 200,
                channels: 4,
                background: { r: 255, g: 165, b: 0, alpha: 1 }
            }
        })
        .jpeg()
        .toFile(path.join(catsDir, `cat${i}.jpg`));
    }

    // Generate 10 dog images (blue rectangles)
    for (let i = 1; i <= 10; i++) {
        await sharp({
            create: {
                width: 300,
                height: 200,
                channels: 4,
                background: { r: 0, g: 0, b: 255, alpha: 1 }
            }
        })
        .jpeg()
        .toFile(path.join(dogsDir, `dog${i}.jpg`));
    }
}

generateTestImages().catch(console.error);
