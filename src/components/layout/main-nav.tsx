"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Container, Flex, Button, Text, Link as RadixLink } from "@radix-ui/themes";

export function MainNav() {
    const pathname = usePathname();

    const navItems = [
        { href: "/", label: "Home" },
        { href: "/instructor", label: "Instructor Dashboard" },
        { href: "/student", label: "Student Dashboard" },
    ];

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

                            <Flex asChild gap="6">
                                <nav>
                                    {navItems.map((item) => (
                                        <Link key={item.href} href={item.href} passHref legacyBehavior>
                                            <RadixLink
                                                color={pathname === item.href ? "indigo" : "gray"}
                                                weight="medium"
                                                size="2"
                                            >
                                                {item.label}
                                            </RadixLink>
                                        </Link>
                                    ))}
                                </nav>
                            </Flex>

                            <Flex gap="3">
                                <Button variant="soft" color="gray">
                                    Sign In
                                </Button>
                                <Button>
                                    Sign Up
                                </Button>
                            </Flex>
                        </Flex>
                    </Container>
                </Box>
            </header>
        </Box>
    );
} 