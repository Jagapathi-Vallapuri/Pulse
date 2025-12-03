import React, { useEffect, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Avatar, TextField, InputAdornment, ButtonBase, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Header = ({ title = 'Pulse' }) => {
    const auth = useAuth();
    const { themeMode, toggleTheme } = useTheme();

    const [avatarUrl, setAvatarUrl] = useState(null);
    useEffect(() => {
        let active = true;
        const fetchAvatar = async () => {
            if (auth?.isAuthenticated && auth.user?.avatarFilename) {
                try {
                    const baseApi = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${baseApi}/users/me/avatar?cacheBust=${auth.user.avatarFilename}`, {
                        headers: { Authorization: token ? `Bearer ${token}` : undefined }
                    });
                    if (res.ok) {
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        if (active) {
                            setAvatarUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
                        } else {
                            URL.revokeObjectURL(url);
                        }
                    } else {
                        setAvatarUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
                    }
                } catch (_) {
                    setAvatarUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
                }
            } else {
                setAvatarUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
            }
        };
        fetchAvatar();
        return () => { active = false; setAvatarUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; }); };
    }, [auth?.user?.avatarFilename, auth?.isAuthenticated]);

    return (
        <AppBar position="sticky" color="default" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64 }}>
                <Box component={RouterLink} to="/home" sx={{ display: 'flex', alignItems: 'center', color: 'primary.main', textDecoration: 'none', gap: 1 }}>
                    <MusicNoteIcon fontSize="large" />
                    <Typography variant="h5" component="div" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: 'text.primary' }}>{title}</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <IconButton color="inherit" onClick={toggleTheme} aria-label="toggle theme" sx={{ color: 'text.secondary' }}>
                        {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>

                    {auth && auth.isAuthenticated ? (
                        <>
                            <Box component="form" onSubmit={(e) => {
                                e.preventDefault();
                                const data = new FormData(e.currentTarget);
                                const q = (data.get('q') || '').toString().trim();
                                if (!q) return;
                                window.location.href = `/search?q=${encodeURIComponent(q)}`;
                            }} sx={{ mx: 2, display: { xs: 'none', sm: 'block' } }}>
                                <TextField
                                    name="q"
                                    size="small"
                                    placeholder="Search..."
                                    InputProps={{
                                        sx: {
                                            bgcolor: 'action.hover',
                                            borderRadius: 3,
                                            minWidth: 240,
                                            '& fieldset': { border: 'none' },
                                            '&:hover': { bgcolor: 'action.selected' }
                                        },
                                        endAdornment: <InputAdornment position="end" sx={{ color: 'text.disabled' }}>↵</InputAdornment>
                                    }}
                                />
                            </Box>
                            <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
                                <Button color="inherit" component={RouterLink} to="/home" sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}>Home</Button>
                                <Button color="inherit" component={RouterLink} to="/albums" sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}>Albums</Button>
                                <Button color="inherit" component={RouterLink} to="/playlists" sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}>Playlists</Button>
                                <Button color="inherit" component={RouterLink} to="/upload" sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}>Upload</Button>
                            </Stack>

                            <ButtonBase component={RouterLink} to="/profile" sx={{
                                display: 'flex',
                                alignItems: 'center',
                                textDecoration: 'none',
                                color: 'text.primary',
                                ml: 1,
                                p: 0.5,
                                pr: 2,
                                borderRadius: 4,
                                transition: 'background-color 0.2s',
                                '&:hover': { bgcolor: 'action.hover' }
                            }}>
                                <Avatar
                                    alt={auth.user?.username}
                                    src={avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(auth.user?.username || 'User')}`}
                                    sx={{ width: 32, height: 32, mr: 1, border: (theme) => `2px solid ${theme.palette.background.paper}` }}
                                />
                                <Typography component="span" className="username" sx={{ fontWeight: 600, fontSize: '0.9rem', display: { xs: 'none', sm: 'block' } }}>
                                    {auth.user?.username || 'User'}
                                </Typography>
                            </ButtonBase>
                            <Button color="inherit" onClick={auth.logout} sx={{ ml: 1, color: 'text.secondary' }}>Logout</Button>
                        </>
                    ) : (
                        <Button variant="contained" color="primary" href="/" sx={{ borderRadius: 4, px: 3 }}>Sign In</Button>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;
