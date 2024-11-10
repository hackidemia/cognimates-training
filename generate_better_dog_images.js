const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateDogImage(index) {
    // Create a more detailed synthetic dog image with better quality
    const width = 300;
    const height = 300;

    // Generate a more complex pattern for dogs with multiple shapes
    const svg = `
        <svg width="${width}" height="${height}">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:rgb(139,69,19);stop-opacity:1" />
                    <stop offset="100%" style="stop-color:rgb(160,82,45);stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="#f4f4f4"/>
            <!-- Dog head -->
            <circle cx="150" cy="150" r="100" fill="url(#grad)"/>
            <!-- Ears -->
            <ellipse cx="80" cy="100" rx="40" ry="60" fill="rgb(139,69,19)"/>
            <ellipse cx="220" cy="100" rx="40" ry="60" fill="rgb(139,69,19)"/>
            <!-- Eyes -->
            <circle cx="110" cy="130" r="15" fill="black"/>
            <circle cx="190" cy="130" r="15" fill="black"/>
            <!-- Nose -->
            <circle cx="150" cy="170" r="20" fill="rgb(51,33,25)"/>
            <!-- Mouth -->
            <path d="M 120,190 Q 150,220 180,190" stroke="rgb(51,33,25)" stroke-width="5" fill="none"/>
        </svg>`;

    const outputDir = path.join(__dirname, 'static', 'test_images', 'dogs');
    const outputPath = path.join(outputDir, `dog${index}.jpg`);

    // Ensure higher quality with better compression settings
    await sharp(Buffer.from(svg))
        .jpeg({
            quality: 90,
            chromaSubsampling: '4:4:4'
        })
        .toFile(outputPath);

    console.log(`Generated dog${index}.jpg`);
}

async function generateAllDogImages() {
    try {
        // Generate 10 dog images
        const promises = Array.from({ length: 10 }, (_, i) => generateDogImage(i + 1));
        await Promise.all(promises);
        console.log('All dog images generated successfully');
    } catch (error) {
        console.error('Error generating dog images:', error);
    }
}

generateAllDogImages();
