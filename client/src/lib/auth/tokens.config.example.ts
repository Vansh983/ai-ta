interface UserToken {
    token: string;
    userId: string;
    role: 'student' | 'instructor' | 'admin';
    email: string;
    displayName: string;
}

export const userTokens: UserToken[] = [
    // Example tokens - replace with your own
    {
        token: 'student-token-1',
        userId: 'student1',
        role: 'student',
        email: 'student1@example.com',
        displayName: 'Student One'
    },
    {
        token: 'instructor-token-1',
        userId: 'instructor1',
        role: 'instructor',
        email: 'instructor1@example.com',
        displayName: 'Instructor One'
    }
]; 