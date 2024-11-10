const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

async function verifyApiConnection() {
    try {
        console.log('Step 1: Testing API connection...');
        const listResponse = await new Promise((resolve, reject) => {
            stub.ListModels(
                {
                    page: 1,
                    per_page: 5
                },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error listing models:', err);
                        reject(err);
                    } else {
                        console.log('List models response:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        if (listResponse.status.code === 10000) {
            console.log('API connection successful!');
            console.log('User ID:', listResponse.models[0]?.user_id);
            console.log('App ID:', listResponse.models[0]?.app_id);

            // Step 2: Test model type listing
            console.log('\nStep 2: Testing model type listing...');
            const typeResponse = await new Promise((resolve, reject) => {
                stub.ListModelTypes(
                    {},
                    metadata,
                    (err, response) => {
                        if (err) {
                            console.error('Error listing model types:', err);
                            reject(err);
                        } else {
                            console.log('Model types response:', JSON.stringify(response, null, 2));
                            resolve(response);
                        }
                    }
                );
            });

            if (typeResponse.status.code === 10000) {
                console.log('Model type listing successful!');
                const visualClassifier = typeResponse.model_types.find(t => t.id === 'visual-classifier');
                if (visualClassifier) {
                    console.log('\nVisual Classifier type details:', JSON.stringify(visualClassifier, null, 2));
                }
            }
        } else {
            throw new Error(`API connection failed with status code: ${listResponse.status.code}`);
        }
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verifyApiConnection();
