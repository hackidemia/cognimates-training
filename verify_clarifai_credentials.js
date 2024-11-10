const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
require('dotenv').config();

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const pat = (process.env.CLARIFAI_PAT || '').trim();
metadata.set('authorization', `Key ${pat}`);

// Test the credentials by listing apps
const request = {
    user_app_id: {
        user_id: process.env.CLARIFAI_USER_ID,
        app_id: process.env.CLARIFAI_APP_ID
    }
};

console.log('Testing Clarifai credentials...');
console.log('PAT:', pat);
console.log('USER_ID:', process.env.CLARIFAI_USER_ID);
console.log('APP_ID:', process.env.CLARIFAI_APP_ID);

stub.ListApps(
    request,
    metadata,
    (err, response) => {
        if (err) {
            console.error('Error testing credentials:', err);
            process.exit(1);
        } else {
            console.log('Authentication successful!');
            console.log('Response:', JSON.stringify(response, null, 2));
            process.exit(0);
        }
    }
);
