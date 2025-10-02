import { useState, useEffect, useCallback } from 'react';
import { apiService, type Material } from '@/lib/services/api';

interface DocumentListProps {
    courseId: string;
    userId: string;
    onDocumentDeleted?: () => void;
}

export default function DocumentList({ courseId, userId, onDocumentDeleted }: DocumentListProps) {
    const [documents, setDocuments] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadDocuments = useCallback(async () => {
        try {
            const docs = await apiService.getCourseMaterials(courseId);
            setDocuments(docs);
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    const handleDelete = async (documentId: string) => {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }

        setDeletingId(documentId);
        try {
            await apiService.deleteMaterial(documentId);
            await loadDocuments();
            onDocumentDeleted?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete document');
        } finally {
            setDeletingId(null);
        }
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
                            {doc.filename}
                        </h3>
                        <div className="mt-1 flex items-center text-xs text-gray-500">
                            <span className="mr-2">{doc.fileType}</span>
                            <span>•</span>
                            <span className="ml-2">
                                {new Date(doc.uploadedAt).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span className="ml-2">
                                {doc.processingStatus}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
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