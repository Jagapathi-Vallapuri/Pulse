import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Stack, Typography, IconButton, List, ListItem, ListItemText, ListItemAvatar, Avatar, Divider, Paper, Button, Skeleton, TextField, Tooltip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import api, { getFavorites as apiGetFavorites, addFavorite as apiAddFavorite, removeFavorite as apiRemoveFavorite } from '../../client.js';
import { useUI } from '../context/UIContext.jsx';
import { usePlayer } from '../context/PlayerContext.jsx';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { motion } from 'framer-motion';

const PlaylistDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toastError, toastSuccess } = useUI();
    const { playQueue, playNow, enqueue } = usePlayer();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [playlist, setPlaylist] = useState(null);
    const [tracks, setTracks] = useState([]);
    const [desc, setDesc] = useState('');
    const [coverUploading, setCoverUploading] = useState(false);
    const [name, setName] = useState('');
    const [dragIndex, setDragIndex] = useState(null);
    const [hoverIndex, setHoverIndex] = useState(null);
    const [favorites, setFavorites] = useState({ loading: true, ids: [] });

    const load = async (signal) => {
        try {
            setLoading(true);
            const res = await api.get(`/users/playlists/${encodeURIComponent(id)}`, { signal });
            const pl = res.data;
            setPlaylist(pl);
            setName(pl.name || '');
            setDesc(pl.description || '');
            const ids = Array.isArray(pl.tracks) ? pl.tracks : [];
            if (ids.length) {
                const tRes = await api.get('/music/tracks', { params: { ids: ids.join(',') }, signal });
                setTracks(tRes.data || []);
            } else {
                setTracks([]);
            }
        } catch (err) {
            const msg = (err?.message || '').toLowerCase();
            const isAbort = err?.code === 'ERR_CANCELED' || err?.name === 'AbortError' || err?.name === 'CanceledError' || msg.includes('canceled') || msg.includes('cancelled') || msg.includes('aborted');
            if (!isAbort) toastError(err?.response?.data?.message || 'Failed to load playlist');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const ac = new AbortController();
        load(ac.signal);
        return () => ac.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Load favorites once for like buttons
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

    const move = (index, dir) => {
        setTracks((prev) => {
            const next = prev.slice();
            const j = index + dir;
            if (j < 0 || j >= next.length) return prev;
            const tmp = next[index];
            next[index] = next[j];
            next[j] = tmp;
            return next;
        });
    };

    const onSave = async () => {
        try {
            setSaving(true);
            const newOrderIds = tracks.map((t) => String(t.id));
            const safeName = name?.trim() || 'Untitled Playlist';
            await api.put(`/users/playlists/${encodeURIComponent(id)}`, { name: safeName, tracks: newOrderIds, coverUrl: playlist.coverUrl, description: desc });
            toastSuccess('Playlist updated');
        } catch (err) {
            toastError(err?.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const onChangeCover = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('cover', file);
        try {
            setCoverUploading(true);
            const res = await api.post(`/users/playlists/${encodeURIComponent(id)}/cover`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setPlaylist((prev) => ({ ...prev, coverUrl: res.data?.coverUrl || prev.coverUrl }));
            toastSuccess('Cover updated');
        } catch (err) {
            toastError(err?.response?.data?.message || 'Failed to upload cover');
        } finally {
            setCoverUploading(false);
            e.target.value = '';
        }
    };

    return (
        <Container maxWidth="md" sx={{ pt: 8, pb: 6 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar variant="rounded" src={playlist?.coverUrl} alt={playlist?.name} sx={{ width: 72, height: 72 }} />
                        <Stack spacing={1}>
                            <TextField
                                value={name}
                                onChange={(e) => setName(e.target.value.slice(0, 120))}
                                placeholder="Untitled Playlist"
                                variant="standard"
                                inputProps={{ 'aria-label': 'Playlist name' }}
                                sx={{ '& .MuiInputBase-input': { fontSize: 24, fontWeight: 700 } }}
                            />
                            <Button size="small" variant="outlined" component="label" disabled={coverUploading}>
                                Change cover
                                <input hidden type="file" accept="image/*" onChange={onChangeCover} />
                            </Button>
                        </Stack>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" onClick={() => navigate('/playlists')}>Back</Button>
                        <Button variant="contained" startIcon={<SaveIcon />} onClick={onSave} disabled={saving || loading}>Save changes</Button>
                    </Stack>
                </Stack>

                <Paper elevation={0} sx={(theme) => ({
                    p: 2,
                    mb: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 4,
                    boxShadow: theme.palette.mode === 'light' ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 12px rgba(0,0,0,0.3)',
                    border: `1px solid ${theme.palette.divider}`
                })}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Description</Typography>
                    <TextField
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder="Write a short description for this playlist..."
                        fullWidth
                        multiline
                        minRows={2}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {tracks.length} track{tracks.length === 1 ? '' : 's'} · {formatTotalDuration(tracks)}
                    </Typography>
                </Paper>

                {!loading && tracks.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Tooltip title="Play now">
                            <IconButton color="primary" onClick={() => playNow(tracks)}>
                                <PlayArrowIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Add to queue">
                            <IconButton onClick={() => enqueue(tracks)}>
                                <QueueMusicIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                )}
                {loading ? (
                    <Paper elevation={0} sx={{ p: 2 }}>
                        <Stack spacing={1}>{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} variant="rectangular" height={56} />))}</Stack>
                    </Paper>
                ) : tracks.length === 0 ? (
                    <Paper elevation={0} sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography>No tracks in this playlist.</Typography>
                    </Paper>
                ) : (
                    <Paper elevation={0} sx={(theme) => ({
                        p: 1,
                        bgcolor: 'background.paper',
                        borderRadius: 4,
                        boxShadow: theme.palette.mode === 'light' ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 12px rgba(0,0,0,0.3)',
                        border: `1px solid ${theme.palette.divider}`
                    })}>
                        <List>
                            {tracks.map((t, idx) => (
                                <React.Fragment key={t.id || idx}>
                                    <ListItem
                                        disablePadding
                                        draggable
                                        onDragStart={(e) => { setDragIndex(idx); try { e.dataTransfer.setData('text/plain', String(idx)); } catch (_) { }; e.dataTransfer.effectAllowed = 'move'; }}
                                        onDragOver={(e) => { e.preventDefault(); setHoverIndex(idx); }}
                                        onDragLeave={() => setHoverIndex(null)}
                                        onDrop={(e) => { e.preventDefault(); setHoverIndex(null); const from = dragIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10); if (!Number.isFinite(from) || from === idx) return; setTracks((prev) => reorder(prev, from, idx)); setDragIndex(null); }}
                                        sx={{ bgcolor: hoverIndex === idx ? 'action.hover' : 'transparent', transition: 'background-color 120ms' }}
                                        secondaryAction={
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <Tooltip title={(favorites.ids || []).includes(String(t.id)) ? 'Unfavorite' : 'Favorite'}>
                                                    <IconButton
                                                        size="small"
                                                        color={(favorites.ids || []).includes(String(t.id)) ? 'error' : 'default'}
                                                        onClick={() => toggleFavorite(t, !(favorites.ids || []).includes(String(t.id)))}
                                                    >
                                                        {(favorites.ids || []).includes(String(t.id)) ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                                                    </IconButton>
                                                </Tooltip>
                                                <IconButton size="small" aria-label="drag handle" sx={{ cursor: 'grab' }}>
                                                    <DragIndicatorIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        }
                                    >
                                        <ListItemAvatar><Avatar variant="rounded" src={t.image} alt={t.name} /></ListItemAvatar>
                                        <ListItemText primary={t.name} secondary={t.artist} onClick={() => playQueue(tracks, idx)} />
                                    </ListItem>
                                    {idx < tracks.length - 1 && <Divider component="li" />}
                                </React.Fragment>
                            ))}
                        </List>
                    </Paper>
                )}
            </motion.div>
        </Container>
    );
};

function formatTotalDuration(tracks) {
    const total = (tracks || []).reduce((acc, t) => acc + (Number(t.duration) || 0), 0);
    if (!total) return '0:00';
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function reorder(list, from, to) {
    const arr = list.slice();
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    return arr;
}

export default PlaylistDetailPage;
