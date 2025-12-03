import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Container, Typography, Stack, Paper, Avatar, Skeleton, Button, Divider, List, ListItem, ListItemAvatar, ListItemText, ListItemButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, InputLabel, FormControl, Tooltip, IconButton } from '@mui/material';
import api, { getFavorites as apiGetFavorites, addFavorite as apiAddFavorite, removeFavorite as apiRemoveFavorite } from '../../client.js';
import { usePlayer } from '../context/PlayerContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import { motion } from 'framer-motion';

const AlbumPage = () => {
    const { id } = useParams();
    const { toastError } = useUI();
    const { playQueue, enqueue, playNow } = usePlayer();
    const [state, setState] = useState({ loading: true, data: null });
    const [dlg, setDlg] = useState({ open: false, mode: 'album', track: null });
    const [playlists, setPlaylists] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [newName, setNewName] = useState('');
    const [saving, setSaving] = useState(false);
    const [favorites, setFavorites] = useState({ loading: true, ids: [] });

    useEffect(() => {
        const ac = new AbortController();
        (async () => {
            try {
                const res = await api.get(`/music/albums/${encodeURIComponent(id)}`, { signal: ac.signal });
                setState({ loading: false, data: res.data });
            } catch (err) {
                setState({ loading: false, data: null });
                const msg = (err?.message || '').toLowerCase();
                const isAbort = err?.code === 'ERR_CANCELED' || err?.name === 'AbortError' || err?.name === 'CanceledError' || msg.includes('canceled') || msg.includes('cancelled') || msg.includes('aborted');
                if (!isAbort) {
                    toastError(err?.response?.data?.message || err.message || 'Failed to load album');
                }
            }
        })();
        return () => ac.abort();
    }, [id, toastError]);

    // Load user's favorite track IDs
    useEffect(() => {
        (async () => {
            try {
                const favIds = await apiGetFavorites();
                setFavorites({ loading: false, ids: Array.isArray(favIds) ? favIds : [] });
            } catch (e) {
                setFavorites({ loading: false, ids: [] });
            }
        })();
    }, []);

    const toggleFavorite = async (track, makeFav) => {
        const id = String(track?.id ?? '');
        if (!id) return;
        try {
            if (makeFav) await apiAddFavorite(id); else await apiRemoveFavorite(id);
            setFavorites((s) => ({
                ...s,
                ids: makeFav ? Array.from(new Set([...(s.ids || []), id])) : (s.ids || []).filter((x) => x !== id),
            }));
        } catch (e) {
            toastError(e?.response?.data?.message || 'Failed to update favorite');
        }
    };

    const openAddDialog = async (mode, track = null) => {
        setDlg({ open: true, mode, track });
        try {
            const res = await api.get('/users/playlists');
            setPlaylists(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            toastError(err?.response?.data?.message || 'Failed to load playlists');
        }
    };

    const closeAddDialog = () => {
        setDlg({ open: false, mode: 'album', track: null });
        setSelectedId('');
        setNewName('');
        setSaving(false);
    };

    const confirmAdd = async () => {
        try {
            setSaving(true);
            let targetId = selectedId;
            // Create a new playlist if name provided and no selection
            if (!targetId && newName.trim()) {
                const coverUrl = state.data?.image || undefined;
                const cre = await api.post('/users/playlists', { name: newName.trim(), tracks: [], coverUrl });
                targetId = cre.data?._id;
            }
            if (!targetId) return;
            // Compute tracks to add
            const toAdd = dlg.mode === 'album' ? (state.data?.tracks || []) : [dlg.track];
            const ids = toAdd.map((t) => String(t.id));
            // Fetch current playlist, append, and save
            const plRes = await api.get(`/users/playlists/${encodeURIComponent(targetId)}`);
            const current = plRes.data || {};
            const nextTracks = [...(current.tracks || [])];
            ids.forEach((id) => { if (!nextTracks.includes(id)) nextTracks.push(id); });
            await api.put(`/users/playlists/${encodeURIComponent(targetId)}`, { name: current.name, tracks: nextTracks, coverUrl: current.coverUrl });
            closeAddDialog();
        } catch (err) {
            toastError(err?.response?.data?.message || 'Failed to add to playlist');
            setSaving(false);
        }
    };

    const album = state.data;
    const header = (
        <Paper elevation={0} sx={(theme) => ({
            p: { xs: 3, md: 5 },
            mb: 4,
            display: 'flex',
            gap: 3,
            alignItems: 'center',
            bgcolor: 'background.paper',
            borderRadius: 4,
            boxShadow: theme.palette.mode === 'light' ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 12px rgba(0,0,0,0.3)',
            border: `1px solid ${theme.palette.divider}`
        })}>
            {state.loading ? (
                <Skeleton variant="rectangular" width={160} height={160} />
            ) : (
                <Avatar variant="rounded" src={album?.image} alt={album?.name} sx={{ width: 160, height: 160, borderRadius: 3 }} />
            )}
            <Box>
                <Typography variant="overline" color="text.secondary">Album</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {state.loading ? <Skeleton width={280} /> : (album?.name || 'Unknown Album')}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    {state.loading ? <Skeleton width={180} /> : (album?.artist || 'Unknown Artist')}
                </Typography>
                {/* Metrics removed */}
            </Box>
            <Box sx={{ flex: 1 }} />
            {!state.loading && album?.tracks?.length ? (
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Play now">
                        <IconButton color="primary" onClick={() => playNow(album.tracks)}>
                            <PlayArrowIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Add to queue">
                        <IconButton onClick={() => enqueue(album.tracks)}>
                            <QueueMusicIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Add album to playlist">
                        <IconButton onClick={() => openAddDialog('album')}>
                            <PlaylistAddIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            ) : null}
            <Button component={RouterLink} to="/albums" variant="outlined">Back to albums</Button>
        </Paper>
    );

    return (
        <Container maxWidth="lg" sx={{ pt: 8, pb: 6 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                {header}
                <Paper elevation={0} sx={(theme) => ({
                    p: { xs: 2, md: 3 },
                    bgcolor: 'background.paper',
                    borderRadius: 4,
                    boxShadow: theme.palette.mode === 'light' ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 12px rgba(0,0,0,0.3)',
                    border: `1px solid ${theme.palette.divider}`
                })}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Tracks</Typography>
                    {state.loading ? (
                        <Stack spacing={1}>
                            {[...Array(6)].map((_, i) => (
                                <Skeleton key={i} variant="rectangular" height={56} />
                            ))}
                        </Stack>
                    ) : !album?.tracks?.length ? (
                        <Typography color="text.secondary">No tracks found in this album.</Typography>
                    ) : (
                        <List>
                            {album.tracks.map((t, idx) => (
                                <React.Fragment key={t.id || idx}>
                                    <ListItem
                                        disablePadding
                                        secondaryAction={
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'flex-end', sm: 'center' } }}>
                                                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 44, textAlign: 'right' }}>
                                                    {formatDuration(t.duration)}
                                                </Typography>
                                                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                                                    <Tooltip title={(favorites.ids || []).includes(String(t.id)) ? 'Unfavorite' : 'Favorite'}>
                                                        <IconButton
                                                            size="small"
                                                            color={(favorites.ids || []).includes(String(t.id)) ? 'error' : 'default'}
                                                            onClick={() => toggleFavorite(t, !(favorites.ids || []).includes(String(t.id)))}
                                                        >
                                                            {(favorites.ids || []).includes(String(t.id)) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Add to playlist">
                                                        <IconButton size="small" onClick={() => openAddDialog('track', t)}>
                                                            <PlaylistAddIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </Stack>
                                        }
                                    >
                                        <ListItemButton onClick={() => playQueue(album.tracks, idx)}>
                                            <ListItemAvatar>
                                                <Avatar variant="rounded" src={t.image} alt={t.name} />
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={t.name}
                                                secondary={t.artist}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                    {idx < album.tracks.length - 1 && <Divider component="li" />}
                                </React.Fragment>
                            ))}
                        </List>
                    )}
                </Paper>
            </motion.div>
            <Dialog open={dlg.open} onClose={closeAddDialog} fullWidth maxWidth="xs">
                <DialogTitle>Add to playlist</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel id="pl-select-label">Select playlist</InputLabel>
                            <Select labelId="pl-select-label" label="Select playlist" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                                {playlists.map((p) => (
                                    <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography align="center" color="text.secondary">— or —</Typography>
                        <TextField label="New playlist name" value={newName} onChange={(e) => setNewName(e.target.value)} fullWidth />
                        {state.data?.image && <Typography variant="caption" color="text.secondary">New playlists will use this album cover by default.</Typography>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeAddDialog} disabled={saving}>Cancel</Button>
                    <Button onClick={confirmAdd} variant="contained" disabled={saving || (!selectedId && !newName.trim())}>Add</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

function formatDuration(seconds) {
    if (!seconds && seconds !== 0) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default AlbumPage;
