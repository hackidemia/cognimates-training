const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const multer = require('multer');
const path = require('path');

// Initialize the gRPC client with PAT configuration
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const pat = (process.env.CLARIFAI_PAT || process.env.clarifai_api || '').trim();
metadata.set('authorization', pat.startsWith('Key ') ? pat : `Key ${pat}`);

// Default user and app configuration for Clarifai
const USER_ID = process.env.USER_ID || process.env.CLARIFAI_USER_ID;  // We'll use Clarifai's public user ID for now
const APP_ID = process.env.APP_ID || process.env.CLARIFAI_APP_ID;       // We'll use the main app for now

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
}).single('category-image');

exports.uploadFile = (req, res) => {
    upload(req, res, function(err) {
        if (err) {
            console.error('Error uploading file:', err);
            return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Convert file buffer to base64
        const base64Image = req.file.buffer.toString('base64');
        res.json({
            success: true,
            base64: `data:${req.file.mimetype};base64,${base64Image}`
        });
    });
};

exports.getClassifiers = async (req, res) => {
    try {
        const response = await new Promise((resolve, reject) => {
            stub.ListModels(
                {
                    user_app_id: {
                        user_id: USER_ID,
                        app_id: APP_ID
                    },
                    per_page: 100
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

        if (response.status.code !== 10000) {
            throw new Error('List models failed, status: ' + response.status.description);
        }

        const classifiers = response.models.map(model => ({
            id: model.id,
            name: model.name,
            created_at: model.created_at
        }));

        res.json(classifiers);
    } catch (error) {
        console.error('Error getting classifiers:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.classify = async (req, res) => {
    try {
        const { image_data, classifier_id } = req.body;
        if (!image_data) {
            throw new Error('No image data provided');
        }

        let imageInput;
        if (image_data.startsWith('data:image')) {
            // Handle base64 image data
            const base64Data = image_data.split(',')[1];
            imageInput = { base64: base64Data };
        } else {
            // Handle URL image data
            imageInput = { url: image_data };
        }

        const response = await new Promise((resolve, reject) => {
            stub.PostModelOutputs(
                {
                    user_app_id: {
                        user_id: USER_ID,
                        app_id: APP_ID
                    },
                    model_id: classifier_id || 'general-image-recognition',
                    inputs: [{ data: { image: imageInput } }]
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

        if (response.status.code !== 10000) {
            throw new Error('Post model outputs failed, status: ' + response.status.description);
        }

        const results = response.outputs[0].data.concepts.map(concept => ({
            class: concept.name,
            score: concept.value
        }));

        res.json(results);
    } catch (error) {
        console.error('Error classifying image:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.classifyURLImage = exports.classify;

exports.createClassifier = async (req, res) => {
    try {
        console.log('createClassifier called with body:', JSON.stringify(req.body, null, 2));
        const { name, concepts } = req.body;
        if (!name || !concepts || !Array.isArray(concepts) || concepts.length === 0) {
            throw new Error('Name and at least one concept are required');
        }

        const modelId = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        console.log('Creating classifier with model ID:', modelId);

        // First attempt to delete existing model if it exists
        try {
            console.log(`Attempting to delete existing model: ${modelId}`);
            await new Promise((resolve, reject) => {
                stub.DeleteModel(
                    {
                        user_app_id: {
                            user_id: USER_ID,
                            app_id: APP_ID
                        },
                        model_id: modelId
                    },
                    metadata,
                    (err, response) => {
                        if (err) {
                            console.warn('Warning during model deletion:', err);
                            resolve(); // Continue even if deletion fails
                        } else {
                            console.log('Existing model deleted:', JSON.stringify(response, null, 2));
                            resolve(response);
                        }
                    }
                );
            });

            // Wait for deletion to propagate
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (deleteError) {
            console.warn('Warning during model deletion:', deleteError);
            // Continue with model creation even if deletion fails
        }

        // Create model request with visual-classifier type
        const modelRequest = {
            user_app_id: {
                user_id: USER_ID,
                app_id: APP_ID
            },
            model: {
                id: modelId,
                name: name,
                model_type_id: "visual-classifier",
                model_version: {
                    id: `initial_${Date.now()}`,
                    output_info: {
                        data: {
                            concepts: concepts.map(concept => ({
                                id: concept.toLowerCase().replace(/[^a-z0-9]/g, ''),
                                name: concept,
                                value: 1
                            }))
                        },
                        output_config: {
                            concepts_mutually_exclusive: true,
                            closed_environment: true
                        }
                    }
                },
                output_info: {
                    data: {
                        concepts: concepts.map(concept => ({
                            id: concept.toLowerCase().replace(/[^a-z0-9]/g, ''),
                            name: concept,
                            value: 1
                        }))
                    },
                    output_config: {
                        concepts_mutually_exclusive: true,
                        closed_environment: true
                    }
                }
            }
        };

        console.log('Creating model with request:', JSON.stringify(modelRequest, null, 2));
        const response = await new Promise((resolve, reject) => {
            stub.PostModels(
                modelRequest,
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error creating model:', err);
                        reject(err);
                    } else {
                        console.log('Model created successfully:', JSON.stringify(response, null, 2));
                        // Verify model type
                        if (response.model && response.model.model_type_id !== "visual-classifier") {
                            console.error('Warning: Created model type does not match requested type:', response.model.model_type_id);
                        }
                        resolve(response);
                    }
                }
            );
        });

        if (response.status.code !== 10000) {
            throw new Error('Model creation failed: ' + response.status.description);
        }

        res.json({
            id: response.model.id,
            name: response.model.name,
            created_at: response.model.created_at
        });
    } catch (error) {
        console.error('Error in createClassifier:', error);
        res.status(500).json({ error: error.message });
    }
};
exports.trainClassifier = async (req, res) => {
    try {
        const { name, images } = req.body;
        if (!name || !images || !Array.isArray(images)) {
            throw new Error('Name and images array are required');
        }

        // Validate minimum number of images per category
        const categoryCounts = {};
        images.forEach(item => {
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        });

        const insufficientCategories = Object.entries(categoryCounts)
            .filter(([category, count]) => count < 10)
            .map(([category]) => category);

        if (insufficientCategories.length > 0) {
            throw new Error(`Insufficient images for categories: ${insufficientCategories.join(', ')}. Each category needs at least 10 images.`);
        }

        const modelId = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        console.log('Training classifier with model ID:', modelId);

        // Verify model exists and is ready
        console.log('Verifying model exists...');
        const modelResponse = await new Promise((resolve, reject) => {
            stub.GetModel(
                {
                    user_app_id: {
                        user_id: USER_ID,
                        app_id: APP_ID
                    },
                    model_id: modelId
                },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error getting model:', err);
                        reject(err);
                    } else {
                        console.log('Model verification response:', response);
                        resolve(response);
                    }
                }
            );
        });

        if (!modelResponse.model) {
            throw new Error('Model not found');
        }

        console.log('Model found, preparing training data...');

        // Process and validate inputs with improved error handling
        const inputs = await Promise.all(images.map(async (item, index) => {
            try {
                let base64Data;
                // Handle both prefixed and raw base64 data
                if (item.image.includes('base64,')) {
                    base64Data = item.image.split('base64,')[1];
                } else {
                    // More lenient base64 validation - just check for invalid characters
                    if (!/^[A-Za-z0-9+/=]+$/.test(item.image)) {
                        console.error(`Image ${index + 1} data validation failed:`, {
                            preview: item.image.substring(0, 100) + '...',
                            category: item.category
                        });
                        throw new Error(`Invalid base64 characters in image ${index + 1}`);
                    }
                    base64Data = item.image;
                }

                const input = {
                    data: {
                        image: {
                            base64: base64Data,
                            allow_duplicate_url: true
                        }
                    },
                    concepts: [{
                        id: item.category.toLowerCase().replace(/[^a-z0-9]/g, ''),
                        name: item.category,
                        value: 1
                    }]
                };

                console.log(`Prepared input ${index + 1}:`, {
                    category: item.category,
                    conceptId: input.concepts[0].id,
                    imageSize: base64Data.length
                });

                return input;
            } catch (error) {
                console.error(`Error processing image ${index + 1}:`, error);
                throw error;
            }
        }));

        console.log(`Adding ${inputs.length} inputs to model...`);

        // Add inputs to the model with detailed logging
        const addInputsResponse = await new Promise((resolve, reject) => {
            stub.PostInputs(
                {
                    user_app_id: {
                        user_id: USER_ID,
                        app_id: APP_ID
                    },
                    inputs: inputs
                },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error adding inputs. Details:', {
                            error: err.message,
                            code: err.code,
                            details: err.details,
                            inputCount: inputs.length,
                            modelId: modelId
                        });
                        reject(err);
                    } else {
                        console.log('Inputs added successfully:', {
                            status: response.status,
                            inputCount: inputs.length
                        });
                        resolve(response);
                    }
                }
            );
        });

        if (addInputsResponse.status.code !== 10000) {
            console.error('Add inputs failed:', {
                status: addInputsResponse.status,
                inputCount: inputs.length,
                modelId: modelId
            });
            throw new Error(`Failed to add inputs: ${addInputsResponse.status.description}`);
        }

        console.log('Inputs added successfully, waiting for processing...');
        // Wait longer for inputs to be processed - 30 seconds with status checks
        let processingAttempts = 0;
        const MAX_PROCESSING_ATTEMPTS = 6;
        const PROCESSING_DELAY = 5000;

        while (processingAttempts < MAX_PROCESSING_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
            console.log(`Checking input processing status (attempt ${processingAttempts + 1}/${MAX_PROCESSING_ATTEMPTS})...`);

            try {
                const inputsStatus = await new Promise((resolve, reject) => {
                    stub.ListInputs(
                        {
                            user_app_id: {
                                user_id: USER_ID,
                                app_id: APP_ID
                            },
                            page: 1,
                            per_page: 1
                        },
                        metadata,
                        (err, response) => {
                            if (err) reject(err);
                            else resolve(response);
                        }
                    );
                });

                if (inputsStatus.status.code === 10000) {
                    console.log('Inputs processed successfully');
                    break;
                }
            } catch (error) {
                console.warn(`Input status check failed (attempt ${processingAttempts + 1}):`, error);
            }

            processingAttempts++;
            if (processingAttempts === MAX_PROCESSING_ATTEMPTS) {
                console.warn('Max processing attempts reached, proceeding with training...');
            }
        }

        // Start model training with retries
        console.log('Starting model training...');
        let trainingAttempts = 0;
        const MAX_TRAINING_ATTEMPTS = 3;
        const TRAINING_RETRY_DELAY = 5000;
        let trainResponse;

        while (trainingAttempts < MAX_TRAINING_ATTEMPTS) {
            try {
                trainResponse = await new Promise((resolve, reject) => {
                    const simpleVersionId = `v${Date.now()}`;
                    console.log('Creating model version:', simpleVersionId);

                    stub.PostModelVersions(
                        {
                            user_app_id: {
                                user_id: USER_ID,
                                app_id: APP_ID
                            },
                            model_id: modelId,
                            version: {
                                id: simpleVersionId,
                                output_info: {
                                    data: {
                                        concepts: Object.keys(categoryCounts).map(category => ({
                                            id: category.toLowerCase().replace(/[^a-z0-9]/g, ''),
                                            name: category,
                                            value: 1
                                        }))
                                    },
                                    output_config: {
                                        concepts_mutually_exclusive: true,
                                        closed_environment: true
                                    }
                                },
                                train_info: {
                                    params: {
                                        template: 'classification_base_workflow',
                                        use_embeddings: true,
                                        epochs: 5,
                                        batch_size: 32,
                                        learning_rate: 0.001
                                    },
                                    dataset: {
                                        concepts: Object.keys(categoryCounts).map(category => ({
                                            id: category.toLowerCase().replace(/[^a-z0-9]/g, ''),
                                            name: category
                                        }))
                                    }
                                }
                            }
                        },
                        metadata,
                        (err, response) => {
                            if (err) {
                                console.error('Error starting training:', {
                                    error: err.message,
                                    code: err.code,
                                    details: err.details,
                                    modelId: modelId,
                                    attempt: trainingAttempts + 1
                                });
                                reject(err);
                            } else {
                                console.log('Training initiated:', {
                                    status: response.status,
                                    modelId: modelId,
                                    attempt: trainingAttempts + 1
                                });
                                resolve(response);
                            }
                        }
                    );
                });

                if (trainResponse.status.code === 10000) {
                    console.log('Training initiated successfully');
                    break;
                }
            } catch (error) {
                console.error(`Training attempt ${trainingAttempts + 1} failed:`, error);
                if (trainingAttempts < MAX_TRAINING_ATTEMPTS - 1) {
                    console.log(`Retrying in ${TRAINING_RETRY_DELAY/1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, TRAINING_RETRY_DELAY));
                }
            }
            trainingAttempts++;
        }

        if (!trainResponse || trainResponse.status.code !== 10000) {
            throw new Error('Failed to initiate training after multiple attempts');
        }

        res.json({
            success: true,
            message: 'Model training initiated successfully',
            model_id: modelId
        });
    } catch (error) {
        console.error('Error training classifier:', error);
        res.status(500).json({ error: error.message });
    }
};
