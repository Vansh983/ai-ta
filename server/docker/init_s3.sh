#!/bin/bash
# Initialize S3 buckets and folder structure in LocalStack

echo "Initializing S3 buckets..."

# Create the main bucket
awslocal s3 mb s3://ai-ta-storage

# Create folder structure by uploading empty objects (S3 doesn't have real folders)
echo "Creating folder structure..."

# Create folders using empty objects with trailing slash
awslocal s3api put-object --bucket ai-ta-storage --key courses/
awslocal s3api put-object --bucket ai-ta-storage --key chat-archives/
awslocal s3api put-object --bucket ai-ta-storage --key temp/
awslocal s3api put-object --bucket ai-ta-storage --key temp/uploads/

echo "S3 bucket initialization complete!"

# List buckets to verify
awslocal s3 ls

echo "Available buckets:"
awslocal s3 ls s3://ai-ta-storage --recursive