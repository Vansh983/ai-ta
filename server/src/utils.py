import PyPDF2
import io
import logging
import hashlib
import re
from typing import BinaryIO, Dict, Optional

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

def hash_ip_address(ip_address: str, salt: str = "traffic_salt") -> str:
    """Hash IP address for privacy protection"""
    if not ip_address:
        return ""
    
    # Combine IP with salt and hash
    combined = f"{ip_address}{salt}"
    return hashlib.sha256(combined.encode()).hexdigest()

def parse_user_agent(user_agent: str) -> Dict[str, Optional[str]]:
    """Parse user agent string to extract device, browser, and OS information"""
    if not user_agent:
        return {
            'device_type': None,
            'browser': None,
            'os': None
        }
    
    user_agent_lower = user_agent.lower()
    
    # Determine device type
    device_type = 'desktop'
    if 'mobile' in user_agent_lower or 'phone' in user_agent_lower:
        device_type = 'mobile'
    elif 'tablet' in user_agent_lower or 'ipad' in user_agent_lower:
        device_type = 'tablet'
    
    # Determine browser
    browser = 'Unknown'
    if 'chrome' in user_agent_lower and 'edg' not in user_agent_lower:
        browser = 'Chrome'
    elif 'firefox' in user_agent_lower:
        browser = 'Firefox'
    elif 'safari' in user_agent_lower and 'chrome' not in user_agent_lower:
        browser = 'Safari'
    elif 'edg' in user_agent_lower:
        browser = 'Edge'
    elif 'opera' in user_agent_lower or 'opr' in user_agent_lower:
        browser = 'Opera'
    
    # Determine OS
    os = 'Unknown'
    if 'windows' in user_agent_lower:
        os = 'Windows'
    elif 'mac os' in user_agent_lower or 'macos' in user_agent_lower:
        os = 'macOS'
    elif 'linux' in user_agent_lower:
        os = 'Linux'
    elif 'android' in user_agent_lower:
        os = 'Android'
    elif 'ios' in user_agent_lower or 'iphone' in user_agent_lower or 'ipad' in user_agent_lower:
        os = 'iOS'
    
    return {
        'device_type': device_type,
        'browser': browser,
        'os': os
    }
