const axios = require('axios');

const readToken = " NevFgk0ha0td";
const writeToken = "BES0gdWq3hYb";
const base_url = "https://api.uclassify.com/v1/";

async function checkUClassifyKeys() {
  try {
    // Check read key
    console.log('Checking read key...');
    const readResponse = await axios.get(base_url + 'me', {
      headers: { 'Authorization': 'Token ' + readToken }
    });
    console.log('Read key is valid. User info:', readResponse.data);

    // Check write key
    console.log('\nChecking write key...');
    const writeResponse = await axios.get(base_url + 'me', {
      headers: { 'Authorization': 'Token ' + writeToken }
    });
    console.log('Write key is valid. User info:', writeResponse.data);

    console.log('\nuClassify API keys are valid and working.');
  } catch (error) {
    console.error('Error checking uClassify API keys:', error.response ? error.response.data : error.message);
  }
}

checkUClassifyKeys();
