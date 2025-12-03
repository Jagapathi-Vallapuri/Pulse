import React, { useEffect, useState } from 'react';
import { Container, Stack, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Skeleton, Paper } from '@mui/material';
import PlaylistCard from '../components/cards/PlaylistCard.jsx';
import { useNavigate } from 'react-router-dom';
import api from '../../client.js';
import { useUI } from '../context/UIContext.jsx';
import { motion } from 'framer-motion';

const PlaylistsPage = () => {
    const navigate = useNavigate();
    const { toastError, toastSuccess } = useUI();
    const [state, setState] = useState({ loading: true, data: [] });
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const load = async (signal) => {
        try {
            const res = await api.get('/users/playlists', { signal });
            setState({ loading: false, data: Array.isArray(res.data) ? res.data : [] });
        } catch (err) {
            setState({ loading: false, data: [] });
            const msg = (err?.message || '').toLowerCase();
            const isAbort = err?.code === 'ERR_CANCELED' || err?.name === 'AbortError' || err?.name === 'CanceledError' || msg.includes('canceled') || msg.includes('cancelled') || msg.includes('aborted');
            if (!isAbort) toastError(err?.response?.data?.message || 'Failed to load playlists');
        }
    };

    useEffect(() => {
        const ac = new AbortController();
        load(ac.signal);
        return () => ac.abort();
    }, []);

    const onCreate = async () => {
        if (!name.trim()) return;
        try {
            setSaving(true);
            await api.post('/users/playlists', { name: name.trim(), tracks: [] });
            toastSuccess('Playlist created');
            setOpen(false);
            setName('');
            await load();
        } catch (err) {
            toastError(err?.response?.data?.message || 'Failed to create playlist');
        } finally {
            setSaving(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" }
        }
    };

    return (
        <Container maxWidth="lg" sx={{ pt: 8, pb: 8 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>Your Playlists</Typography>
                <Button variant="contained" onClick={() => setOpen(true)}>New Playlist</Button>
            </Stack>

            {state.loading ? (
                <Grid container spacing={2}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Grid key={i} item xs={12} sm={6} md={3}>
                            <Skeleton variant="rectangular" height={120} />
                        </Grid>
                    ))}
                </Grid>
            ) : state.data.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography>You don't have any playlists yet.</Typography>
                </Paper>
            ) : (
                <Grid container spacing={2} component={motion.div} variants={containerVariants} initial="hidden" animate="visible">
                    {state.data.map(pl => (
                        <Grid key={pl._id} item xs={12} sm={6} md={3} component={motion.div} variants={itemVariants}>
                            <PlaylistCard playlist={pl} onOpen={(p) => navigate(`/playlists/${encodeURIComponent(p._id)}`)} />
                        </Grid>
                    ))}
                </Grid>
            )}

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Create playlist</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Name"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                    <Button onClick={onCreate} variant="contained" disabled={saving || !name.trim()}>Create</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default PlaylistsPage;
