const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();

// Clean the API key by removing whitespace and any non-alphanumeric characters
let apiKey = process.env.new_clarifai_key || '';
apiKey = apiKey.trim().replace(/[^a-zA-Z0-9]/g, '');

console.log('Testing API key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'Not found');

// Set the cleaned API key in metadata
metadata.set('authorization', `Key ${apiKey}`);

// Simple test to list models
stub.ListModels(
    {
        per_page: 1  // Just get one model to verify authentication
    },
    metadata,
    (err, response) => {
        if (err) {
            console.error('Error testing API key:', err);
            process.exit(1);
        }

        if (response.status.code !== 10000) {
            console.error('API test failed:', response.status.description);
            process.exit(1);
        }

        console.log('API key test successful!');
        console.log('Response status:', response.status);
        if (response.models && response.models.length > 0) {
            console.log('Successfully retrieved model:', response.models[0].id);
        }
        process.exit(0);
    }
);
