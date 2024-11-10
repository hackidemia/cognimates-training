require('dotenv').config();
const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Function to test if a string looks like a PAT
function looksLikePAT(str) {
    if (!str) return false;
    // PATs are typically long strings
    if (str.length < 32) return false;
    // Check if it's already prefixed with "Key"
    if (str.startsWith('Key ')) {
        str = str.substring(4);
    }
    // Basic format check - should be alphanumeric
    return /^[a-zA-Z0-9_-]+$/.test(str);
}

// Function to test PAT authentication
async function testPATAuth(pat) {
    const stub = ClarifaiStub.grpc();
    const metadata = new grpc.Metadata();
    const authValue = pat.startsWith('Key ') ? pat : `Key ${pat}`;
    metadata.set('authorization', authValue);

    return new Promise((resolve, reject) => {
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

async function main() {
    const secrets = {
        'clarifai_api': process.env.clarifai_api,
        'new_clarifai_key': process.env.new_clarifai_key
    };

    console.log('Examining Clarifai-related secrets...\n');

    for (const [name, value] of Object.entries(secrets)) {
        console.log(`\nChecking ${name}:`);
        if (!value) {
            console.log('  ✗ Not set');
            continue;
        }

        console.log(`  Value: ${value.substring(0, 4)}...${value.substring(value.length - 4)}`);
        console.log(`  Length: ${value.length} characters`);

        if (!looksLikePAT(value)) {
            console.log('  ✗ Does not match PAT format');
            continue;
        }

        console.log('  ✓ Matches PAT format');
        console.log('  Testing authentication...');

        try {
            const response = await testPATAuth(value);
            if (response.apps && response.apps.length > 0) {
                const app = response.apps[0];
                console.log('  ✓ Authentication successful!');
                console.log(`  User ID: ${app.user_id}`);
                console.log(`  App ID: ${app.id}`);

                // Update .env file with working credentials
                const fs = require('fs');
                const envPath = '.env';
                let envContent = '';

                try {
                    envContent = fs.readFileSync(envPath, 'utf8');
                } catch (err) {
                    envContent = '';
                }

                const updates = {
                    'CLARIFAI_PAT': value,
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
            console.log(`  ✗ Authentication failed: ${error.message}`);
        }
    }

    console.log('\nNo valid PATs found among available secrets.');
    process.exit(1);
}

main().catch(console.error);
