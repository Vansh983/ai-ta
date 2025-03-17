export const tokens = {
    colors: {
        // Brand colors
        primary: {
            50: 'hsl(240, 100%, 97%)',
            100: 'hsl(240, 100%, 94%)',
            200: 'hsl(240, 95%, 86%)',
            300: 'hsl(240, 90%, 76%)',
            400: 'hsl(240, 85%, 66%)',
            500: 'hsl(240, 80%, 56%)', // Primary brand color
            600: 'hsl(240, 75%, 46%)',
            700: 'hsl(240, 70%, 36%)',
            800: 'hsl(240, 65%, 26%)',
            900: 'hsl(240, 60%, 16%)',
        },
        // Neutral colors
        gray: {
            50: 'hsl(0, 0%, 98%)',
            100: 'hsl(0, 0%, 96%)',
            200: 'hsl(0, 0%, 90%)',
            300: 'hsl(0, 0%, 83%)',
            400: 'hsl(0, 0%, 64%)',
            500: 'hsl(0, 0%, 45%)',
            600: 'hsl(0, 0%, 32%)',
            700: 'hsl(0, 0%, 25%)',
            800: 'hsl(0, 0%, 15%)',
            900: 'hsl(0, 0%, 9%)',
        },
        // Semantic colors
        success: 'hsl(142, 76%, 36%)',
        warning: 'hsl(38, 92%, 50%)',
        error: 'hsl(346, 87%, 46%)',
        info: 'hsl(206, 100%, 50%)',
    },
    spacing: {
        0: '0',
        1: '0.25rem', // 4px
        2: '0.5rem',  // 8px
        3: '0.75rem', // 12px
        4: '1rem',    // 16px
        5: '1.25rem', // 20px
        6: '1.5rem',  // 24px
        8: '2rem',    // 32px
        10: '2.5rem', // 40px
        12: '3rem',   // 48px
        16: '4rem',   // 64px
        20: '5rem',   // 80px
    },
    fontSizes: {
        xs: '0.75rem',    // 12px
        sm: '0.875rem',   // 14px
        base: '1rem',     // 16px
        lg: '1.125rem',   // 18px
        xl: '1.25rem',    // 20px
        '2xl': '1.5rem',  // 24px
        '3xl': '1.875rem',// 30px
        '4xl': '2.25rem', // 36px
        '5xl': '3rem',    // 48px
    },
    fontWeights: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },
    borderRadius: {
        none: '0',
        sm: '0.125rem',   // 2px
        base: '0.25rem',  // 4px
        md: '0.375rem',   // 6px
        lg: '0.5rem',     // 8px
        xl: '0.75rem',    // 12px
        '2xl': '1rem',    // 16px
        full: '9999px',
    },
    shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    },
    breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
    },
    zIndices: {
        base: 1,
        dropdown: 1000,
        sticky: 1100,
        modal: 1300,
        popover: 1400,
        tooltip: 1500,
    },
} as const;

// Type helpers
export type ColorToken = keyof typeof tokens.colors;
export type SpacingToken = keyof typeof tokens.spacing;
export type FontSizeToken = keyof typeof tokens.fontSizes;
export type BorderRadiusToken = keyof typeof tokens.borderRadius;
export type ShadowToken = keyof typeof tokens.shadows;
export type BreakpointToken = keyof typeof tokens.breakpoints;
export type ZIndexToken = keyof typeof tokens.zIndices;

// Helper functions
export const getColor = (color: ColorToken) => tokens.colors[color];
export const getSpacing = (space: SpacingToken) => tokens.spacing[space];
export const getFontSize = (size: FontSizeToken) => tokens.fontSizes[size];
export const getBorderRadius = (radius: BorderRadiusToken) => tokens.borderRadius[radius];
export const getShadow = (shadow: ShadowToken) => tokens.shadows[shadow];
export const getBreakpoint = (breakpoint: BreakpointToken) => tokens.breakpoints[breakpoint];
export const getZIndex = (zIndex: ZIndexToken) => tokens.zIndices[zIndex]; 