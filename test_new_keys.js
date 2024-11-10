const { ClarifaiStub, grpc } = require("clarifai-nodejs-grpc");
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();

// Test multiple potential keys
const keys = [
    process.env.read_api,
    process.env.write_api,
    process.env.clarifai_api,
    process.env.new_clarifai_key
];

async function testKey(key) {
    if (!key) {
        console.log("Skipping undefined key");
        return false;
    }

    metadata.set("authorization", `Key ${key}`);

    return new Promise((resolve) => {
        stub.ListApps(
            {},
            metadata,
            (err, response) => {
                if (err) {
                    console.log(`Key test failed: ${err.details}`);
                    resolve(false);
                } else {
                    console.log("Key test successful!");
                    console.log("Apps found:", response.apps.length);
                    resolve(true);
                }
            }
        );
    });
}

async function main() {
    console.log("Testing available keys...");

    for (const key of keys) {
        console.log("\nTesting key...");
        const success = await testKey(key);
        if (success) {
            console.log("Found working key!");
            // Update .env file with working key
            const fs = require('fs');
            const envPath = '/home/ubuntu/cognimates-training/.env';
            let envContent = fs.readFileSync(envPath, 'utf8');

            // Update or add CLARIFAI_PAT
            if (envContent.includes('CLARIFAI_PAT=')) {
                envContent = envContent.replace(/CLARIFAI_PAT=.*\n/, `CLARIFAI_PAT=${key}\n`);
            } else {
                envContent += `\nCLARIFAI_PAT=${key}`;
            }

            fs.writeFileSync(envPath, envContent);
            console.log("Updated .env file with working key");
            break;
        }
    }
}

main().catch(console.error);
