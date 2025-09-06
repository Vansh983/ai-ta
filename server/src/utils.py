import PyPDF2
import io
import logging
from typing import BinaryIO

logger = logging.getLogger(__name__)

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50):
    tokens = text.split()
    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunk = " ".join(tokens[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

def extract_text_from_pdf(pdf_file: BinaryIO) -> str:
    """Extract text from a PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        
        for page_num, page in enumerate(pdf_reader.pages):
            try:
                page_text = page.extract_text()
                text += page_text + "\n"
            except Exception as e:
                logger.warning(f"Failed to extract text from page {page_num}: {e}")
                continue
        
        if not text.strip():
            raise ValueError("No text could be extracted from the PDF")
        
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")
