const axios = require('axios');

const uclassifyReadApiKey = process.env.UCLASSIFY_READ_API_KEY;
const uclassifyWriteApiKey = process.env.UCLASSIFY_WRITE_API_KEY;

if (!uclassifyReadApiKey || !uclassifyWriteApiKey) {
  console.error('uClassify API keys not found in environment variables');
  process.exit(1);
}

const writeHeaders = {
  'Content-Type': 'application/json',
  'Authorization': 
};

const readHeaders = {
  'Content-Type': 'application/json',
  'Authorization': 
};

async function testUClassifyAPI() {
  try {
    console.log('Testing uClassify API...');

    // Test creating a classifier
    const createUrl = 'https://api.uclassify.com/v1/me/test_classifier_2024/create';
    console.log('Creating classifier...');
    try {
      const createResponse = await axios.post(createUrl, {}, { headers: writeHeaders });
      console.log('Create classifier response:', createResponse.data);
    } catch (error) {
      console.error('Error creating classifier:', error.response ? error.response.data : error.message);
      console.error('Full error object:', JSON.stringify(error, null, 2));
    }

    // Test adding a class
    const addClassUrl = 'https://api.uclassify.com/v1/me/test_classifier_2024/addClass';
    const addClassData = { className: 'positive' };
    console.log('Adding class...');
    try {
      const addClassResponse = await axios.post(addClassUrl, addClassData, { headers: writeHeaders });
      console.log('Add class response:', addClassResponse.data);
    } catch (error) {
      console.error('Error adding class:', error.response ? error.response.data : error.message);
      console.error('Full error object:', JSON.stringify(error, null, 2));
    }

    // Test training the classifier
    const trainUrl = 'https://api.uclassify.com/v1/me/test_classifier_2024/train';
    const trainData = {
      texts: [
        { text: 'I am happy', className: 'positive' },
        { text: 'This is great', className: 'positive' }
      ]
    };
    console.log('Training classifier...');
    try {
      const trainResponse = await axios.post(trainUrl, trainData, { headers: writeHeaders });
      console.log('Train classifier response:', trainResponse.data);
    } catch (error) {
      console.error('Error training classifier:', error.response ? error.response.data : error.message);
      console.error('Full error object:', JSON.stringify(error, null, 2));
    }

    // Test classifying text
    const classifyUrl = 'https://api.uclassify.com/v1/me/test_classifier_2024/classify';
    const classifyData = {
      texts: ['I feel wonderful today']
    };
    console.log('Classifying text...');
    try {
      const classifyResponse = await axios.post(classifyUrl, classifyData, { headers: readHeaders });
      console.log('Classify text response:', classifyResponse.data);
    } catch (error) {
      console.error('Error classifying text:', error.response ? error.response.data : error.message);
      console.error('Full error object:', JSON.stringify(error, null, 2));
    }

    console.log('uClassify API tests completed.');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testUClassifyAPI();
