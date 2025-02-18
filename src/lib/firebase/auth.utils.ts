import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User
} from 'firebase/auth';
import { auth } from './firebase.config';

const setSessionCookie = async (user: User) => {
    const idToken = await user.getIdToken();
    document.cookie = `session=${idToken}; path=/; max-age=3600; samesite=strict`;
};

const clearSessionCookie = () => {
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

export const signUp = async (email: string, password: string) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setSessionCookie(userCredential.user);
        return userCredential.user;
    } catch (error: any) {
        throw new Error(getAuthErrorMessage(error.code));
    }
};

export const signIn = async (email: string, password: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await setSessionCookie(userCredential.user);
        return userCredential.user;
    } catch (error: any) {
        throw new Error(getAuthErrorMessage(error.code));
    }
};

export const signOut = async () => {
    try {
        await firebaseSignOut(auth);
        clearSessionCookie();
    } catch (error: any) {
        throw new Error(getAuthErrorMessage(error.code));
    }
};

export const getCurrentUser = (): User | null => {
    return auth.currentUser;
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            await setSessionCookie(user);
        } else {
            clearSessionCookie();
        }
        callback(user);
    });
};

// Helper function to get user-friendly error messages
const getAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'This email is already registered';
        case 'auth/invalid-email':
            return 'Invalid email address';
        case 'auth/operation-not-allowed':
            return 'Email/password accounts are not enabled';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters';
        case 'auth/user-disabled':
            return 'This account has been disabled';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Invalid email or password';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later';
        default:
            return 'An error occurred. Please try again';
    }
}; 