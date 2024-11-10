const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
require('dotenv').config();

// Function to check environment variables
function checkEnvironmentVariables() {
    const requiredVars = [
        { name: 'CLARIFAI_PAT', fallback: 'clarifai_api' },
        { name: 'USER_ID', fallback: 'CLARIFAI_USER_ID' },
        { name: 'APP_ID', fallback: 'CLARIFAI_APP_ID' }
    ];

    const results = {};
    const missing = [];

    for (const v of requiredVars) {
        const value = process.env[v.name] || process.env[v.fallback];
        if (!value) {
            missing.push(`${v.name} (or ${v.fallback})`);
        } else {
            results[v.name] = value.length > 4 ?
                `${value.substring(0, 2)}...${value.substring(value.length - 2)}` :
                '[too short]';
        }
    }

    return { results, missing };
}

// Function to test Clarifai authentication
async function testAuthentication() {
    const stub = ClarifaiStub.grpc();
    const metadata = new grpc.Metadata();
    const pat = (process.env.CLARIFAI_PAT || process.env.clarifai_api || '').trim();
    metadata.set('authorization', pat.startsWith('Key ') ? pat : `Key ${pat}`);

    const userId = process.env.USER_ID || process.env.CLARIFAI_USER_ID;
    const appId = process.env.APP_ID || process.env.CLARIFAI_APP_ID;

    return new Promise((resolve, reject) => {
        stub.ListModels(
            {
                user_app_id: {
                    user_id: userId,
                    app_id: appId
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
}

// Main execution
async function main() {
    console.log('Checking environment variables...');
    const { results, missing } = checkEnvironmentVariables();

    console.log('\nEnvironment Variables Status:');
    console.log('-----------------------------');
    for (const [key, value] of Object.entries(results)) {
        console.log(`${key}: ${value}`);
    }

    if (missing.length > 0) {
        console.error('\nMissing required environment variables:', missing.join(', '));
        process.exit(1);
    }

    console.log('\nTesting Clarifai Authentication...');
    try {
        const response = await testAuthentication();
        console.log('\nAuthentication Test Result:');
        console.log('-------------------------');
        console.log('Status Code:', response.status.code);
        console.log('Status Description:', response.status.description);
        console.log('\nAuthentication successful!');
    } catch (error) {
        console.error('\nAuthentication Test Failed:');
        console.error('-------------------------');
        console.error('Error:', error.message);
        console.error('Details:', error.details);
        process.exit(1);
    }
}

main().catch(console.error);
