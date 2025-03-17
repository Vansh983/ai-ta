import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase.config';
import { User } from 'firebase/auth';

// Define user roles
export type UserRole = 'student' | 'instructor' | 'admin';

// User interface for Firestore
export interface UserData {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Creates a new user document in Firestore
 */
export const createUserDocument = async (
    user: User,
    role: UserRole = 'student',
    additionalData: Record<string, any> = {}
): Promise<UserData> => {
    if (!user) throw new Error('No user provided');

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    // If user document doesn't exist, create it
    if (!userSnap.exists()) {
        const { email, displayName, photoURL } = user;
        const timestamp = new Date();

        const userData: UserData = {
            uid: user.uid,
            email: email || '',
            displayName: displayName || '',
            photoURL: photoURL || '',
            role,
            createdAt: timestamp,
            updatedAt: timestamp,
            ...additionalData
        };

        await setDoc(userRef, userData);
        return userData;
    }

    // Return existing user data
    return userSnap.data() as UserData;
};

/**
 * Gets user data from Firestore
 */
export const getUserData = async (uid: string): Promise<UserData | null> => {
    if (!uid) return null;

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return userSnap.data() as UserData;
    }

    return null;
};

/**
 * Updates user role in Firestore
 */
export const updateUserRole = async (uid: string, role: UserRole): Promise<void> => {
    if (!uid) throw new Error('No user ID provided');

    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        role,
        updatedAt: new Date()
    });
};

/**
 * Updates user data in Firestore
 */
export const updateUserData = async (
    uid: string,
    data: Partial<Omit<UserData, 'uid' | 'createdAt'>>
): Promise<void> => {
    if (!uid) throw new Error('No user ID provided');

    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        ...data,
        updatedAt: new Date()
    });
}; 