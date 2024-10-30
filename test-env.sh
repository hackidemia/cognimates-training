#!/bin/bash

# Set environment variables for testing
export NODE_ENV=development
export SERVER_PORT=2634
export CLARIFAI_API_KEY="test_key"
export UCLASSIFY_READ_API_KEY=" NevFgk0ha0td"
export UCLASSIFY_WRITE_API_KEY="BES0gdWq3hYb"

# Start the application
echo "Starting application with test environment variables..."
npm run dev
