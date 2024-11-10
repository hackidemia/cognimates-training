const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateCatImage(index, color) {
    const width = 300;
    const height = 300;
    const text = `Cat ${index}`;

    const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}"/>
        <circle cx="150" cy="100" r="50" fill="white"/>
        <circle cx="130" cy="90" r="10" fill="black"/>
        <circle cx="170" cy="90" r="10" fill="black"/>
        <path d="M 120 130 Q 150 160 180 130" stroke="black" fill="none" stroke-width="3"/>
        <path d="M 130 70 L 110 40 M 170 70 L 190 40" stroke="black" fill="none" stroke-width="2"/>
        <text x="50%" y="90%" font-family="Arial" font-size="24" fill="white" text-anchor="middle">${text}</text>
    </svg>`;

    const outputPath = path.join(__dirname, 'static', 'test_images', 'cats', `cat${index}.jpg`);
    await sharp(Buffer.from(svg))
        .jpeg()
        .toFile(outputPath);
    console.log(`Generated ${outputPath}`);
}

async function main() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
        '#D4A5A5', '#9B59B6', '#3498DB', '#E74C3C', '#2ECC71'
    ];

    for (let i = 0; i < 10; i++) {
        await generateCatImage(i + 1, colors[i]);
    }
}

main().catch(console.error);
