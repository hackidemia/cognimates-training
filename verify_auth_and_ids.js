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

// Common user_id/app_id combinations to try
const userAppCombos = [
    { user_id: 'cognimates', app_id: 'training' },  // Our primary app
    { user_id: 'cognimates', app_id: 'main' },      // Our main app
    { user_id: 'clarifai', app_id: 'main' }         // Default Clarifai public app (fallback)
];

async function testKey(keyName, keyValue) {
    if (!keyValue) {
        console.log(`- Key ${keyName} not found in environment variables`);
        return false;
    }

    // Ensure key has proper format with exactly "Key " prefix (note the space)
    let formattedKey = keyValue.trim();
    if (!formattedKey.startsWith('Key ')) {
        formattedKey = `Key ${formattedKey.replace(/^Key\s*/, '')}`;  // Remove any existing "Key" prefix first
    }

    console.log(`\nTesting ${keyName} with proper PAT format`);
    const metadata = new grpc.Metadata();
    metadata.set('authorization', formattedKey);

    // Try different user/app combinations
    for (const combo of userAppCombos) {
        console.log(`\nTrying with user_id: ${combo.user_id}, app_id: ${combo.app_id}`);

        try {
            // First try listing apps to verify basic authentication
            const listAppsResponse = await new Promise((resolve, reject) => {
                stub.ListApps(
                    {
                        user_app_id: {
                            user_id: combo.user_id,
                            app_id: combo.app_id
                        }
                    },
                    metadata,
                    (err, response) => {
                        if (err) {
                            console.error(`- Error listing apps:`, err.details || err.message || err);
                            reject(err);
                        } else {
                            resolve(response);
                        }
                    }
                );
            });

            if (listAppsResponse.apps && listAppsResponse.apps.length > 0) {
                console.log('✓ Authentication successful!');
                console.log(`- Found ${listAppsResponse.apps.length} apps`);

                // Get the first app's details
                const app = listAppsResponse.apps[0];
                console.log(`- First app user_id: ${app.user_id}`);
                console.log(`- First app id: ${app.id}`);

                // Try a simple model listing to verify full access
                const modelResponse = await new Promise((resolve, reject) => {
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

                console.log('✓ Model listing successful!');
                console.log(`- Number of models found: ${modelResponse.models ? modelResponse.models.length : 0}`);

                // Update .env file with working credentials
                const fs = require('fs');
                const envContent = `CLARIFAI_PAT=${formattedKey}
USER_ID=${app.user_id}
APP_ID=${app.id}`;

                fs.writeFileSync('.env', envContent);
                console.log('✓ Environment variables updated with working credentials');
                return true;
            } else {
                console.log('- No apps found with this combination');
            }
        } catch (error) {
            console.log(`- Authentication failed with this combination:`, error.details || error.message || error);
        }
    }
    return false;
}

async function verifyAuthAndGetIds() {
    let success = false;

    for (const [keyName, keyValue] of Object.entries(potentialKeys)) {
        try {
            if (await testKey(keyName, keyValue)) {
                success = true;
                break;
            }
        } catch (error) {
            console.log(`- Failed to test ${keyName}:`, error.details || error.message || error);
        }
    }

    if (!success) {
        console.error('\nNo valid keys found. Please ensure you have a valid Personal Access Token (PAT).');
        console.log('PAT format should be: Key {your-pat-here}');
        console.log('Make sure you have access to the necessary user_id and app_id combination.');
        process.exit(1);
    }
}

verifyAuthAndGetIds();
