const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
require('dotenv').config();

const PAT = process.env.CLARIFAI_PAT;
const USER_ID = process.env.clarifai_user_id;
const APP_NAME = 'cognimates-training';

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
metadata.set('authorization', `Key ${PAT}`);

async function createApp() {
    console.log('Attempting to create app...');
    return new Promise((resolve, reject) => {
        stub.PostApps(
            {
                apps: [{
                    id: APP_NAME,
                    name: APP_NAME
                }]
            },
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error creating app:', err);
                    reject(err);
                } else {
                    console.log('App created successfully:', response);
                    resolve(response);
                }
            }
        );
    });
}

async function listApps() {
    console.log('Listing apps...');
    return new Promise((resolve, reject) => {
        stub.ListApps(
            {
                user_app_id: { user_id: USER_ID }
            },
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error listing apps:', err);
                    reject(err);
                } else {
                    console.log('Apps listed successfully:', response);
                    resolve(response);
                }
            }
        );
    });
}

async function main() {
    try {
        console.log('Starting app verification...');
        console.log('Using USER_ID:', USER_ID);

        await createApp();
        await listApps();

        console.log('App verification completed successfully!');
    } catch (error) {
        console.error('Error in app verification:', error);
        process.exit(1);
    }
}

main().catch(console.error);
