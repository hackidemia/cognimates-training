# Cognimates Training Platform

A platform where kids can train their own custom AI models for text and image classification using Google Cloud Platform's AutoML capabilities.

## Features

- Text classification model training and inference
- Image classification model training using labeled images
- User-friendly API for integrating with other applications
- Modern error handling and validation

## Architecture

The application follows a modular architecture:

- **Services**: Encapsulate all GCP API interactions
- **Controllers**: Handle HTTP requests and responses
- **Routes**: Define API endpoints and validation
- **Middleware**: Provide cross-cutting concerns (error handling, validation)

## Prerequisites

- Node.js 18.x or later
- Google Cloud Platform account with the following enabled:
  - Vertex AI API
  - Cloud Storage
- GCP Project with permissions to create:
  - Datasets
  - Training pipelines
  - Models and endpoints

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Required GCP Configuration
GCP_PROJECT_ID=your-gcp-project-id
GCP_REGION=us-central1
GCS_BUCKET_NAME=your-gcs-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/credentials.json

# Server Configuration (Optional)
PORT=2634  # Default if not specified
SERVER_PORT=2634  # Alternative to PORT

# SSL Configuration (Optional)
SSL_KEY_PATH=/path/to/ssl/key.pem
SSL_CERT_PATH=/path/to/ssl/cert.pem
```

## Setup and Installation

1. Clone the repository

```bash
git clone https://github.com/your-username/cognimates-training.git
cd cognimates-training
```

2. Install dependencies

```bash
npm install
```

3. Set up Google Cloud credentials
   - Create a service account with appropriate permissions in the Google Cloud Console
   - Download the JSON credentials file
   - Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of this file

4. Create a Cloud Storage bucket to store training data
   - Set the `GCS_BUCKET_NAME` environment variable to this bucket name

5. Start the server

```bash
npm start
```

## Development

- `npm run dev` - Start the server with Nodemon for automatic reloading
- `npm run sass-build` - Build the SCSS files
- `npm run lint` - Run ESLint on the source code
- `npm test` - Run the test suite

## API Usage

### Text Classification

#### Create a Classifier

```
POST /classify/text/create
Content-Type: application/json

{
  "classifier_name": "my-text-classifier"
}
```

#### Train a Classifier

```
POST /classify/text/{classifier_name}/train
Content-Type: application/json

{
  "training_data": {
    "positive": ["Great product", "Excellent service", "Highly recommend"],
    "negative": ["Poor quality", "Not satisfied", "Would not recommend"]
  }
}
```

#### Classify Text

```
POST /classify/text/{classifier_name}
Content-Type: application/json

{
  "phrase": "This is an amazing product"
}
```

### Image Classification

#### Train an Image Classifier

```
POST /classify/image/{classifier_name}/train
Content-Type: multipart/form-data

Form field: "images" (ZIP file with folders named by label)
```

The ZIP file structure should be:
```
training_images.zip
├── label1/
│   ├── image1.jpg
│   └── image2.png
└── label2/
    ├── image3.jpeg
    └── image4.jpg
```

#### Check Operation Status

```
GET /classify/text/operations/{operation_name}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
