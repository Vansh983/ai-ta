import { useState, useRef } from 'react';
import { apiService, type Material } from '@/lib/services/api';

interface DocumentUploadProps {
    courseId: string | null;
    userId: string;
    onUploadComplete?: (document: Material | File) => void;
    isPending?: boolean;
}

export default function DocumentUpload({ courseId, userId, onUploadComplete, isPending }: DocumentUploadProps) {
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelection(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log('handleFileInput called, event:', e);
        e.preventDefault();
        e.stopPropagation();
        const files = e.target.files;
        console.log('Files from input:', files);
        if (files) {
            console.log('Calling handleFileSelection with:', Array.from(files));
            handleFileSelection(Array.from(files));
        }
    };

    const handleFileSelection = (files: File[]) => {
        console.log('handleFileSelection called with files:', files);
        setError('');
        
        // Validate files before adding them
        const validFiles: File[] = [];
        
        for (const file of files) {
            console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);
            
            // Check if file is PDF
            if (file.type !== 'application/pdf') {
                console.log('File rejected - not PDF:', file.type);
                setError('Only PDF files are allowed');
                return;
            }

            // Check file size (max 50MB)
            if (file.size > 50 * 1024 * 1024) {
                console.log('File rejected - too large:', file.size);
                setError('File size must be less than 50MB');
                return;
            }

            validFiles.push(file);
        }

        console.log('Valid files:', validFiles);

        // Add valid files to selected files (avoiding duplicates)
        setSelectedFiles(prev => {
            const existing = prev.map(f => f.name);
            const newFiles = validFiles.filter(f => !existing.includes(f.name));
            const updated = [...prev, ...newFiles];
            console.log('Updated selected files:', updated);
            return updated;
        });
    };

    const removeFile = (fileName: string) => {
        setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;
        setError('');
        setUploading(true);

        try {
            console.log('Starting upload process for', selectedFiles.length, 'files');
            
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                console.log(`Uploading file ${i + 1}/${selectedFiles.length}:`, file.name);
                
                if (isPending) {
                    // If pending (course creation), just pass the file back
                    onUploadComplete?.(file);
                } else if (courseId) {
                    try {
                        // Upload the document to existing course
                        const uploadedDocument = await apiService.uploadMaterial(courseId, file);
                        console.log('Upload successful for:', file.name, uploadedDocument);
                        onUploadComplete?.(uploadedDocument);
                    } catch (uploadError) {
                        console.error('Failed to upload file:', file.name, uploadError);
                        throw new Error(`Failed to upload "${file.name}": ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
                    }
                } else {
                    throw new Error('No course ID provided for upload');
                }
            }
            
            // Clear selected files after successful upload
            setSelectedFiles([]);
            console.log('All files uploaded successfully');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to upload document(s)';
            setError(errorMessage);
            console.error('Error in upload process:', err);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    console.log('DocumentUpload render - selectedFiles:', selectedFiles, 'length:', selectedFiles.length);
    
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
                            <p>Uploading {selectedFiles.length} file(s)...</p>
                        ) : selectedFiles.length > 0 ? (
                            <p className="text-lg font-medium">
                                {selectedFiles.length} file(s) selected
                            </p>
                        ) : (
                            <>
                                <p className="text-lg font-medium">
                                    Drag and drop PDF files here
                                </p>
                                <p className="text-sm">or</p>
                            </>
                        )}
                    </div>

                    {!uploading && selectedFiles.length === 0 && (
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
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#19C37D] hover:bg-[#15A36B] focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:ring-offset-2 focus:ring-offset-[#343541]"
                            >
                                Select PDF Files
                            </button>
                        </div>
                    )}

                    {selectedFiles.length > 0 && !uploading && (
                        <div className="space-y-3">
                            {/* Selected files list */}
                            <div className="max-h-32 overflow-y-auto space-y-2">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded text-sm">
                                        <span className="text-gray-300 truncate">{file.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(file.name)}
                                            className="ml-2 text-red-400 hover:text-red-300"
                                            title="Remove file"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Action buttons */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleUpload}
                                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#19C37D] hover:bg-[#15A36B] focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:ring-offset-2 focus:ring-offset-[#343541]"
                                    disabled={uploading}
                                >
                                    Upload {selectedFiles.length} File(s)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    Add More
                                </button>
                            </div>
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