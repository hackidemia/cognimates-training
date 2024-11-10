// Script to check environment variables
console.log('Checking environment variables for Clarifai keys...');

// List all environment variables that might contain Clarifai keys
const possibleKeys = [
    'CLARIFAI_API_KEY',
    'clarifai_api',
    'new_clarifai_key'
];

possibleKeys.forEach(key => {
    if (process.env[key]) {
        console.log(`Found key ${key}:`);
        console.log(`Value: ${process.env[key]}`);
        console.log(`Length: ${process.env[key].length}`);
        console.log('First 8 chars:', process.env[key].substring(0, 8));
        console.log('---');
    } else {
        console.log(`No value found for ${key}`);
        console.log('---');
    }
});
