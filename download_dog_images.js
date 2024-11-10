const axios = require('axios');
const fs = require('fs');
const path = require('path');

const downloadImage = async (url, filepath) => {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};

async function downloadDogImages() {
    const outputDir = path.join(__dirname, 'static', 'test_images', 'dogs');

    // Ensure the directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        // Get 10 random dog images
        for (let i = 1; i <= 10; i++) {
            const response = await axios.get('https://dog.ceo/api/breeds/image/random');
            const imageUrl = response.data.message;
            const outputPath = path.join(outputDir, `dog${i}.jpg`);

            await downloadImage(imageUrl, outputPath);
            console.log(`Downloaded dog${i}.jpg`);
        }

        console.log('All dog images downloaded successfully');
    } catch (error) {
        console.error('Error downloading dog images:', error);
    }
}

downloadDogImages();
