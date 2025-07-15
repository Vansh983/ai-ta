import { useState, useRef } from 'react';
import { uploadDocument } from '@/lib/firebase/firebase.utils';
import type { Document } from '@/lib/firebase/firebase.utils';

interface DocumentUploadProps {
    courseId: string | null;
    userId: string;
    onUploadComplete?: (document: Document | File) => void;
    isPending?: boolean;
}

export default function DocumentUpload({ courseId, userId, onUploadComplete, isPending }: DocumentUploadProps) {
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
                // Check if file is PDF
                if (file.type !== 'application/pdf') {
                    throw new Error('Only PDF files are allowed');
                }

                // Check file size (max 50MB)
                if (file.size > 50 * 1024 * 1024) {
                    throw new Error('File size must be less than 50MB');
                }

                if (isPending) {
                    // If pending, just pass the file back
                    onUploadComplete?.(file);
                } else if (courseId) {
                    // If we have a courseId, upload the document
                    const document = await uploadDocument(file, courseId, userId);
                    onUploadComplete?.(document);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload document');
            console.error('Error uploading document:', err);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="max-w-xl mx-auto">
            <div
                onDragEnter={handleDragIn}
                onDragLeave={handleDragOut}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center ${dragging
                        ? 'border-[#19C37D] bg-[#19C37D]/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
            >
                {error && (
                    <div className="mb-4 p-3 bg-red-900/50 text-red-200 rounded border border-red-800">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="text-gray-300">
                        {uploading ? (
                            <p>Uploading...</p>
                        ) : (
                            <>
                                <p className="text-lg font-medium">
                                    Drag and drop PDF files here
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
                                accept=".pdf,application/pdf"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#19C37D] hover:bg-[#15A36B] focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:ring-offset-2 focus:ring-offset-[#343541]"
                                disabled={uploading}
                            >
                                Select PDF Files
                            </button>
                        </div>
                    )}

                    <p className="text-xs text-gray-400">
                        Accepts multiple PDF files • Maximum file size: 50MB per file
                    </p>
                </div>
            </div>
        </div>
    );
} 