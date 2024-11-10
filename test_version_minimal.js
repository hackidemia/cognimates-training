const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const fs = require('fs');

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const CLARIFAI_API_KEY = process.env.CLARIFAI_API_KEY;
metadata.set('authorization', 'Key ' + CLARIFAI_API_KEY);

const MODEL_ID = 'catsdogstest';

async function testVersionCreation() {
    try {
        // Attempt to create a version with minimal configuration
        const versionRequest = {
            model_id: MODEL_ID,
            version: {
                template: 'MMClassification_ResNet_50_RSB_A1',
                output_info: {
                    data: {
                        concepts: [
                            { id: 'cats', name: 'cats' },
                            { id: 'dogs', name: 'dogs' }
                        ]
                    },
                    output_config: {
                        concepts_mutually_exclusive: true,
                        closed_environment: true
                    }
                },
                train_info: {
                    params: {
                        pretrained_weights: 'ImageNet-1k',
                        image_size: 224,
                        batch_size: 32,
                        num_epochs: 10,
                        flip_probability: 0.5,
                        flip_direction: 'horizontal'
                    }
                }
            }
        };

        console.log('Attempting to create version with request:', JSON.stringify(versionRequest, null, 2));

        const response = await new Promise((resolve, reject) => {
            stub.PostModelVersions(
                versionRequest,
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

        console.log('Version creation response:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.error('Error creating version:', error);
    }
}

testVersionCreation();
