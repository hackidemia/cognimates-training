require('dotenv').config();
const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Function to test a PAT and extract user/app info
async function testPAT(pat) {
    const stub = ClarifaiStub.grpc();
    const metadata = new grpc.Metadata();
    metadata.set('authorization', pat.startsWith('Key ') ? pat : `Key ${pat}`);

    return new Promise((resolve, reject) => {
        // List apps to get user and app information
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
}

// Test all available PATs
async function main() {
    const pats = {
        'read_api': process.env.read_api,
        'write_api': process.env.write_api,
        'clarifai_api': process.env.clarifai_api,
        'new_clarifai_key': process.env.new_clarifai_key
    };

    console.log('Testing available PATs...\n');

    for (const [key, pat] of Object.entries(pats)) {
        if (!pat) {
            console.log(`${key}: Not set`);
            continue;
        }

        console.log(`Testing ${key}...`);
        try {
            const response = await testPAT(pat);
            if (response.apps && response.apps.length > 0) {
                const app = response.apps[0];
                console.log(`✓ Success with ${key}:`);
                console.log(`  User ID: ${app.user_id}`);
                console.log(`  App ID: ${app.id}`);

                // Update .env file with the successful values
                const fs = require('fs');
                const envPath = '.env';
                let envContent = '';

                try {
                    envContent = fs.readFileSync(envPath, 'utf8');
                } catch (err) {
                    // File doesn't exist, create it
                    envContent = '';
                }

                // Update or add environment variables
                const updates = {
                    'CLARIFAI_PAT': pat,
                    'USER_ID': app.user_id,
                    'APP_ID': app.id
                };

                for (const [envKey, envValue] of Object.entries(updates)) {
                    const regex = new RegExp(`^${envKey}=.*$`, 'm');
                    const newLine = `${envKey}=${envValue}`;

                    if (regex.test(envContent)) {
                        envContent = envContent.replace(regex, newLine);
                    } else {
                        envContent += envContent.endsWith('\n') ? newLine + '\n' : '\n' + newLine + '\n';
                    }
                }

                fs.writeFileSync(envPath, envContent);
                console.log('\nEnvironment variables updated successfully!');
                process.exit(0);
            }
        } catch (error) {
            console.log(`✗ Failed with ${key}: ${error.message}`);
        }
    }

    console.log('\nNo valid PATs found with app access. Please provide valid USER_ID and APP_ID.');
    process.exit(1);
}

main().catch(console.error);
