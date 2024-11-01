const axios = require('axios');

const writeToken = "BES0gdWq3hYb";
const base_url = "https://api.uclassify.com/v1/";

async function verifyUClassifyKeys() {
  try {
    // Attempt to create a classifier (valid operation for write key)
    console.log('Verifying write key by creating a test classifier...');
    const classifierName = 'TestClassifier' + Date.now();
    const createUrl = base_url + "me/";
    const response = await axios.post(createUrl, { classifierName }, {
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + writeToken }
    });
    console.log('Write key is valid. Classifier created:', classifierName);

    // Clean up by deleting the test classifier
    console.log('Cleaning up...');
    const deleteUrl = base_url + "me/" + classifierName;
    await axios.delete(deleteUrl, {
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + writeToken }
    });
    console.log('Test classifier deleted');

    console.log('uClassify write API key is valid and working.');
  } catch (error) {
    console.error('Error verifying uClassify API key:', error.response ? error.response.data : error.message);
  }
}

verifyUClassifyKeys();
