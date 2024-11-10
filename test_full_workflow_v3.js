const fs = require('fs');
const path = require('path');
const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const dotenv = require('dotenv');
dotenv.config();

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const pat = (process.env.CLARIFAI_PAT || '').trim();
metadata.set('authorization', `Key ${pat}`);

// Test concepts and global variables
const concepts = ['cat', 'dog'];
let modelId;
let userId;

// Function to get user info
async function getUserInfo() {
    return new Promise((resolve, reject) => {
        stub.GetUser({}, metadata, (err, response) => {
            if (err) {
                console.error('Error getting user info:', err);
                reject(err);
            } else {
                console.log('User info retrieved:', {
                    id: response.user.id,
                    email: response.user.email
                });
                userId = response.user.id;
                resolve(response.user);
            }
        });
    });
}

// Main workflow
async function main() {
    try {
        const user = await getUserInfo();
        console.log('Retrieved user ID:', userId);
        process.exit(0);
    } catch (error) {
        console.error('Error in workflow:', error);
        process.exit(1);
    }
}

main();
