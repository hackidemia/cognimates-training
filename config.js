module.exports = {
  SERVER_PORT: process.env.PORT || 3000,
  mongooseURL: process.env.MONGODB_URI || 'mongodb://localhost:27017/cognimates',
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
  GCP_LOCATION: process.env.GCP_LOCATION || 'us-central1',
  GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS
}
