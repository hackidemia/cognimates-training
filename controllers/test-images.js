const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Endpoint to list available test images
router.get('/list', (req, res) => {
    try {
        const catsDir = path.join(__dirname, '..', 'static', 'test_images', 'cats');
        const dogsDir = path.join(__dirname, '..', 'static', 'test_images', 'dogs');

        const catImages = fs.readdirSync(catsDir)
            .filter(file => file.endsWith('.jpg'))
            .map(file => `/static/test_images/cats/${file}`);

        const dogImages = fs.readdirSync(dogsDir)
            .filter(file => file.endsWith('.jpg'))
            .map(file => `/static/test_images/dogs/${file}`);

        res.json({
            cats: catImages,
            dogs: dogImages
        });
    } catch (error) {
        console.error('Error listing test images:', error);
        res.status(500).json({ error: 'Failed to list test images' });
    }
});

module.exports = router;
