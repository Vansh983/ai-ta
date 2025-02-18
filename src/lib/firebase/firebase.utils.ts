import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    deleteDoc,
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

// Document Functions
export const uploadDocument = async (file: File, courseId: string, userId: string) => {
    const course = await getCourse(courseId);

    // Verify user has access to the course
    if (course.userId !== userId) {
        throw new Error('Unauthorized to upload to this course');
    }

    const timestamp = new Date();
    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storageRef = ref(storage, `documents/${courseId}/${safeFileName}`);

    // Upload file to Firebase Storage
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);

    // Create document reference in Firestore
    const documentRef = doc(collection(db, 'documents'));
    const document: Document = {
        id: documentRef.id,
        name: file.name,
        url: downloadUrl,
        courseId,
        type: file.type,
        createdAt: timestamp,
        updatedAt: timestamp,
        uploadedBy: userId,
        size: file.size,
    };

    await setDoc(documentRef, document);

    // Update course's documents array
    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, {
        documents: [...course.documents, document.id],
        updatedAt: timestamp,
    });

    return document;
};

export const getDocument = async (documentId: string) => {
    const documentRef = doc(db, 'documents', documentId);
    const documentSnap = await getDoc(documentRef);

    if (!documentSnap.exists()) {
        throw new Error('Document not found');
    }

    return documentSnap.data() as Document;
};

export const getCourseDocuments = async (courseId: string, userId: string) => {
    const course = await getCourse(courseId);

    // Verify user has access to the course
    if (course.userId !== userId) {
        throw new Error('Unauthorized to access course documents');
    }

    const documentsRef = collection(db, 'documents');
    const q = query(
        documentsRef,
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
    );
    const documentsSnap = await getDocs(q);
    return documentsSnap.docs.map(doc => doc.data() as Document);
};

export const deleteDocument = async (documentId: string, userId: string) => {
    const document = await getDocument(documentId);
    const course = await getCourse(document.courseId);

    // Verify user has access to delete the document
    if (course.userId !== userId) {
        throw new Error('Unauthorized to delete this document');
    }

    // Delete from Storage
    const storageRef = ref(storage, `documents/${document.courseId}/${document.name}`);
    await deleteObject(storageRef);

    // Delete from Firestore
    await deleteDoc(doc(db, 'documents', documentId));

    // Update course's documents array
    const courseRef = doc(db, 'courses', document.courseId);
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