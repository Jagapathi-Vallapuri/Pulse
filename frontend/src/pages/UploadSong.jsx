import React, { useMemo, useState } from 'react';
import { Box, Button, Container, Paper, Stack, TextField, Typography, Avatar, LinearProgress, IconButton, Tooltip } from '@mui/material';
import { usePlayer } from '../context/PlayerContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { deleteMySong, getMySongs, uploadUserSong, getFavorites as apiGetFavorites, addFavorite as apiAddFavorite, removeFavorite as apiRemoveFavorite } from '../../client.js';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';

const toMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

const UploadSongPage = () => {
    const { toastError, toastSuccess } = useUI();
    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);
    const [cover, setCover] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [songs, setSongs] = useState([]);
    const { playQueue, enqueue, playNow, playClicked } = usePlayer();
    const [favorites, setFavorites] = useState({ loading: true, ids: [] });

    const isAudio = useMemo(() => (file?.type || '').startsWith('audio/'), [file]);
    const isImage = useMemo(() => (cover?.type || '').startsWith('image/'), [cover]);

    const load = async () => {
        try {
            const data = await getMySongs();
            setSongs(Array.isArray(data) ? data : []);
        } catch (e) {
            // ignore
        }
    };

    React.useEffect(() => { load(); }, []);
    React.useEffect(() => {
        (async () => {
            try {
                const favIds = await apiGetFavorites();
                setFavorites({ loading: false, ids: Array.isArray(favIds) ? favIds : [] });
            } catch (_) {
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

    const toTrack = (s) => {
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('token');
        const audioUrl = `${base}/songs/stream/${encodeURIComponent(s.filename)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
        const image = s.coverFilename ? `${base}/songs/cover/${encodeURIComponent(s.coverFilename)}${token ? `?token=${encodeURIComponent(token)}` : ''}` : undefined;
        return {
            id: s.filename,
            title: s.title || s.originalName,
            artist: 'You',
            image,
            audioUrl,
            duration: undefined,
        };
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!file) return toastError('Please select an audio file');
        if (!isAudio) return toastError('Selected file must be audio');
        if (cover && !isImage) return toastError('Cover must be an image');
        setUploading(true);
        try {
            const res = await uploadUserSong({ file, cover, title: title.trim() });
            toastSuccess(res?.message || 'Uploaded');
            setTitle('');
            setFile(null);
            setCover(null);
            await load();
        } catch (err) {
            toastError(err?.response?.data?.message || err?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const onDelete = async (filename) => {
        try {
            await deleteMySong(filename);
            toastSuccess('Deleted');
            await load();
        } catch (e) {
            toastError(e?.response?.data?.message || 'Delete failed');
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>Upload Your Song</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>Audio only. Optionally add a title and cover image. We compute a curation score to help you manage uploads.</Typography>
            <Paper component="form" onSubmit={onSubmit} sx={{ p: 3, mb: 4 }}>
                <Stack spacing={2}>
                    <TextField label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Button variant="outlined" component="label">
                            Select Audio
                            <input type="file" accept="audio/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
                        </Button>
                        {file && (
                            <Typography variant="body2" sx={{ alignSelf: 'center' }}>{file.name} • {toMB(file.size)} MB</Typography>
                        )}
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Button variant="outlined" component="label">
                            Select Cover (optional)
                            <input type="file" accept="image/*" hidden onChange={(e) => setCover(e.target.files?.[0] || null)} />
                        </Button>
                        {cover && (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Avatar src={URL.createObjectURL(cover)} variant="square" sx={{ width: 40, height: 40 }} />
                                <Typography variant="body2">{cover.name}</Typography>
                            </Stack>
                        )}
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <Button type="submit" variant="contained" disabled={uploading}>Upload</Button>
                        {uploading && <Box sx={{ flex: 1, alignSelf: 'center' }}><LinearProgress /></Box>}
                    </Stack>
                </Stack>
            </Paper>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Your Uploads</Typography>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Play all">
                        <span>
                            <IconButton color="primary" disabled={!songs.length} onClick={() => playNow(songs.map(toTrack))}>
                                <PlayArrowIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Add all to queue">
                        <span>
                            <IconButton disabled={!songs.length} onClick={() => enqueue(songs.map(toTrack))}>
                                <QueueMusicIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
            </Stack>
            <Stack spacing={2}>
                {songs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No uploads yet.</Typography>
                ) : (
                    songs.map((s) => (
                        <Paper key={s.filename} sx={{ p: 2 }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                                <Avatar
                                    variant="square"
                                    src={() => {
                                        if (!s.coverFilename) return undefined;
                                        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                                        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                                        const url = `${base}/songs/cover/${encodeURIComponent(s.coverFilename)}`;
                                        return token ? `${url}?token=${encodeURIComponent(token)}` : url;
                                    }}
                                    sx={{ width: 56, height: 56 }}
                                />
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>{s.title || s.originalName}</Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>{s.mimeType} • {toMB(s.size)} MB</Typography>
                                    {typeof s.curationScore === 'number' && (
                                        <Typography variant="caption" color="text.secondary">Curation score: {s.curationScore}</Typography>
                                    )}
                                </Box>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Tooltip title={(favorites.ids || []).includes(String(s.filename)) ? 'Unfavorite' : 'Favorite'}>
                                        <IconButton size="small" color={(favorites.ids || []).includes(String(s.filename)) ? 'error' : 'default'} onClick={() => toggleFavorite(toTrack(s), !(favorites.ids || []).includes(String(s.filename)))}>
                                            {(favorites.ids || []).includes(String(s.filename)) ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Play">
                                        <IconButton size="small" color="primary" onClick={() => playClicked(toTrack(s))}>
                                            <PlayArrowIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Add to queue">
                                        <IconButton size="small" onClick={() => enqueue([toTrack(s)])}>
                                            <QueueMusicIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Button size="small" color="error" onClick={() => onDelete(s.filename)}>Delete</Button>
                                </Stack>
                            </Stack>
                        </Paper>
                    ))
                )}
            </Stack>
        </Container>
    );
};

export default UploadSongPage;
