const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const dotenv = require('dotenv');
dotenv.config();

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const pat = (process.env.CLARIFAI_PAT || '').trim();
metadata.set('authorization', `Key ${pat}`);

async function checkPATScopes() {
    return new Promise((resolve, reject) => {
        stub.MyScopes(
            {},
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

async function main() {
    try {
        await checkPATScopes();
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    }
}

main();
