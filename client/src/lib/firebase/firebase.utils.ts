import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    updateDoc,
    orderBy
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'firebase/storage';
import { db, storage } from './firebase.config';

export interface Course {
    id: string;
    name: string;
    code: string;
    faculty: string;
    term: 'Fall' | 'Winter' | 'Summer';
    year: number;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    documents: string[];
    userId: string;
}

export interface Document {
    id: string;
    name: string;
    url: string;
    courseId: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
    uploadedBy: string;  // ID of the user who uploaded the document
    size: number;  // File size in bytes
    storagePath?: string;
}

// Course Functions
export const createCourse = async (courseData: {
    name: string;
    code: string;
    faculty: string;
    term: 'Fall' | 'Winter' | 'Summer';
    year: number;
    description: string;
    userId: string;
}) => {
    // Check if course code already exists for the same year and term
    const existingCourse = await getCourseByCodeAndTerm(
        courseData.code,
        courseData.term,
        courseData.year
    );
    if (existingCourse) {
        throw new Error('Course already exists for this term and year');
    }

    const courseRef = doc(collection(db, 'courses'));
    const timestamp = new Date();

    const course: Course = {
        id: courseRef.id,
        ...courseData,
        documents: [],
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    await setDoc(courseRef, course);
    return course;
};

export const getCourseByCodeAndTerm = async (code: string, term: string, year: number) => {
    const coursesRef = collection(db, 'courses');
    const q = query(
        coursesRef,
        where('code', '==', code),
        where('term', '==', term),
        where('year', '==', year)
    );
    const courseSnap = await getDocs(q);

    if (courseSnap.empty) {
        return null;
    }

    return courseSnap.docs[0].data() as Course;
};

export const getCourseByCode = async (code: string) => {
    const coursesRef = collection(db, 'courses');
    const q = query(coursesRef, where('code', '==', code));
    const courseSnap = await getDocs(q);

    if (courseSnap.empty) {
        return null;
    }

    return courseSnap.docs[0].data() as Course;
};

export const getCourse = async (courseId: string) => {
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);

    if (!courseSnap.exists()) {
        throw new Error('Course not found');
    }

    return courseSnap.data() as Course;
};

export const getUserCourses = async (userId: string) => {
    const coursesRef = collection(db, 'courses');
    const q = query(
        coursesRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );
    const coursesSnap = await getDocs(q);
    return coursesSnap.docs.map(doc => doc.data() as Course);
};

export const updateCourse = async (courseId: string, courseData: {
    name: string;
    code: string;
    faculty: string;
    term: 'Fall' | 'Winter' | 'Summer';
    year: number;
    description: string;
    userId: string;
}) => {
    const courseRef = doc(db, 'courses', courseId);
    const timestamp = new Date();

    // Check if another course with the same code exists for the same term and year (excluding this course)
    const existingCourse = await getCourseByCodeAndTerm(
        courseData.code,
        courseData.term,
        courseData.year
    );
    if (existingCourse && existingCourse.id !== courseId) {
        throw new Error('Another course already exists with this code for the same term and year');
    }

    await updateDoc(courseRef, {
        ...courseData,
        updatedAt: timestamp
    });

    return {
        id: courseId,
        ...courseData,
        updatedAt: timestamp
    };
};

// Document Functions
export const uploadDocument = async (file: File, courseId: string, userId: string) => {
    const course = await getCourse(courseId);

    // Verify user has access to the course
    if (course.userId !== userId) {
        throw new Error('Unauthorized to upload to this course');
    }

    const timestamp = new Date();
    // Create a clean filename with timestamp to avoid collisions
    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    // Store files directly in courses bucket
    const storagePath = `courses/${courseId}/${safeFileName}`;
    const storageRef = ref(storage, storagePath);

    // Upload file to Firebase Storage
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);

    // Generate a unique ID for the document
    const documentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Update course's documents array with the new document
    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, {
        documents: [...course.documents, documentId],
        updatedAt: timestamp,
    });

    return {
        id: documentId,
        name: file.name,
        url: downloadUrl,
        courseId,
        type: file.type,
        createdAt: timestamp,
        updatedAt: timestamp,
        uploadedBy: userId,
        size: file.size,
        storagePath,
    };
};

export const getDocument = async (documentId: string, courseId: string) => {
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);

    if (!courseSnap.exists()) {
        throw new Error('Course not found');
    }

    const course = courseSnap.data() as Course;
    if (!course.documents.includes(documentId)) {
        throw new Error('Document not found in course');
    }

    // Return the document metadata from storage
    const storagePath = `courses/${courseId}/${documentId}`;
    const storageRef = ref(storage, storagePath);
    const url = await getDownloadURL(storageRef);

    return {
        id: documentId,
        name: documentId.split('-').slice(1).join('-'), // Extract original filename
        url,
        courseId,
        type: 'application/pdf',
        createdAt: new Date(parseInt(documentId.split('-')[0])),
        updatedAt: new Date(parseInt(documentId.split('-')[0])),
        uploadedBy: course.userId,
        size: 0, // Size information not available from storage directly
        storagePath,
    };
};

export const getCourseDocuments = async (courseId: string, userId: string) => {
    const course = await getCourse(courseId);

    // Verify user has access to the course
    if (course.userId !== userId) {
        throw new Error('Unauthorized to access course documents');
    }

    // Get all document IDs from the course
    const documentIds = course.documents || [];

    // Fetch all documents
    const documents = await Promise.all(
        documentIds.map(docId => getDocument(docId, courseId))
    );

    // Sort by creation date, newest first
    return documents.sort((a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime()
    );
};

export const deleteDocument = async (documentId: string, courseId: string, userId: string) => {
    const course = await getCourse(courseId);

    // Verify user has access to delete the document
    if (course.userId !== userId) {
        throw new Error('Unauthorized to delete this document');
    }

    // Delete from Storage
    const storagePath = `courses/${courseId}/${documentId}`;
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);

    // Update course's documents array
    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, {
        documents: course.documents.filter(id => id !== documentId),
        updatedAt: new Date(),
    });
};

// Add a new function to get courses by faculty
export const getCoursesByFaculty = async (faculty: string, userId: string) => {
    const coursesRef = collection(db, 'courses');
    const q = query(
        coursesRef,
        where('faculty', '==', faculty),
        where('userId', '==', userId),
        orderBy('year', 'desc'),
        orderBy('term', 'desc')
    );
    const coursesSnap = await getDocs(q);
    return coursesSnap.docs.map(doc => doc.data() as Course);
};

// Add a new function to get courses by term
export const getCoursesByTerm = async (term: string, year: number, userId: string) => {
    const coursesRef = collection(db, 'courses');
    const q = query(
        coursesRef,
        where('term', '==', term),
        where('year', '==', year),
        where('userId', '==', userId),
        orderBy('code', 'asc')
    );
    const coursesSnap = await getDocs(q);
    return coursesSnap.docs.map(doc => doc.data() as Course);
}; 