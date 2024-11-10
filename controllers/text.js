const axios = require('axios');

const uclassifyReadApiKey = process.env.UCLASSIFY_READ_API_KEY;
const uclassifyWriteApiKey = process.env.UCLASSIFY_WRITE_API_KEY;

if (!uclassifyReadApiKey || !uclassifyWriteApiKey) {
  console.warn('Warning: uClassify API keys not found in environment variables');
}

exports.trainAll = async function(req, res) {
  try {
    const classifierName = req.body.classifier_name;
    const trainingData = req.body.training_data;

    if (!classifierName || !trainingData) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Validate classifier name format
    if (!/^[a-zA-Z0-9_-]+$/.test(classifierName)) {
      return res.status(400).json({ error: 'Classifier name must contain only letters, numbers, underscores and hyphens' });
    }

    console.log('Training classifier:', classifierName);
    console.log('Training data:', trainingData);

    // Train the classifier directly - uClassify creates the classifier automatically
    const trainUrl = `https://api.uclassify.com/v1/uclassify/${classifierName}/train`;
    console.log('Training classifier at:', trainUrl);

    // Convert training data from {category: [texts]} format to uClassify format
    const texts = [];
    Object.entries(trainingData).forEach(([className, examples]) => {
      if (!Array.isArray(examples)) {
        throw new Error(`Training data for class ${className} must be an array`);
      }
      examples.forEach(text => {
        if (typeof text !== 'string' || !text.trim()) {
          throw new Error(`Invalid training example in class ${className}: ${text}`);
        }
        texts.push({
          text: text.trim(),
          className: className
        });
      });
    });

    if (texts.length === 0) {
      return res.status(400).json({ error: 'No valid training examples provided' });
    }

    const trainData = { texts };

    console.log('Sending training data:', JSON.stringify(trainData, null, 2));

    // First create the classifier if it doesn't exist
    try {
      const createUrl = `https://api.uclassify.com/v1/uclassify/${classifierName}/create`;
      await axios.post(createUrl, {}, {
        headers: {
          'Authorization': `Token ${uclassifyWriteApiKey}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (createError) {
      // Ignore 409 Conflict error which means classifier already exists
      if (createError.response?.status !== 409) {
        throw createError;
      }
    }

    // Then train the classifier
    const trainResponse = await axios.post(trainUrl, trainData, {
      headers: {
        'Authorization': `Token ${uclassifyWriteApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Training response:', trainResponse.data);
    res.json({ message: 'Classifier trained successfully', data: trainResponse.data });
  } catch (error) {
    console.error('Training error:', error.response ? {
      status: error.response.status,
      data: error.response.data,
      url: error.response.config?.url,
      method: error.response.config?.method,
      headers: error.response.config?.headers
    } : error.message);

    res.status(error.response?.status || 500).json({
      error: 'Training failed',
      details: error.response ? error.response.data : error.message
    });
  }
};

exports.classify = async function(req, res) {
  try {
    const classifierName = req.body.classifier_name;
    const text = req.body.text;

    if (!classifierName || !text) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('Classifying text for classifier:', classifierName);
    console.log('Text to classify:', text);

    const url = `https://api.uclassify.com/v1/uclassify/${classifierName}/classify`;
    const data = {
      texts: [text]
    };

    console.log('Making classification request to:', url);
    console.log('With data:', JSON.stringify(data, null, 2));

    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Token ${uclassifyReadApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Classification response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Classification error:', error.response ? {
      status: error.response.status,
      data: error.response.data,
      url: error.response.config?.url,
      method: error.response.config?.method,
      headers: error.response.config?.headers
    } : error.message);

    res.status(error.response?.status || 500).json({
      error: 'Classification failed',
      details: error.response ? error.response.data : error.message
    });
  }
};
