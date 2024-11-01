const axios = require('axios');

const readToken = " NevFgk0ha0td";
const writeToken = "BES0gdWq3hYb";
const base_url = "https://api.uclassify.com/v1/";

async function testUClassify() {
  try {
    // Create a classifier
    const classifierName = 'TestClassifier' + Date.now();
    const createUrl = base_url + "me/";
    await axios.post(createUrl, { classifierName }, {
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + writeToken }
    });
    console.log('Classifier created:', classifierName);

    // Add a class
    const addClass_url = base_url + "me/" + classifierName + "/addClass";
    await axios.post(addClass_url, { className: 'positive' }, {
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + writeToken }
    });
    console.log('Class added: positive');

    // Train the classifier
    const train_url = base_url + "me/" + classifierName + "/positive/train";
    await axios.post(train_url, { texts: ['great', 'awesome', 'fantastic'] }, {
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + writeToken }
    });
    console.log('Training examples added');

    // Classify text
    const classify_url = base_url + "me/" + classifierName + "/classify";
    const classificationResult = await axios.post(classify_url, { texts: ['This is amazing!'] }, {
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + readToken }
    });
    console.log('Classification result:', classificationResult.data);

    // Clean up
    const delete_url = base_url + "me/" + classifierName;
    await axios.delete(delete_url, {
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + writeToken }
    });
    console.log('Classifier deleted');

    console.log('uClassify API test completed successfully');
  } catch (error) {
    console.error('Error during uClassify API test:', error.response ? error.response.data : error.message);
  }
}

testUClassify();
