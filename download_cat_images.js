const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const UNSPLASH_ACCESS_KEY = 'vGHnqYHJEEpTGxZAyGQB8qKSih3PpP_zNxGDLaX_1dI'; // Public demo key
const NUM_IMAGES = 10;

async function downloadImage(url, filename) {
    try {
        const response = await axios({
            url,
            responseType: 'arraybuffer'
        });
        await fs.writeFile(filename, response.data);
        console.log(`Downloaded ${filename}`);
    } catch (error) {
        console.error(`Error downloading ${filename}:`, error.message);
    }
}

async function main() {
    try {
        // Get cat photos from Unsplash
        const response = await axios.get(`https://api.unsplash.com/search/photos`, {
            params: {
                query: 'cat',
                per_page: NUM_IMAGES
            },
            headers: {
                Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
            }
        });

        const downloadPromises = response.data.results.map((photo, index) => {
            const filename = path.join(__dirname, 'static', 'test_images', 'cats', `cat${index + 1}.jpg`);
            return downloadImage(photo.urls.regular, filename);
        });

        await Promise.all(downloadPromises);
        console.log('All cat images downloaded successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
