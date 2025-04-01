import firebase_admin
from firebase_admin import credentials, storage, firestore
import os
from dotenv import load_dotenv
from urllib.parse import unquote
import io
import PyPDF2

load_dotenv()

# Initialize Firebase Admin with service account
cred = credentials.Certificate(os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH"))
firebase_admin.initialize_app(
    cred,
    {
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET"),
    },
)

bucket = storage.bucket()
db = firestore.client()


def download_file_from_firebase(file_path: str) -> str:
    """
    Downloads a file from Firebase Storage and returns its content as text.
    For PDF files, extracts the text content.
    """
    blob = bucket.blob(file_path)

    if file_path.lower().endswith(".pdf"):
        # Download as bytes for PDF
        content_bytes = blob.download_as_bytes()
        # Create a PDF reader object
        pdf_file = io.BytesIO(content_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)

        # Extract text from all pages
        text_content = []
        for page in pdf_reader.pages:
            text_content.append(page.extract_text())

        return "\n\n".join(text_content)
    else:
        # For non-PDF files, download as text
        return blob.download_as_text()


def get_storage_path_from_url(url: str) -> str:
    """
    Extracts the clean storage path from a Firebase Storage URL
    Example input: https://firebasestorage.googleapis.com/v0/b/bucket/o/courses%2FcourseId%2Ffile.pdf?alt=media&token=xxx
    Example output: courses/courseId/file.pdf
    """
    try:
        # Remove the base URL and query parameters
        path = url.split("/o/")[1].split("?")[0]
        # URL decode the path
        path = unquote(path)
        return path
    except Exception as e:
        print(f"Error parsing URL {url}: {str(e)}")
        return ""


def get_course_files(courseId: str) -> list[str]:
    """
    Gets all files for a specific course directly from Firebase Storage
    by listing all blobs in the courses/{courseId}/ prefix
    """
    try:
        print(f"\n=== Starting file retrieval for course {courseId} ===")

        # List all files in the course directory
        prefix = f"courses/{courseId}/"
        blobs = bucket.list_blobs(prefix=prefix)

        # Get the full paths of all files
        storage_paths = []
        for blob in blobs:
            if blob.name != prefix:  # Skip the directory itself
                print(f"Found file: {blob.name}")
                storage_paths.append(blob.name)

        print(f"\n=== Completed file retrieval. Found {len(storage_paths)} files ===")
        return storage_paths

    except Exception as e:
        print(f"Critical error in get_course_files: {str(e)}")
        return []
