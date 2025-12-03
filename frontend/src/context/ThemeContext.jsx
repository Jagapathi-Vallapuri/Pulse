import React, { createContext, useContext, useEffect, useState } from 'react';
import { createTheme } from '@mui/material/styles';
import { alpha } from '@mui/material';

const ThemeContext = createContext(null);

const createCustomTheme = (mode) => {
    const isLight = mode === 'light';

    const primary = {
        main: '#6366f1', // Electric Indigo
        light: '#818cf8',
        dark: '#4f46e5',
        contrastText: '#ffffff'
    };
    const secondary = {
        main: isLight ? '#f50057' : '#ff4081',
        light: '#ff80ab',
        dark: '#c51162',
        contrastText: '#ffffff'
    };

    // Solid backgrounds - no transparency
    const bgDefault = isLight ? '#f8fafc' : '#0B0C10'; // Crisp Slate / Deep Void
    const bgPaper = isLight ? '#ffffff' : '#1F2833';   // White / Gunmetal

    const theme = createTheme({
        palette: {
            mode,
            primary,
            secondary,
            background: { default: bgDefault, paper: bgPaper },
            divider: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
            text: {
                primary: isLight ? '#1e293b' : '#e2e8f0',
                secondary: isLight ? '#64748b' : '#94a3b8',
                disabled: isLight ? '#94a3b8' : '#475569'
            },
        },
        shape: { borderRadius: 16 },
        typography: {
            fontFamily: "'Inter', 'Roboto', sans-serif",
            h1: { fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' },
            h2: { fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: '-0.01em' },
            h3: { fontFamily: "'Outfit', sans-serif", fontWeight: 600 },
            h4: { fontFamily: "'Outfit', sans-serif", fontWeight: 600 },
            h5: { fontFamily: "'Outfit', sans-serif", fontWeight: 600 },
            h6: { fontFamily: "'Outfit', sans-serif", fontWeight: 600 },
            button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' }
        },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        backgroundColor: bgPaper,
                        border: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
                        boxShadow: isLight ? '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)' : 'none',
                    }
                }
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        paddingTop: 8,
                        paddingBottom: 8,
                        textTransform: 'none',
                        fontWeight: 600,
                    },
                    containedPrimary: {
                        backgroundColor: primary.main,
                        boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)', // Indigo shadow
                        '&:hover': {
                            backgroundColor: primary.dark,
                            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.5)',
                            transform: 'translateY(-1px)'
                        }
                    }
                }
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: bgPaper, // Solid background
                        backgroundImage: 'none',
                        boxShadow: 'none',
                        borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
                        color: isLight ? '#1e293b' : '#e2e8f0'
                    }
                }
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundColor: bgPaper,
                        borderRadius: 16,
                        border: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
                        boxShadow: isLight ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none',
                        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: isLight
                                ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
                                : '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                        }
                    }
                }
            }
        }
    });

    return theme;
};

export const ThemeProvider = ({ children }) => {
    const [themeMode, setThemeMode] = useState('dark');

    useEffect(() => {
        const savedTheme = localStorage.getItem('themeMode');
        if (savedTheme) {
            setThemeMode(savedTheme);
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = themeMode === 'light' ? 'dark' : 'light';
        setThemeMode(newTheme);
        localStorage.setItem('themeMode', newTheme);
    };

    const theme = createCustomTheme(themeMode);

    return (
        <ThemeContext.Provider value={{ theme, themeMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;
