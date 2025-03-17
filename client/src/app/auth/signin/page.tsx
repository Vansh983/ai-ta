'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SignIn from '@/components/auth/SignIn';
import { Box, Text, Link as RadixLink } from '@radix-ui/themes';

export default function SignInPage() {
    const router = useRouter();

    return (
        <>
            <SignIn onSignIn={() => router.push('/')} />

            {/* <Box className="mt-6 text-center">
                <Text size="2" color="gray">
                    Don't have an account?{' '}
                    <Link href="/signup" passHref legacyBehavior>
                        <RadixLink>Sign up</RadixLink>
                    </Link>
                </Text>
            </Box> */}
        </>
    );
} 