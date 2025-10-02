# AWS S3 Setup Guide

This guide explains how to set up AWS S3 for the AI Teaching Assistant application.

## Why AWS S3 Instead of LocalStack?

LocalStack has been removed from the project due to:

- File persistence issues causing documents to disappear
- Unreliable storage affecting the embedding pipeline
- Inconsistent behavior compared to real AWS S3

Real AWS S3 provides:

- Reliable file persistence
- Production-ready storage
- Minimal cost for development (~$0.01-0.50/month)
- Consistent behavior

## AWS S3 Setup Steps

### 1. Create an S3 Bucket

1. Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
2. Click "Create bucket"
3. Choose a unique bucket name (e.g., `ai-ta-storage-dev-yourname`)
4. Select your preferred region (default: `ca-central-1`)
5. Keep default settings and create the bucket

### 2. Create IAM User and Credentials

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Create user"
3. Username: `ai-ta-app-user`
4. Select "Programmatic access"
5. Attach existing policy: `AmazonS3FullAccess` (or create custom policy for your bucket)
6. Save the **Access Key ID** and **Secret Access Key**

### 3. Update Environment Variables

Update your `/server/.env` file:

```env
# AWS S3 Configuration (Real AWS S3)
# AWS_ENDPOINT_URL=  # Commented out to use real AWS S3
AWS_ACCESS_KEY_ID=your_actual_access_key_here
AWS_SECRET_ACCESS_KEY=your_actual_secret_key_here
AWS_DEFAULT_REGION=ca-central-1
S3_BUCKET_NAME=your-bucket-name-here
```

**Important**: Never commit real AWS credentials to version control!

### 4. Custom IAM Policy (Recommended)

For better security, create a custom policy instead of using `AmazonS3FullAccess`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AITABucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

## Testing the Setup

1. Start the server:

   ```bash
   docker-compose up -d postgres redis server
   ```

2. Upload a document through the API or frontend
3. Check the processing logs to verify successful upload and processing
4. Verify files are stored in your S3 bucket

## Cost Estimation

For development usage:

- Storage: ~$0.01-0.10/month (for a few MB of documents)
- Requests: ~$0.01-0.05/month (for development API calls)
- Total: Usually under $0.50/month

## Switching Back to LocalStack (Optional)

If needed, you can switch back to LocalStack by:

1. Uncommenting the LocalStack service in `docker-compose.yml`
2. Updating `.env` to use LocalStack endpoint:
   ```env
   AWS_ENDPOINT_URL=http://localhost:4566
   AWS_ACCESS_KEY_ID=localstack_access_key
   AWS_SECRET_ACCESS_KEY=localstack_secret_key
   S3_BUCKET_NAME=ai-ta-storage
   ```

However, this is not recommended due to the persistence issues mentioned above.
