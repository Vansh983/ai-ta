import openai
import faiss
import numpy as np
from utils import chunk_text
from config import OPENAI_API_KEY
from typing import List, Tuple

openai.api_key = OPENAI_API_KEY


def get_embedding(text: str, model: str = "text-embedding-3-large") -> List[float]:
    response = openai.Embedding.create(input=text, model=model)
    embedding = response["data"][0]["embedding"]
    return embedding


def ingest_document(doc_text: str) -> Tuple[faiss.Index, List[str]]:
    # Split the document into chunks
    chunks = chunk_text(doc_text)
    # Generate embeddings for each chunk
    embeddings = [get_embedding(chunk) for chunk in chunks]

    if not embeddings:
        raise ValueError("Could not generate embeddings for the document. It might be empty or unprocessable.")

    # Initialize FAISS index with the dimension from embeddings
    dimension = len(embeddings[0])
    index = faiss.IndexFlatL2(dimension)
    embeddings_np = np.array(embeddings).astype("float32")
    index.add(embeddings_np)
    return index, chunks
