const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const dotenv = require('dotenv');
dotenv.config();

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const pat = (process.env.CLARIFAI_PAT || '').trim();
metadata.set('authorization', `Key ${pat}`);

// Function to list apps
async function listApps() {
    return new Promise((resolve, reject) => {
        stub.ListApps(
            {
                user_app_id: {
                    user_id: process.env.CLARIFAI_USER_ID
                },
                page: 1,
                per_page: 10
            },
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error listing apps:', err);
                    reject(err);
                } else {
                    console.log('Apps listed successfully');
                    console.log('Response:', JSON.stringify(response, null, 2));
                    resolve(response);
                }
            }
        );
    });
}

// Function to get app details
async function getAppDetails() {
    return new Promise((resolve, reject) => {
        if (!process.env.CLARIFAI_APP_ID) {
            reject(new Error('CLARIFAI_APP_ID is not set'));
            return;
        }

        stub.GetApp(
            {
                user_app_id: {
                    user_id: process.env.CLARIFAI_USER_ID,
                    app_id: process.env.CLARIFAI_APP_ID
                }
            },
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error getting app details:', err);
                    reject(err);
                } else {
                    console.log('App details retrieved successfully');
                    console.log('App Details:', JSON.stringify(response, null, 2));
                    resolve(response);
                }
            }
        );
    });
}

async function main() {
    try {
        console.log('Current environment configuration:');
        console.log('USER_ID:', process.env.CLARIFAI_USER_ID);
        console.log('APP_ID:', process.env.CLARIFAI_APP_ID);
        console.log('\nAttempting to list apps...');

        await listApps();
        console.log('\nAttempting to get app details...');
        await getAppDetails();

        console.log('\nVerification completed successfully');
    } catch (error) {
        console.error('\nVerification failed:', error);
        process.exit(1);
    }
}

main();
