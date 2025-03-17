'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Box, Container, Flex, Text, DropdownMenu, Avatar } from "@radix-ui/themes";

export default function Navbar() {
    const { user, userRole, signOut, loading } = useAuth();

    const getDashboardLink = () => {
        if (userRole === 'instructor') return '/instructor';
        if (userRole === 'student') return '/student';
        return '/';
    };

    return (
        <Box asChild className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
            <header>
                <Box py="4">
                    <Container size="4" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                        <Flex justify="between" align="center">
                            {/* Left Column - Logo */}
                            <Link href="/" className="text-2xl font-bold text-primary transition-colors">
                                AI-TA
                            </Link>

                            {/* Right Column - Navigation & User */}
                            <Flex gap="6" align="center">
                                {/* <ThemeToggle /> */}

                                {!loading && (
                                    <>
                                        {user ? (
                                            <Flex gap="4" align="center">
                                                <Link
                                                    href={getDashboardLink()}
                                                    className="text-primary transition-colors font-medium"
                                                >
                                                    Dashboard
                                                </Link>

                                                <Box>
                                                    <DropdownMenu.Root>
                                                        <DropdownMenu.Trigger>
                                                            <button className="rounded-full hover:opacity-80 transition-opacity">
                                                                <Avatar
                                                                    size="3"
                                                                    src={user.photoURL || undefined}
                                                                    fallback={user.email?.[0].toUpperCase() || 'U'}
                                                                    radius="full"
                                                                    className="cursor-pointer"
                                                                />
                                                            </button>
                                                        </DropdownMenu.Trigger>

                                                        <DropdownMenu.Content align="end">
                                                            <DropdownMenu.Item>
                                                                <Text as="div" size="2" weight="bold">
                                                                    {user.email}
                                                                </Text>
                                                                <Text as="div" size="1" color="gray">
                                                                    Role: {userRole}
                                                                </Text>
                                                            </DropdownMenu.Item>
                                                            <DropdownMenu.Separator />
                                                            <DropdownMenu.Item
                                                                color="red"
                                                                onClick={signOut}
                                                            >
                                                                Sign out
                                                            </DropdownMenu.Item>
                                                        </DropdownMenu.Content>
                                                    </DropdownMenu.Root>
                                                </Box>
                                            </Flex>
                                        ) : (
                                            <Flex gap="4" align="center">
                                                <Link href="/auth/signin" className="text-foreground hover:text-primary transition-colors font-medium">
                                                    Sign In
                                                </Link>
                                                <Link
                                                    href="/auth/signup"
                                                    className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors font-medium"
                                                >
                                                    Sign Up
                                                </Link>
                                            </Flex>
                                        )}
                                    </>
                                )}
                            </Flex>
                        </Flex>
                    </Container>
                </Box>
            </header>
        </Box>
    );
} 