"use client";

import * as React from "react";
import Link from "next/link";
import { Box, Container, Flex, Button, Text, Link as RadixLink } from "@radix-ui/themes";
import { useAuth } from "@/contexts/AuthContext";

export function MainNav() {
    const { user, userRole, signOut } = useAuth();

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Failed to sign out:', error);
        }
    };

    return (
        <Box asChild>
            <header>
                <Box py="4" style={{ borderBottom: "1px solid var(--gray-4)" }}>
                    <Container size="4">
                        <Flex justify="between" align="center">
                            <Link href="/" passHref legacyBehavior>
                                <RadixLink weight="bold" size="5">
                                    AI-TA
                                </RadixLink>
                            </Link>

                            {/* <Flex asChild gap="6">
                                <nav>
                                    {navItems.map((item) => (
                                        item && (
                                            <Link key={item.href} href={item.href} passHref legacyBehavior>
                                                <RadixLink
                                                    color={pathname === item.href ? "indigo" : "gray"}
                                                    weight="medium"
                                                    size="2"
                                                >
                                                    {item.label}
                                                </RadixLink>
                                            </Link>
                                        )
                                    ))}
                                </nav>
                            </Flex> */}

                            <Flex gap="3">
                                {user ? (
                                    <>
                                        <Text size="2" color="gray">
                                            {user.email} ({userRole})
                                        </Text>
                                        <Button variant="soft" color="gray" onClick={handleSignOut}>
                                            Sign Out
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/auth/signin" passHref>
                                            <Button variant="soft" color="gray">
                                                Sign In
                                            </Button>
                                        </Link>
                                        <Link href="/auth/signup" passHref>
                                            <Button>
                                                Sign Up
                                            </Button>
                                        </Link>
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