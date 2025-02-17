import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { type ReactNode } from "react";

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    return (
        <Theme
            accentColor="indigo"
            grayColor="slate"
            radius="medium"
            scaling="100%"
            appearance="light"
            panelBackground="solid"
        >
            {children}
        </Theme>
    );
} 