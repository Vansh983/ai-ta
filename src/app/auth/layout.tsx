'use client';

import { Inter } from "next/font/google";
import { Box, Container } from "@radix-ui/themes";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider>
            <Box className={inter.className} style={{ minHeight: "100vh" }}>
                <Container size="4" py="6">
                    {children}
                </Container>
            </Box>
        </ThemeProvider>
    );
} 