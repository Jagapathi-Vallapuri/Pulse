import React, { useEffect, useState } from 'react';
import { Avatar, Box, Container, Paper, Stack, Typography, Divider, Button, TextField, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import api, { getMe, updateAbout, uploadAvatar, deleteAvatar, getFavorites as apiGetFavorites, getHistory as apiGetHistory } from '../../client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PhotoCamera, Edit, Save, Cancel } from '@mui/icons-material';
import { useUI } from '../context/UIContext.jsx';

const placeholderAbout = `Music enthusiast. Curator of eclectic playlists. Exploring independent artists and immersive soundscapes.`;

const defaultMetrics = [
    { label: 'Playlists', value: 0 },
    { label: 'Favorites', value: 0 },
    { label: 'Hours Listened', value: 0 },
    { label: 'Uploads', value: 0 }
];

const UserProfile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const { updateUser } = useAuth();
    const [aboutEdit, setAboutEdit] = useState(false);
    const [aboutValue, setAboutValue] = useState('');
    const [aboutSaving, setAboutSaving] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const { toastSuccess, toastError } = useUI();
    const [metrics, setMetrics] = useState(defaultMetrics);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getMe();
                if (!cancelled) {
                    setProfile(data);
                    setAboutValue(data?.about || '');
                }
                // Load metrics in parallel
                const [plRes, favIds, history, mySongsRes] = await Promise.allSettled([
                    api.get('/users/playlists'),
                    apiGetFavorites(),
                    apiGetHistory(),
                    api.get('/songs'),
                ]);
                if (!cancelled) {
                    const playlistsCount = plRes.status === 'fulfilled' ? (Array.isArray(plRes.value.data) ? plRes.value.data.length : 0) : 0;
                    const favoritesCount = favIds.status === 'fulfilled' ? (Array.isArray(favIds.value) ? favIds.value.length : 0) : 0;
                    const uploadsCount = mySongsRes.status === 'fulfilled' ? (Array.isArray(mySongsRes.value.data) ? mySongsRes.value.data.length : 0) : 0;
                    let hours = 0;
                    if (history.status === 'fulfilled') {
                        try {
                            const items = Array.isArray(history.value) ? history.value : [];
                            // Best-effort: resolve durations for recent unique trackIds
                            const ids = Array.from(new Set(items.map(h => h.trackId))).slice(0, 100);
                            if (ids.length) {
                                const tRes = await api.get('/music/tracks', { params: { ids: ids.join(',') } });
                                const byId = new Map((tRes.data || []).map(t => [String(t.id), Number(t.duration) || 0]));
                                const totalSec = items.reduce((acc, it) => acc + (byId.get(String(it.trackId)) || 0), 0);
                                hours = Math.round(totalSec / 3600);
                            }
                        } catch (_) { }
                    }
                    setMetrics([
                        { label: 'Playlists', value: playlistsCount },
                        { label: 'Favorites', value: favoritesCount },
                        { label: 'Hours Listened', value: hours },
                        { label: 'Uploads', value: uploadsCount },
                    ]);
                }
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const handleAboutSave = async () => {
        if (aboutValue.length > 500) return;
        setAboutSaving(true);
        setError(null); setSuccessMsg(null);
        try {
            const res = await updateAbout(aboutValue);
            setProfile(p => ({ ...p, about: res.about }));
            updateUser({ about: res.about });
            setAboutEdit(false);
            const m = 'About updated';
            setSuccessMsg(m);
            toastSuccess(m);
        } catch (err) {
            setError(err.message);
            toastError(err.message);
        } finally { setAboutSaving(false); }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError('Only image files allowed'); return; }
        if (file.size > 2 * 1024 * 1024) { setError('Max size 2MB'); return; }
        setAvatarUploading(true); setError(null); setSuccessMsg(null);
        try {
            const res = await uploadAvatar(file);
            setProfile(p => ({ ...p, avatarFilename: res.filename }));
            updateUser({ avatarFilename: res.filename });
            const m = 'Avatar updated';
            setSuccessMsg(m);
            toastSuccess(m);
        } catch (err) {
            setError(err.message);
            toastError(err.message);
        } finally { setAvatarUploading(false); }
    };

    const handleAvatarDelete = async () => {
        if (!profile?.avatarFilename) return;
        if (!window.confirm('Remove your avatar?')) return;
        setAvatarUploading(true); setError(null); setSuccessMsg(null);
        try {
            await deleteAvatar();
            setProfile(p => ({ ...p, avatarFilename: undefined }));
            updateUser({ avatarFilename: undefined });
            const m = 'Avatar removed';
            setSuccessMsg(m);
            toastSuccess(m);
        } catch (err) {
            setError(err.message);
            toastError(err.message);
        } finally { setAvatarUploading(false); }
    };

    const [avatarBlobUrl, setAvatarBlobUrl] = useState(null);
    useEffect(() => {
        let revokeTimer;
        const fetchAvatar = async () => {
            if (profile?.avatarFilename) {
                try {
                    const baseApi = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${baseApi}/users/me/avatar?cacheBust=${profile.avatarFilename}`, {
                        headers: { Authorization: token ? `Bearer ${token}` : undefined }
                    });
                    if (res.ok) {
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        setAvatarBlobUrl(prev => {
                            if (prev) URL.revokeObjectURL(prev);
                            return url;
                        });
                    }
                } catch (_) {
                    // ignore
                }
            } else {
                setAvatarBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
            }
        };
        fetchAvatar();
        return () => {
            if (revokeTimer) clearTimeout(revokeTimer);
            setAvatarBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
        };
    }, [profile?.avatarFilename]);

    return (
        <Container maxWidth="lg" sx={{ pt: 6, pb: 10 }}>
            <Stack spacing={4}>
                <Paper elevation={0} sx={(theme) => ({ p: 4, display: 'flex', gap: 3, alignItems: 'center', bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, position: 'relative' })}>
                    <Box sx={{ position: 'relative' }}>
                        <Avatar
                            src={avatarBlobUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.username || 'User'}`}
                            alt="User avatar"
                            sx={{ width: 112, height: 112, border: (theme) => `3px solid ${theme.palette.primary.main}` }}
                        />
                        <input id="avatarInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                        <Tooltip title="Change avatar">
                            <IconButton size="small" component="label" htmlFor="avatarInput" sx={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { background: 'rgba(0,0,0,0.7)' } }}>
                                {avatarUploading ? <CircularProgress size={18} color="inherit" /> : <PhotoCamera fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                        {profile?.avatarFilename && (
                            <Tooltip title="Remove avatar">
                                <IconButton size="small" onClick={handleAvatarDelete} sx={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,0,0,0.5)', color: '#fff', '&:hover': { background: 'rgba(255,0,0,0.7)' } }}>
                                    {avatarUploading ? <CircularProgress size={16} color="inherit" /> : '×'}
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h4" sx={{ fontWeight: 600 }}>{profile?.username || 'Loading...'}</Typography>
                        <Typography variant="subtitle1" color="text.secondary">@{profile?.username || 'user'}</Typography>
                        <Box sx={{ mt: 2, maxWidth: 640 }}>
                            {aboutEdit ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <TextField
                                        multiline
                                        minRows={3}
                                        value={aboutValue}
                                        onChange={(e) => setAboutValue(e.target.value.slice(0, 500))}
                                        helperText={`${aboutValue.length}/500`}
                                    />
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button variant="contained" size="small" onClick={handleAboutSave} disabled={aboutSaving}>{aboutSaving ? 'Saving...' : 'Save'}</Button>
                                        <Button variant="text" size="small" onClick={() => { setAboutValue(profile?.about || ''); setAboutEdit(false); }}>Cancel</Button>
                                    </Box>
                                </Box>
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{profile?.about || placeholderAbout}</Typography>
                                    <Tooltip title="Edit about">
                                        <IconButton size="small" onClick={() => setAboutEdit(true)}><Edit fontSize="small" /></IconButton>
                                    </Tooltip>
                                </Box>
                            )}
                        </Box>
                        {error && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>{error}</Typography>}
                        {successMsg && <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>{successMsg}</Typography>}
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Button component={RouterLink} to="/settings/password" variant="outlined" size="small">Change Password</Button>
                        </Box>
                    </Box>
                </Paper>

                <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
                    {metrics.map(m => (
                        <Paper key={m.label} elevation={0} sx={(theme) => ({ p: 3, textAlign: 'center', bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` })}>
                            <Typography variant="h5" sx={{ fontWeight: 600 }}>{m.value}</Typography>
                            <Typography variant="body2" color="text.secondary">{m.label}</Typography>
                        </Paper>
                    ))}
                </Box>

                <Paper elevation={0} sx={(theme) => ({ p: 4, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` })}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Recent Activity</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">Recent listening history or favorite additions will appear here.</Typography>
                </Paper>
            </Stack>
        </Container>
    );
};

export default UserProfile;
