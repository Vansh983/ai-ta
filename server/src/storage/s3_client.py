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
        self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID", "test")
        self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY", "test")
        self.aws_region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
        self.endpoint_url = os.getenv("AWS_ENDPOINT_URL")  # For LocalStack
        
        self._client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize the S3 client"""
        try:
            # Configuration for LocalStack or AWS
            config = Config(
                signature_version='s3v4',
                s3={'addressing_style': 'path'}  # Required for LocalStack
            )
            
            self._client = boto3.client(
                's3',
                aws_access_key_id=self.aws_access_key_id,
                aws_secret_access_key=self.aws_secret_access_key,
                region_name=self.aws_region,
                endpoint_url=self.endpoint_url,
                config=config
            )
            
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
                    if self.aws_region == 'us-east-1':
                        # For us-east-1, don't specify location constraint
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