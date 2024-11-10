const grpc = require('@grpc/grpc-js');
const { ClarifaiStub } = require('clarifai-nodejs-grpc');
require('dotenv').config();

// Get all potential keys
const clarifaiApiKey = process.env.clarifai_api;
const newClarifaiKey = process.env.new_clarifai_key;
const readApiKey = process.env.read_api;
const writeApiKey = process.env.write_api;

const availableKeys = {
    'clarifai_api': clarifaiApiKey,
    'new_clarifai_key': newClarifaiKey,
    'read_api': readApiKey,
    'write_api': writeApiKey
};

// Check if we have any keys to test
const hasKeys = Object.values(availableKeys).some(key => key);
if (!hasKeys) {
    console.error('Error: No Clarifai keys found in environment');
    process.exit(1);
}

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();

async function testAuth(key, keyName) {
    if (!key) {
        console.log(`\nSkipping ${keyName} - key not available`);
        return false;
    }

    console.log(`\nTesting ${keyName}:`, key.substring(0, 8) + '...');

    // Set up authorization with proper PAT format
    const metadata = new grpc.Metadata();
    metadata.set('authorization', `Key ${key}`);

    try {
        console.log('Listing apps to get user and app information...');
        const appsResponse = await new Promise((resolve, reject) => {
            stub.ListApps(
                {
                    page: 1,
                    per_page: 1
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

        console.log('Apps response:', JSON.stringify(appsResponse, null, 2));

        if (!appsResponse.apps || appsResponse.apps.length === 0) {
            console.log(`No apps found using ${keyName}`);
            return false;
        }

        const app = appsResponse.apps[0];
        const retrievedUserId = app.user_id;
        const retrievedAppId = app.id;

        console.log(`Retrieved user_id: ${retrievedUserId}, app_id: ${retrievedAppId}`);

        // Test model creation with proper structure
        const modelRequest = {
            user_app_id: {
                user_id: retrievedUserId,
                app_id: retrievedAppId
            },
            model: {
                id: 'test-model-' + Date.now(),
                name: 'Test Model',
                model_type_id: 'visual-classifier',
                output_info: {
                    data: {
                        concepts: [
                            { id: 'cat', name: 'cat' },
                            { id: 'dog', name: 'dog' }
                        ]
                    },
                    output_config: {
                        concepts_mutually_exclusive: true,
                        closed_environment: true
                    }
                }
            }
        };

        const createResponse = await new Promise((resolve, reject) => {
            stub.PostModels(modelRequest, metadata, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });

        console.log('Model creation response:', JSON.stringify(createResponse, null, 2));

        // If successful, update the .env file with the working key and IDs
        if (createResponse.status?.code === 10000) {
            const fs = require('fs');
            const envContent = `CLARIFAI_API_KEY=${key}
CLARIFAI_USER_ID=${retrievedUserId}
CLARIFAI_APP_ID=${retrievedAppId}
clarifai_api=${key}
READ_API=${process.env.read_api}
WRITE_API=${process.env.write_api}`;

            fs.writeFileSync('.env', envContent);
            console.log('\nEnvironment variables updated successfully!');
            return true;
        }
        return false;

    } catch (error) {
        console.error(`Error testing ${keyName}:`, error);
        return false;
    }
}

async function main() {
    let foundValidKey = false;

    // Test all available keys
    for (const [keyName, key] of Object.entries(availableKeys)) {
        const result = await testAuth(key, keyName);
        if (result) {
            foundValidKey = true;
            break;
        }
    }

    if (!foundValidKey) {
        console.log('\nNone of the available keys worked as a PAT. A proper PAT is required.');
    }
}

main();
