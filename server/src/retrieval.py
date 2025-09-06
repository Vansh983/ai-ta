import openai
import faiss
import numpy as np
from config.config import OPENAI_API_KEY
from typing import List

openai.api_key = OPENAI_API_KEY


def get_embedding(text: str, model: str = "text-embedding-3-large") -> List[float]:
    response = openai.Embedding.create(input=text, model=model)
    embedding = response["data"][0]["embedding"]
    return embedding


def retrieve(
    query: str, index: faiss.Index, chunks: List[str], k: int = 5
) -> List[str]:
    query_embedding = get_embedding(query)
    query_embedding_np = np.array([query_embedding]).astype("float32")
    distances, indices = index.search(query_embedding_np, k)
    retrieved_chunks = [chunks[i] for i in indices[0]]
    return retrieved_chunks
