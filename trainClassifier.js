exports.trainClassifier = async (req, res) => {
    try {
        const { model_id, training_data } = req.body;
        if (!model_id || !training_data || !Array.isArray(training_data)) {
            throw new Error('Model ID and training data array are required');
        }

        console.log('Training classifier with model ID:', model_id);
        console.log('Number of training samples:', training_data.length);

        // Process each training data item and add inputs to the model
        const inputs = training_data.map(item => ({
            data: {
                image: {
                    base64: item.image.split(',')[1] // Remove the data:image/jpeg;base64, prefix
                },
                concepts: [{
                    id: item.concept.toLowerCase().replace(/\s+/g, '-'),
                    name: item.concept,
                    value: 1
                }]
            }
        }));

        // Add inputs to the model
        console.log('Adding inputs to model...');
        const addInputsResponse = await new Promise((resolve, reject) => {
            stub.PostInputs(
                {
                    inputs: inputs
                },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error adding inputs:', err);
                        reject(err);
                    } else {
                        resolve(response);
                    }
                }
            );
        });

        if (addInputsResponse.status.code !== 10000) {
            throw new Error('Add inputs failed, status: ' + addInputsResponse.status.description);
        }

        console.log('Inputs added successfully. Training model...');
        // Train the model
        const trainResponse = await new Promise((resolve, reject) => {
            stub.PostModelVersions(
                {
                    model_id: model_id
                },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error training model:', err);
                        reject(err);
                    } else {
                        resolve(response);
                    }
                }
            );
        });

        if (trainResponse.status.code !== 10000) {
            throw new Error('Train model failed, status: ' + trainResponse.status.description);
        }

        console.log('Model training initiated successfully');
        res.json({
            success: true,
            model_version: trainResponse.model_version
        });
    } catch (error) {
        console.error('Error training classifier:', error);
        res.status(500).json({ error: error.message });
    }
};
