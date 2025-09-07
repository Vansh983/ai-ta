"""
S3 client configuration for LocalStack and AWS S3
"""
import os
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError, NoCredentialsError
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class S3Client:
    def __init__(self):
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "ai-ta-storage")
        self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.aws_region = os.getenv("AWS_DEFAULT_REGION", "ca-central-1")
        self.endpoint_url = os.getenv("AWS_ENDPOINT_URL")  # For LocalStack testing only
        
        # Validate required credentials
        if not self.aws_access_key_id or not self.aws_secret_access_key:
            logger.warning("AWS credentials not found in environment variables")
            # Don't raise an error here - let boto3 handle credential discovery
        
        self._client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize the S3 client"""
        try:
            # Configuration for AWS S3
            config = Config(
                signature_version='s3v4',
                # Remove LocalStack-specific addressing_style
            )
            
            # Only set endpoint_url if explicitly provided (for testing/LocalStack)
            client_kwargs = {
                'region_name': self.aws_region,
                'config': config
            }
            
            # Only set credentials if they are provided
            # This allows boto3 to use other credential sources (IAM roles, profile, etc.)
            if self.aws_access_key_id and self.aws_secret_access_key:
                client_kwargs['aws_access_key_id'] = self.aws_access_key_id
                client_kwargs['aws_secret_access_key'] = self.aws_secret_access_key
            
            # Only add endpoint_url if it's set (for LocalStack/testing)
            if self.endpoint_url:
                client_kwargs['endpoint_url'] = self.endpoint_url
                # Re-add path addressing for LocalStack if endpoint_url is set
                config = Config(
                    signature_version='s3v4',
                    s3={'addressing_style': 'path'}
                )
                client_kwargs['config'] = config
            
            self._client = boto3.client('s3', **client_kwargs)
            
            # Test connection and create bucket if it doesn't exist
            self._ensure_bucket_exists()
            logger.info(f"S3 client initialized successfully with bucket: {self.bucket_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            raise

    def _ensure_bucket_exists(self):
        """Ensure the bucket exists, create if not"""
        try:
            self._client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                # Bucket doesn't exist, create it
                try:
                    if self.aws_region == 'ca-central-1':
                        # For ca-central-1, don't specify location constraint
                        self._client.create_bucket(Bucket=self.bucket_name)
                    else:
                        self._client.create_bucket(
                            Bucket=self.bucket_name,
                            CreateBucketConfiguration={'LocationConstraint': self.aws_region}
                        )
                    logger.info(f"Created S3 bucket: {self.bucket_name}")
                except ClientError as create_error:
                    logger.error(f"Failed to create bucket {self.bucket_name}: {create_error}")
                    raise
            else:
                logger.error(f"Error checking bucket {self.bucket_name}: {e}")
                raise

    @property
    def client(self):
        """Get the S3 client instance"""
        if self._client is None:
            self._initialize_client()
        return self._client

    def health_check(self) -> bool:
        """Check if S3 service is accessible"""
        try:
            self._client.head_bucket(Bucket=self.bucket_name)
            return True
        except Exception as e:
            logger.error(f"S3 health check failed: {e}")
            return False

# Global S3 client instance
s3_client = S3Client()