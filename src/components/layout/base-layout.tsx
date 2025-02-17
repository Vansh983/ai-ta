import { Box, Container, Flex, Text } from "@radix-ui/themes";
import { type ReactNode } from "react";
import { ThemeProvider } from "../providers/theme-provider";
import { MainNav } from "./main-nav";

interface BaseLayoutProps {
    children: ReactNode;
}

export function BaseLayout({ children }: BaseLayoutProps) {
    return (
        <ThemeProvider>
            <Flex direction="column" style={{ minHeight: "100vh" }}>
                <MainNav />
                <Box style={{ flex: 1 }}>
                    <Container size="4" py="6">
                        {children}
                    </Container>
                </Box>
                <Box py="6" style={{ backgroundColor: "var(--gray-2)", borderTop: "1px solid var(--gray-4)" }}>
                    <Container size="4">
                        <Flex justify="between" align="center">
                            <Text size="2" color="gray">
                                © 2024 Your Company. All rights reserved.
                            </Text>
                        </Flex>
                    </Container>
                </Box>
            </Flex>
        </ThemeProvider>
    );
} 