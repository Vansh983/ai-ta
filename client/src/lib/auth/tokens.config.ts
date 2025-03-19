interface UserToken {
    token: string;
    userId: string;
    role: 'student' | 'instructor' | 'admin';
    email: string;
    displayName: string;
}

export const userTokens: UserToken[] = [
    {
        token: process.env.NEXT_PUBLIC_STU_1_TOKEN || '',
        userId: process.env.NEXT_PUBLIC_STU_1_USER_ID || '',
        role: process.env.NEXT_PUBLIC_STU_1_ROLE as 'student' || '',
        email: process.env.NEXT_PUBLIC_STU_1_EMAIL || '',
        displayName: process.env.NEXT_PUBLIC_STU_1_DISPLAY_NAME || ''
    },
    {
        token: process.env.NEXT_PUBLIC_INST_1_TOKEN || '',
        userId: process.env.NEXT_PUBLIC_INST_1_USER_ID || '',
        role: process.env.NEXT_PUBLIC_INST_1_ROLE as 'instructor' || '',
        email: process.env.NEXT_PUBLIC_INST_1_EMAIL || '',
        displayName: process.env.NEXT_PUBLIC_INST_1_DISPLAY_NAME || ''
    }
]; 