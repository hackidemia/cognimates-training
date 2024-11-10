require('dotenv').config();
const axios = require('axios');

const uclassifyReadApiKey = process.env.UCLASSIFY_READ_API_KEY;
const uclassifyWriteApiKey = process.env.UCLASSIFY_WRITE_API_KEY;

if (!uclassifyReadApiKey || !uclassifyWriteApiKey) {
  console.error('uClassify API keys not found in environment variables');
  process.exit(1);
}

async function verifyApiKeys() {
  try {
    console.log('Verifying uClassify API keys...');

    // Test read key
    const readUrl = 'https://api.uclassify.com/v1/uclassify/sentiment/classify';
    const readData = { texts: ['This is a test'] };
    const readResponse = await axios.post(readUrl, readData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${uclassifyReadApiKey}`
      }
    });
    console.log('Read key test successful:', readResponse.data);

    // Test write key
    const writeUrl = 'https://api.uclassify.com/v1/me/test_classifier/create';
    const writeResponse = await axios.post(writeUrl, {}, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${uclassifyWriteApiKey}`
      }
    });
    console.log('Write key test successful:', writeResponse.data);

    console.log('Both API keys are valid and working.');
  } catch (error) {
    console.error('Error verifying API keys:', error.response ? error.response.data : error.message);
  }
}

verifyApiKeys();
