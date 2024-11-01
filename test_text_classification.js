const axios = require('axios');
const textController = require('./controllers/text');

// Set up environment variables
process.env.UCLASSIFY_READ_API_KEY = " NevFgk0ha0td";
process.env.UCLASSIFY_WRITE_API_KEY = "BES0gdWq3hYb";

async function testTextClassification() {
  try {
    // Create a classifier
    const classifierName = 'TestClassifier' + Date.now();
    await new Promise((resolve) => textController.createClassifier({ body: { classifier_name: classifierName } }, { json: resolve }));
    console.log('Classifier created:', classifierName);

    // Add classes
    await new Promise((resolve) => textController.createClass({ body: { classifier_name: classifierName, class_name: 'positive' } }, { json: resolve }));
    await new Promise((resolve) => textController.createClass({ body: { classifier_name: classifierName, class_name: 'negative' } }, { json: resolve }));
    console.log('Classes added: positive, negative');

    // Train the classifier
    await new Promise((resolve) => textController.addExamples({ body: { classifier_name: classifierName, class_name: 'positive', texts: ['great', 'awesome', 'fantastic'] } }, { json: resolve }));
    await new Promise((resolve) => textController.addExamples({ body: { classifier_name: classifierName, class_name: 'negative', texts: ['terrible', 'awful', 'horrible'] } }, { json: resolve }));
    console.log('Training examples added');

    // Classify text
    const classificationResult = await new Promise((resolve) => {
      textController.classifyText({ body: { classifier_id: classifierName, phrase: 'This is amazing!' } }, { json: resolve });
    });
    console.log('Classification result:', classificationResult);

    // Clean up
    await new Promise((resolve) => textController.deleteClassifier({ body: { classifier_id: classifierName } }, { json: resolve }));
    console.log('Classifier deleted');

    console.log('Text classification test completed successfully');
  } catch (error) {
    console.error('Error during text classification test:', error.message);
  }
}

testTextClassification();
