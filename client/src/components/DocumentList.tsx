import { useState, useEffect, useCallback } from 'react';
import { getCourseDocuments, deleteDocument, type Document } from '@/lib/firebase/firebase.utils';

interface DocumentListProps {
    courseId: string;
    userId: string;
    onDocumentDeleted?: () => void;
}

export default function DocumentList({ courseId, userId, onDocumentDeleted }: DocumentListProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadDocuments = useCallback(async () => {
        try {
            const docs = await getCourseDocuments(courseId, userId);
            setDocuments(docs);
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, [courseId, userId]);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    const handleDelete = async (documentId: string) => {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }

        setDeletingId(documentId);
        try {
            await deleteDocument(documentId, courseId, userId);
            await loadDocuments();
            onDocumentDeleted?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete document');
        } finally {
            setDeletingId(null);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) {
        return <div className="text-center py-4">Loading documents...</div>;
    }

    if (error) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded">
                {error}
            </div>
        );
    }

    if (documents.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No documents uploaded yet
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {documents.map((doc) => (
                <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
                >
                    <div className="flex-1 min-w-0 mr-4">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                            {doc.name}
                        </h3>
                        <div className="mt-1 flex items-center text-xs text-gray-500">
                            <span className="mr-2">{formatFileSize(doc.size)}</span>
                            <span>•</span>
                            <span className="ml-2">
                                {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Download
                        </a>
                        <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${deletingId === doc.id ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {deletingId === doc.id ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
} 