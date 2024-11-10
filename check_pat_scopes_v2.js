const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const dotenv = require('dotenv');
dotenv.config();

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const pat = (process.env.CLARIFAI_PAT || '').trim();
metadata.set('authorization', `Key ${pat}`);

// First get user context from ListApps
async function getUserContext() {
    return new Promise((resolve, reject) => {
        stub.ListApps(
            {
                page: 1,
                per_page: 1
            },
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error listing apps:', err);
                    reject(err);
                } else {
                    if (response.apps && response.apps.length > 0) {
                        const app = response.apps[0];
                        const userAppId = {
                            user_id: app.user_id,
                            app_id: app.id
                        };
                        console.log('User context retrieved:', userAppId);
                        resolve(userAppId);
                    } else {
                        reject(new Error('No apps found'));
                    }
                }
            }
        );
    });
}

async function checkPATScopes(userAppId) {
    return new Promise((resolve, reject) => {
        stub.MyScopes(
            {
                user_app_id: userAppId
            },
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error checking PAT scopes:', err);
                    reject(err);
                } else {
                    console.log('PAT Scopes:', JSON.stringify(response, null, 2));
                    resolve(response);
                }
            }
        );
    });
}

// Function to check specific endpoint access
async function checkEndpointAccess(userAppId) {
    const criticalEndpoints = [
        '/clarifai.api.V2/PostModels',
        '/clarifai.api.V2/PostModelVersions',
        '/clarifai.api.V2/PostInputs'
    ];

    console.log('\nChecking access to critical endpoints:');
    for (const endpoint of criticalEndpoints) {
        try {
            const response = await new Promise((resolve, reject) => {
                stub.ListScopes(
                    {
                        user_app_id: userAppId,
                        endpoints: [endpoint]
                    },
                    metadata,
                    (err, response) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(response);
                        }
                    }
                );
            });
            console.log(`\nEndpoint ${endpoint}:`);
            console.log('Access:', JSON.stringify(response, null, 2));
        } catch (error) {
            console.error(`Error checking access for ${endpoint}:`, error.message);
        }
    }
}

async function main() {
    try {
        const userAppId = await getUserContext();
        console.log('\nChecking PAT scopes with user context...');
        await checkPATScopes(userAppId);
        console.log('\nChecking specific endpoint access...');
        await checkEndpointAccess(userAppId);
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    }
}

main();
