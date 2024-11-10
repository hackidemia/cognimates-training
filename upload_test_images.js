const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function uploadImages() {
    const categories = ['cats', 'dogs'];

    for (const category of categories) {
        const dirPath = path.join(__dirname, 'static', 'test_images', category);
        const files = fs.readdirSync(dirPath);

        console.log(`Uploading ${category} images...`);

        for (const file of files) {
            if (file.endsWith('.jpg')) {
                const imagePath = path.join(dirPath, file);
                const imageBuffer = fs.readFileSync(imagePath);
                const base64Image = imageBuffer.toString('base64');

                try {
                    const response = await axios.post('http://localhost:2634/api/upload-image', {
                        category: category,
                        image: base64Image,
                        projectName: 'cats-dogs-test'
                    });

                    console.log(`Uploaded ${file} to category ${category}`);
                } catch (error) {
                    console.error(`Error uploading ${file}:`, error.message);
                }

                // Add a small delay between uploads
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    console.log('All images uploaded successfully!');
}

uploadImages().catch(console.error);
