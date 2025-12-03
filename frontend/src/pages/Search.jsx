import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Stack, Typography, TextField, InputAdornment, IconButton, Paper, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, Button, Skeleton, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import api, { getFavorites as apiGetFavorites, addFavorite as apiAddFavorite, removeFavorite as apiRemoveFavorite } from '../../client.js';
import { usePlayer } from '../context/PlayerContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { motion } from 'framer-motion';

function useQuery() {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search), [search]);
}

const SearchPage = () => {
    const qs = useQuery();
    const initialQ = qs.get('q') || '';
    const [q, setQ] = useState(initialQ);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const { playQueue, enqueue, playNow, playClicked } = usePlayer();
    const { toastError } = useUI();
    const [favorites, setFavorites] = useState({ loading: true, ids: [] });

    const doSearch = async (term, signal) => {
        if (!term?.trim()) { setResults([]); return; }
        try {
            setLoading(true);
            const res = await api.get('/music/search', { params: { q: term.trim() }, signal });
            setResults(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            const msg = (err?.message || '').toLowerCase();
            const isAbort = err?.code === 'ERR_CANCELED' || err?.name === 'AbortError' || err?.name === 'CanceledError' || msg.includes('canceled') || msg.includes('cancelled') || msg.includes('aborted');
            if (!isAbort) toastError(err?.response?.data?.message || 'Search failed');
        } finally {
            setLoading(false);
        }
    };

    // Run when URL changes
    useEffect(() => {
        const ac = new AbortController();
        const term = qs.get('q') || '';
        setQ(term);
        doSearch(term, ac.signal);
        return () => ac.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qs]);

    // Load user's favorites once for heart toggles
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

    const onSubmit = async (e) => {
        e.preventDefault();
        const url = new URL(window.location.href);
        url.searchParams.set('q', q.trim());
        window.history.replaceState(null, '', url.toString());
        const ac = new AbortController();
        doSearch(q, ac.signal);
    };

    return (
        <Container maxWidth="md" sx={{ pt: 8, pb: 6 }}>
            <form onSubmit={onSubmit}>
                <TextField
                    fullWidth
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search tracks, artists..."
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton type="submit" aria-label="search"><SearchIcon /></IconButton>
                            </InputAdornment>
                        )
                    }}
                />
            </form>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button variant="contained" disabled={!results.length} onClick={() => playNow(results)}>Play all</Button>
                    <Button variant="outlined" disabled={!results.length} onClick={() => enqueue(results)}>Add all to queue</Button>
                </Stack>

                <Paper elevation={0} sx={(theme) => ({
                    mt: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 4,
                    boxShadow: theme.palette.mode === 'light' ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 12px rgba(0,0,0,0.3)',
                    border: `1px solid ${theme.palette.divider}`
                })}>
                    {loading ? (
                        <Stack spacing={1} sx={{ p: 2 }}>{Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} variant="rectangular" height={56} />))}</Stack>
                    ) : results.length === 0 ? (
                        <Typography sx={{ p: 2 }} color="text.secondary">{q?.trim() ? 'No results.' : 'Type to search.'}</Typography>
                    ) : (
                        <List>
                            {results.map((t, idx) => (
                                <React.Fragment key={t.id || idx}>
                                    <ListItem
                                        disablePadding
                                        secondaryAction={
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Tooltip title={(favorites.ids || []).includes(String(t.id)) ? 'Unfavorite' : 'Favorite'}>
                                                    <IconButton size="small" color={(favorites.ids || []).includes(String(t.id)) ? 'error' : 'default'} onClick={() => toggleFavorite(t, !(favorites.ids || []).includes(String(t.id)))}>
                                                        {(favorites.ids || []).includes(String(t.id)) ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                                                    </IconButton>
                                                </Tooltip>
                                                <Button size="small" onClick={() => enqueue([t])}>Add</Button>
                                            </Stack>
                                        }
                                    >
                                        <ListItemAvatar><Avatar variant="rounded" src={t.image} alt={t.name} /></ListItemAvatar>
                                        <ListItemText primary={t.name} secondary={t.artist} onClick={() => playClicked(t)} />
                                    </ListItem>
                                    {idx < results.length - 1 && <Divider component="li" />}
                                </React.Fragment>
                            ))}
                        </List>
                    )}
                </Paper>
            </motion.div>
        </Container>
    );
};

export default SearchPage;
