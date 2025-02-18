import { useState, useRef } from 'react';
import { uploadDocument } from '@/lib/firebase/firebase.utils';
import type { Document } from '@/lib/firebase/firebase.utils';

interface DocumentUploadProps {
    courseId: string;
    userId: string;
    onUploadComplete?: (document: Document) => void;
}

export default function DocumentUpload({ courseId, userId, onUploadComplete }: DocumentUploadProps) {
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragIn = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setDragging(true);
        }
    };

    const handleDragOut = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            await handleFiles(Array.from(files));
        }
    };

    const handleFiles = async (files: File[]) => {
        setError('');
        setUploading(true);

        try {
            for (const file of files) {
                // Check file size (max 50MB)
                if (file.size > 50 * 1024 * 1024) {
                    throw new Error('File size must be less than 50MB');
                }

                const document = await uploadDocument(file, courseId, userId);
                onUploadComplete?.(document);
            }

            // Clear the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto p-6">
            <div
                onDragEnter={handleDragIn}
                onDragLeave={handleDragOut}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center ${dragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-500'
                    }`}
            >
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="text-gray-600">
                        {uploading ? (
                            <p>Uploading...</p>
                        ) : (
                            <>
                                <p className="text-lg font-medium">
                                    Drag and drop your files here
                                </p>
                                <p className="text-sm">or</p>
                            </>
                        )}
                    </div>

                    {!uploading && (
                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileInput}
                                className="hidden"
                                multiple
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={uploading}
                            >
                                Select Files
                            </button>
                        </div>
                    )}

                    <p className="text-xs text-gray-500">
                        Maximum file size: 50MB
                    </p>
                </div>
            </div>
        </div>
    );
} 