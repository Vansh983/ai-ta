'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SignUp from '@/components/auth/SignUp';
import { Box, Container, Text, Link as RadixLink } from '@radix-ui/themes';

export default function SignUpPage() {
    const router = useRouter();

    return (
        <Container size="2" className="py-10">
            <Text size="6" color="green">Contact me at vanshsood@dal.ca for access to the platform</Text>
            {/* <SignUp onSignUp={() => router.push('/')} />

            <Box className="mt-6 text-center">
                <Text size="2" color="gray">
                    Already have an account?{' '}
                    <Link href="/auth/signin" passHref legacyBehavior>
                        <RadixLink>Sign in</RadixLink>
                    </Link>
                </Text>
            </Box> */}
        </Container>
    );
} 