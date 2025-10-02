"""
File operations for S3 storage
"""
import os
import io
import json
import mimetypes
from typing import BinaryIO, Dict, Any, List, Optional, Union
from uuid import UUID
from datetime import datetime, timezone, timedelta
from botocore.exceptions import ClientError
import logging

from .s3_client import s3_client
from ..utils import extract_text_from_pdf

logger = logging.getLogger(__name__)

class FileStorageService:
    def __init__(self):
        self.s3 = s3_client
        self.bucket_name = s3_client.bucket_name

    def upload_file(
        self, 
        file_data: Union[BinaryIO, bytes], 
        s3_key: str,
        content_type: str = None,
        metadata: Dict[str, str] = None
    ) -> bool:
        """Upload a file to S3"""
        try:
            extra_args = {}
            
            if content_type:
                extra_args['ContentType'] = content_type
            
            if metadata:
                extra_args['Metadata'] = metadata

            if isinstance(file_data, bytes):
                file_data = io.BytesIO(file_data)

            self.s3.client.upload_fileobj(
                file_data,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            
            logger.info(f"Successfully uploaded file to S3: {s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to upload file to S3 {s3_key}: {e}")
            return False

    def download_file(self, s3_key: str) -> Optional[bytes]:
        """Download a file from S3 as bytes"""
        try:
            response = self.s3.client.get_object(Bucket=self.bucket_name, Key=s3_key)
            return response['Body'].read()
        except ClientError as e:
            logger.error(f"Failed to download file from S3 {s3_key}: {e}")
            return None

    def download_file_stream(self, s3_key: str) -> Optional[BinaryIO]:
        """Download a file from S3 as a stream"""
        try:
            response = self.s3.client.get_object(Bucket=self.bucket_name, Key=s3_key)
            return response['Body']
        except ClientError as e:
            logger.error(f"Failed to download file stream from S3 {s3_key}: {e}")
            return None

    def delete_file(self, s3_key: str) -> bool:
        """Delete a file from S3"""
        try:
            self.s3.client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"Successfully deleted file from S3: {s3_key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete file from S3 {s3_key}: {e}")
            return False

    def file_exists(self, s3_key: str) -> bool:
        """Check if a file exists in S3"""
        try:
            self.s3.client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError:
            return False

    def get_file_metadata(self, s3_key: str) -> Optional[Dict[str, Any]]:
        """Get file metadata from S3"""
        try:
            response = self.s3.client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return {
                'size': response.get('ContentLength'),
                'last_modified': response.get('LastModified'),
                'content_type': response.get('ContentType'),
                'metadata': response.get('Metadata', {})
            }
        except ClientError as e:
            logger.error(f"Failed to get file metadata from S3 {s3_key}: {e}")
            return None

    def list_files(self, prefix: str = "", limit: int = 1000) -> List[Dict[str, Any]]:
        """List files in S3 with optional prefix filter"""
        try:
            response = self.s3.client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                MaxKeys=limit
            )
            
            files = []
            for obj in response.get('Contents', []):
                files.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'],
                    'etag': obj['ETag'].strip('"')
                })
            
            return files
        except ClientError as e:
            logger.error(f"Failed to list files from S3 with prefix {prefix}: {e}")
            return []

    def generate_presigned_url(
        self, 
        s3_key: str, 
        expiration: int = 3600,
        http_method: str = 'GET'
    ) -> Optional[str]:
        """Generate a presigned URL for file access"""
        try:
            url = self.s3.client.generate_presigned_url(
                'get_object' if http_method == 'GET' else 'put_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL for {s3_key}: {e}")
            return None

class CourseFileService(FileStorageService):
    """Service for handling course-specific file operations"""
    
    def upload_course_material(
        self, 
        course_id: UUID, 
        material_id: UUID,
        file_data: Union[BinaryIO, bytes],
        filename: str,
        content_type: str = None
    ) -> str:
        """Upload a course material file"""
        if content_type is None:
            content_type, _ = mimetypes.guess_type(filename)
        
        s3_key = f"courses/{course_id}/materials/{material_id}/{filename}"
        
        metadata = {
            'course_id': str(course_id),
            'material_id': str(material_id),
            'filename': filename,
            'uploaded_at': datetime.now(timezone.utc).isoformat()
        }
        
        success = self.upload_file(file_data, s3_key, content_type, metadata)
        return s3_key if success else None

    def get_course_files(self, course_id: UUID) -> List[str]:
        """Get all file keys for a course"""
        prefix = f"courses/{course_id}/materials/"
        files = self.list_files(prefix)
        return [file['key'] for file in files if not file['key'].endswith('/')]

    def download_and_extract_text(self, s3_key: str) -> Optional[str]:
        """Download file and extract text content"""
        try:
            file_data = self.download_file(s3_key)
            if not file_data:
                return None
            
            # Determine file type from S3 key
            file_ext = os.path.splitext(s3_key)[1].lower()
            
            if file_ext == '.pdf':
                # Extract text from PDF
                return extract_text_from_pdf(io.BytesIO(file_data))
            elif file_ext in ['.txt', '.md']:
                # Handle text files
                try:
                    return file_data.decode('utf-8')
                except UnicodeDecodeError:
                    # Try with different encoding
                    try:
                        return file_data.decode('latin-1')
                    except:
                        logger.error(f"Could not decode text file: {s3_key}")
                        return None
            else:
                logger.warning(f"Unsupported file type for text extraction: {file_ext}")
                return None
                
        except Exception as e:
            logger.error(f"Error extracting text from {s3_key}: {e}")
            return None

class ChatArchiveService(FileStorageService):
    """Service for handling chat archive operations"""
    
    def archive_chat_session(
        self, 
        session_id: UUID, 
        chat_data: Dict[str, Any]
    ) -> Optional[str]:
        """Archive a chat session to S3"""
        try:
            # Create archive key with date structure
            now = datetime.now(timezone.utc)
            s3_key = f"chat-archives/{now.year}/{now.month:02d}/{session_id}.json"
            
            # Add archive metadata
            archive_data = {
                'session_id': str(session_id),
                'archived_at': now.isoformat(),
                'data': chat_data
            }
            
            # Convert to JSON bytes
            json_data = json.dumps(archive_data, indent=2, default=str).encode('utf-8')
            
            success = self.upload_file(
                io.BytesIO(json_data),
                s3_key,
                'application/json',
                {'session_id': str(session_id), 'archived_at': now.isoformat()}
            )
            
            return s3_key if success else None
            
        except Exception as e:
            logger.error(f"Error archiving chat session {session_id}: {e}")
            return None

    def retrieve_archived_session(self, s3_key: str) -> Optional[Dict[str, Any]]:
        """Retrieve archived chat session"""
        try:
            json_data = self.download_file(s3_key)
            if json_data:
                return json.loads(json_data.decode('utf-8'))
            return None
        except Exception as e:
            logger.error(f"Error retrieving archived session {s3_key}: {e}")
            return None

# Global service instances
file_service = FileStorageService()
course_file_service = CourseFileService()
chat_archive_service = ChatArchiveService()