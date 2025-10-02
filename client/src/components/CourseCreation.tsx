import { useState } from 'react';
import { apiService } from '@/lib/services/api';

interface CourseCreationProps {
    userId: string;
    onCourseCreated?: (courseId: string) => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const TERMS = ['Fall', 'Winter', 'Summer'] as const;

export default function CourseCreation({ userId, onCourseCreated }: CourseCreationProps) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [faculty, setFaculty] = useState('');
    const [term, setTerm] = useState<'Fall' | 'Winter' | 'Summer'>('Fall');
    const [year, setYear] = useState(CURRENT_YEAR);
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const course = await apiService.createCourse({
                name,
                code,
                term,
                year,
                description,
            });

            // Reset form
            setName('');
            setCode('');
            setFaculty('');
            setTerm('Fall');
            setYear(CURRENT_YEAR);
            setDescription('');
            onCourseCreated?.(course.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create course');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">Create New Course</h2>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                        Course Code
                    </label>
                    <input
                        type="text"
                        id="code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        pattern="[A-Za-z0-9-]+"
                        title="Only letters, numbers, and hyphens are allowed"
                        placeholder="e.g., CS101"
                    />
                </div>

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Course Name
                    </label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        placeholder="e.g., Introduction to Computer Science"
                    />
                </div>

                <div>
                    <label htmlFor="faculty" className="block text-sm font-medium text-gray-700">
                        Faculty
                    </label>
                    <input
                        type="text"
                        id="faculty"
                        value={faculty}
                        onChange={(e) => setFaculty(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        placeholder="e.g., Science"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="term" className="block text-sm font-medium text-gray-700">
                            Term
                        </label>
                        <select
                            id="term"
                            value={term}
                            onChange={(e) => setTerm(e.target.value as typeof TERMS[number])}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        >
                            {TERMS.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                            Year
                        </label>
                        <select
                            id="year"
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        >
                            {Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i).map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        placeholder="Course description..."
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                >
                    {loading ? 'Creating...' : 'Create Course'}
                </button>
            </form>
        </div>
    );
} 
