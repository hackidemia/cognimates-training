require('dotenv').config();
const fs = require('fs');

// Get the secrets from environment
const clarifaiApi = process.env.clarifai_api;
const readApi = process.env.read_api;
const writeApi = process.env.write_api;

// Check if required variables are set
if (!clarifaiApi || !readApi || !writeApi) {
    console.error('Error: Required environment variables are not set');
    process.exit(1);
}

// Create or update .env file
const envContent = `CLARIFAI_API_KEY=${clarifaiApi}
READ_API=${readApi}
WRITE_API=${writeApi}
clarifai_api=${clarifaiApi}`;

fs.writeFileSync('.env', envContent);
console.log('Environment variables have been set up successfully!');
