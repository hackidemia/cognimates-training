require('dotenv').config();
const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();

// Get all potential API keys from environment variables
const potentialKeys = {
    'clarifai_api': process.env.clarifai_api,
    'read_api': process.env.read_api,
    'write_api': process.env.write_api,
    'new_clarifai_key': process.env.new_clarifai_key
};

async function testKeyWithFormat(keyName, keyValue) {
    if (!keyValue) {
        console.log(`- Key ${keyName} not found in environment variables`);
        return false;
    }

    // Try different formats
    const formats = [
        keyValue.trim(),                    // Raw key
        `Key ${keyValue.trim()}`,          // With 'Key' prefix
        keyValue.trim().replace(/^Key /, '') // Remove 'Key' if it exists and use raw
    ];

    for (const format of formats) {
        console.log(`\nTesting ${keyName} with format: ${format.substring(0, 10)}...`);

        const metadata = new grpc.Metadata();
        metadata.set('authorization', format);

        try {
            const response = await new Promise((resolve, reject) => {
                stub.ListApps(
                    {},
                    metadata,
                    (err, response) => {
                        if (err) {
                            console.error(`- Error:`, err.details || err.message || err);
                            reject(err);
                        } else {
                            resolve(response);
                        }
                    }
                );
            });

            if (response.apps && response.apps.length > 0) {
                const app = response.apps[0];
                console.log('✓ Authentication successful!');
                console.log(`- User ID: ${app.user_id}`);
                console.log(`- App ID: ${app.id}`);

                // Update .env file with the working key and IDs
                const fs = require('fs');
                const envContent = `CLARIFAI_PAT=${format}
USER_ID=${app.user_id}
APP_ID=${app.id}`;

                fs.writeFileSync('.env', envContent);
                console.log('✓ Environment variables updated with working key and IDs');

                // Test a simple API call with the retrieved IDs
                const testResponse = await new Promise((resolve, reject) => {
                    stub.ListModels(
                        {
                            user_app_id: {
                                user_id: app.user_id,
                                app_id: app.id
                            },
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

                console.log('✓ Test API call successful!');
                console.log(`- Number of models found: ${testResponse.models ? testResponse.models.length : 0}`);
                return true;
            }
        } catch (error) {
            console.log(`- Authentication failed with this format`);
        }
    }
    return false;
}

async function verifyAuthAndGetIds() {
    let success = false;

    for (const [keyName, keyValue] of Object.entries(potentialKeys)) {
        try {
            if (await testKeyWithFormat(keyName, keyValue)) {
                success = true;
                break;
            }
        } catch (error) {
            console.log(`- Failed to test ${keyName}`);
        }
    }

    if (!success) {
        console.error('\nNo valid keys found in any format. A new Personal Access Token (PAT) may be required.');
        console.log('PAT should be in one of these formats:');
        console.log('1. Raw PAT value');
        console.log('2. Key {PAT value}');
        process.exit(1);
    }
}

verifyAuthAndGetIds();
