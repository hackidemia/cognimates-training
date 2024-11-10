require('dotenv').config();

console.log('Environment Variables Check:');
console.log('===========================');
console.log('CLARIFAI_PAT:', process.env.CLARIFAI_PAT ? `Key ${process.env.CLARIFAI_PAT.substring(0, 5)}...${process.env.CLARIFAI_PAT.substring(-5)}` : 'Not set');
console.log('CLARIFAI_USER_ID:', process.env.CLARIFAI_USER_ID || 'Not set');
console.log('===========================');

if (!process.env.CLARIFAI_PAT) {
    console.error('Error: CLARIFAI_PAT is not set');
    process.exit(1);
}

if (!process.env.CLARIFAI_USER_ID) {
    console.error('Error: CLARIFAI_USER_ID is not set');
    process.exit(1);
}

// Check if values match expected format
if (process.env.CLARIFAI_USER_ID === 'clarifai') {
    console.error('Warning: CLARIFAI_USER_ID appears to be using default value "clarifai" instead of the actual user ID');
    process.exit(1);
}

console.log('All required environment variables are set');
