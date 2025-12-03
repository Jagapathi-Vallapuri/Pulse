import React, { useEffect, useMemo, useState } from 'react';
import { Container, Typography, Box, Button, Stack, Paper, Skeleton, Avatar } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import Carousel from '../components/Carousel.jsx';
import TrackCard from '../components/cards/TrackCard.jsx';
import { usePlayer } from '../context/PlayerContext.jsx';
import AlbumCard from '../components/cards/AlbumCard.jsx';
import PlaylistCard from '../components/cards/PlaylistCard.jsx';
import api, { getFavorites as apiGetFavorites, addFavorite as apiAddFavorite, removeFavorite as apiRemoveFavorite, getHistory as apiGetHistory } from '../../client.js';
import { useUI } from '../context/UIContext.jsx';
import { motion } from 'framer-motion';

const Home = () => {
    const { toastError } = useUI();
    const { playClicked, togglePlay, playing, current, queue, index } = usePlayer();
    const navigate = useNavigate();
    const [popular, setPopular] = useState({ loading: true, data: [] });
    const [albums, setAlbums] = useState({ loading: true, data: [] });
    const [playlists, setPlaylists] = useState({ loading: true, data: [] });
    const [favorites, setFavorites] = useState({ loading: true, ids: [] });
    const [history, setHistory] = useState({ loading: true, items: [] });

    useEffect(() => {
        const ac = new AbortController();
        const fetchAll = async () => {
            const isAbort = (e) => {
                const msg = (e?.message || '').toLowerCase();
                return e?.code === 'ERR_CANCELED' || e?.name === 'AbortError' || e?.name === 'CanceledError' || msg.includes('canceled') || msg.includes('cancelled') || msg.includes('aborted');
            };

            try {
                const [pRes, aRes] = await Promise.allSettled([
                    api.get('/music/popular', { signal: ac.signal }),
                    api.get('/music/albums', { signal: ac.signal }),
                ]);

                if (pRes.status === 'fulfilled') {
                    const p = pRes.value;
                    setPopular({ loading: false, data: Array.isArray(p.data) ? p.data : [] });
                } else {
                    setPopular(s => ({ ...s, loading: false }));
                    if (!isAbort(pRes.reason)) {
                        toastError(pRes.reason?.response?.data?.message || 'Failed to load popular');
                    }
                }

                if (aRes.status === 'fulfilled') {
                    const a = aRes.value;
                    setAlbums({ loading: false, data: Array.isArray(a.data) ? a.data : [] });
                } else {
                    setAlbums(s => ({ ...s, loading: false }));
                    if (aRes.status === 'rejected' && !isAbort(aRes.reason)) {
                        toastError(aRes.reason?.response?.data?.message || 'Failed to load albums');
                    }
                }
            } catch (err) {
                // Should rarely happen since allSettled handles individual failures
                if (!isAbort(err)) {
                    toastError(err?.message || 'Failed to load content');
                }
            }

            try {
                const [plRes, favRes, histRes] = await Promise.allSettled([
                    api.get('/users/playlists', { signal: ac.signal }),
                    apiGetFavorites(),
                    apiGetHistory(),
                ]);
                if (plRes.status === 'fulfilled') {
                    const pl = plRes.value;
                    setPlaylists({ loading: false, data: Array.isArray(pl.data) ? pl.data : [] });
                } else {
                    setPlaylists(s => ({ ...s, loading: false }));
                }
                if (favRes.status === 'fulfilled') {
                    setFavorites({ loading: false, ids: Array.isArray(favRes.value) ? favRes.value : [] });
                } else {
                    setFavorites({ loading: false, ids: [] });
                }
                if (histRes.status === 'fulfilled') {
                    const items = Array.isArray(histRes.value) ? histRes.value : [];
                    setHistory({ loading: false, items });
                } else {
                    setHistory({ loading: false, items: [] });
                }
            } catch (_) { }
        };
        fetchAll();
        return () => ac.abort();
    }, [toastError]);

    const toggleFavorite = async (track, makeFav) => {
        const id = track.id || track.track_id || track.title;
        if (!id) return;
        try {
            if (makeFav) await apiAddFavorite(id); else await apiRemoveFavorite(id);
            setFavorites((s) => ({ ...s, ids: makeFav ? Array.from(new Set([...(s.ids || []), id])) : (s.ids || []).filter(x => x !== id) }));
        } catch (e) {
            toastError(e?.response?.data?.message || 'Failed to update favorite');
        }
    };
    const hasSomething = useMemo(() => (Array.isArray(queue) && queue.length > 0) || !!current, [queue, current]);
    const resumeLabel = playing ? 'Pause' : (index >= 0 ? 'Resume' : 'Start');

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const carouselVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" }
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
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <Container maxWidth="lg" sx={{ pt: 6, pb: 8 }}>
                {/* Resume Listening Shelf */}
                {hasSomething && (
                    <motion.div variants={itemVariants}>
                        <Paper sx={{ p: 2, mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar variant="rounded" src={current?.image} alt={current?.title} sx={{ width: 56, height: 56 }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2" color="text.secondary">Resume listening</Typography>
                                <Typography variant="h6" noWrap>{current?.title || (queue[index]?.title) || 'Your queue'}</Typography>
                                {current?.artist && <Typography variant="body2" color="text.secondary" noWrap>{current.artist}</Typography>}
                            </Box>
                            <Button variant="contained" onClick={togglePlay}>{resumeLabel}</Button>
                        </Paper>
                    </motion.div>
                )}
                {/* Popular Section */}
                <motion.div variants={itemVariants}>
                    <Stack spacing={2} sx={{ mb: 4 }}>
                        <Stack direction="row" alignItems="baseline" justifyContent="space-between">
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>Most Streamed This Week</Typography>
                            <Button component={RouterLink} to="/popular" variant="text">View all</Button>
                        </Stack>
                        {popular.loading ? (
                            <Stack direction="row" spacing={1}>
                                {[...Array(5)].map((_, i) => (<Skeleton key={i} variant="rectangular" width={200} height={220} />))}
                            </Stack>
                        ) : (
                            <Carousel ariaLabel="popular-tracks" variants={carouselVariants}>
                                {popular.data.map((t, idx) => {
                                    const track = {
                                        id: t.id || t.track_id || t.title,
                                        title: t.title || t.name,
                                        artist: t.artist_name || t.artist,
                                        image: t.image,
                                        audioUrl: t.audioUrl || t.audio || t.preview_url,
                                    };
                                    return (
                                        <motion.div key={track.id} variants={cardVariants} style={{ height: '100%' }}>
                                            <TrackCard
                                                track={track}
                                                onPlay={() => playClicked(track)}
                                                isFavorite={favorites.ids.includes(track.id)}
                                                onToggleFavorite={(tr, makeFav) => toggleFavorite(tr, makeFav)}
                                            />
                                        </motion.div>
                                    );
                                })}
                            </Carousel>
                        )}
                    </Stack>
                </motion.div>

                {/* Favorites Section */}
                <motion.div variants={itemVariants}>
                    <Stack spacing={2} sx={{ mb: 4 }}>
                        <Stack direction="row" alignItems="baseline" justifyContent="space-between">
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>Your Favorites</Typography>
                        </Stack>
                        {favorites.loading ? (
                            <Stack direction="row" spacing={1}>{[...Array(5)].map((_, i) => (<Skeleton key={i} variant="rectangular" width={200} height={220} />))}</Stack>
                        ) : favorites.ids.length === 0 ? (
                            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                                <Typography>No favorites yet. Tap the heart to save tracks.</Typography>
                            </Paper>
                        ) : (
                            <FavoritesCarousel favoriteIds={favorites.ids} onPlay={playClicked} onToggleFavorite={toggleFavorite} />
                        )}
                    </Stack>
                </motion.div>

                {/* Recently Played Section */}
                <motion.div variants={itemVariants}>
                    <Stack spacing={2} sx={{ mb: 4 }}>
                        <Stack direction="row" alignItems="baseline" justifyContent="space-between">
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>Recently Played</Typography>
                        </Stack>
                        {history.loading ? (
                            <Stack direction="row" spacing={1}>{[...Array(5)].map((_, i) => (<Skeleton key={i} variant="rectangular" width={200} height={220} />))}</Stack>
                        ) : history.items.length === 0 ? (
                            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                                <Typography>Nothing here yet. Start listening!</Typography>
                            </Paper>
                        ) : (
                            <HistoryCarousel historyItems={history.items} onPlay={playClicked} favoriteIds={favorites.ids} onToggleFavorite={toggleFavorite} />
                        )}
                    </Stack>
                </motion.div>

                {/* Albums Section */}
                <motion.div variants={itemVariants}>
                    <Stack spacing={2} sx={{ mb: 4 }}>
                        <Stack direction="row" alignItems="baseline" justifyContent="space-between">
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>New & Noteworthy Albums</Typography>
                            <Button component={RouterLink} to="/albums" variant="text">View all</Button>
                        </Stack>
                        {albums.loading ? (
                            <Stack direction="row" spacing={1}>
                                {[...Array(5)].map((_, i) => (<Skeleton key={i} variant="rectangular" width={200} height={220} />))}
                            </Stack>
                        ) : (
                            <Carousel ariaLabel="albums" variants={carouselVariants}>
                                {albums.data.map((al) => (
                                    <motion.div key={al.id || al.name} variants={cardVariants} style={{ height: '100%' }}>
                                        <AlbumCard
                                            album={{ id: al.id, name: al.name || al.title, artist: al.artist }}
                                            onOpen={(alb) => navigate(`/album/${encodeURIComponent(alb.id)}`)}
                                        />
                                    </motion.div>
                                ))}
                            </Carousel>
                        )}
                    </Stack>
                </motion.div>

                {/* Your Playlists Section */}
                <motion.div variants={itemVariants}>
                    <Stack spacing={2}>
                        <Stack direction="row" alignItems="baseline" justifyContent="space-between">
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>Your Playlists</Typography>
                            <Button component={RouterLink} to="/playlists" variant="text">View all</Button>
                        </Stack>
                        {playlists.loading ? (
                            <Stack direction="row" spacing={1}>
                                {[...Array(5)].map((_, i) => (<Skeleton key={i} variant="rectangular" width={200} height={120} />))}
                            </Stack>
                        ) : playlists.data.length === 0 ? (
                            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                                <Typography>You don't have any playlists yet.</Typography>
                            </Paper>
                        ) : (
                            <Carousel ariaLabel="user-playlists" variants={carouselVariants}>
                                {playlists.data.map((pl) => (
                                    <motion.div key={pl._id} variants={cardVariants} style={{ height: '100%' }}>
                                        <PlaylistCard playlist={pl} onOpen={(p) => navigate(`/playlists/${encodeURIComponent(p._id)}`)} />
                                    </motion.div>
                                ))}
                            </Carousel>
                        )}
                    </Stack>
                </motion.div>
            </Container>
        </motion.div>
    );
};

export default Home;

// --- Helper components to render favorites & history ---
import PropTypes from 'prop-types';

const useTracksByIds = (ids) => {
    const [state, setState] = useState({ loading: true, tracks: [] });
    useEffect(() => {
        let ignore = false;
        const load = async () => {
            if (!ids || ids.length === 0) { setState({ loading: false, tracks: [] }); return; }
            try {
                const res = await api.get('/music/tracks', { params: { ids: ids.join(',') } });
                if (!ignore) setState({ loading: false, tracks: Array.isArray(res.data) ? res.data : [] });
            } catch (_) {
                if (!ignore) setState({ loading: false, tracks: [] });
            }
        };
        load();
        return () => { ignore = true; };
    }, [ids]);
    return state;
};

const FavoritesCarousel = ({ favoriteIds, onPlay, onToggleFavorite }) => {
    const { loading, tracks } = useTracksByIds(favoriteIds);
    if (loading) {
        return <Stack direction="row" spacing={1}>{[...Array(5)].map((_, i) => (<Skeleton key={i} variant="rectangular" width={200} height={220} />))}</Stack>;
    }
    return (
        <Carousel ariaLabel="favorites-tracks" variants={{
            hidden: { opacity: 0 },
            visible: {
                opacity: 1,
                transition: {
                    staggerChildren: 0.1,
                    delayChildren: 0.2
                }
            }
        }}>
            {tracks.map((t) => {
                const track = {
                    id: t.id || t.track_id || t.title,
                    title: t.title || t.name,
                    artist: t.artist_name || t.artist,
                    image: t.image,
                    audioUrl: t.audioUrl || t.audio || t.preview_url,
                };
                return (
                    <motion.div key={track.id} variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: {
                            opacity: 1,
                            y: 0,
                            transition: { duration: 0.5, ease: "easeOut" }
                        }
                    }} style={{ height: '100%' }}>
                        <TrackCard
                            track={track}
                            onPlay={() => onPlay(track)}
                            isFavorite
                            onToggleFavorite={(tr, makeFav) => onToggleFavorite(tr, makeFav)}
                        />
                    </motion.div>
                );
            })}
        </Carousel>
    );
};

FavoritesCarousel.propTypes = {
    favoriteIds: PropTypes.array.isRequired,
    onPlay: PropTypes.func.isRequired,
    onToggleFavorite: PropTypes.func.isRequired,
};

const HistoryCarousel = ({ historyItems, onPlay, favoriteIds, onToggleFavorite }) => {
    const ids = useMemo(() => Array.from(new Set((historyItems || []).map((h) => h.trackId))).slice(0, 20), [historyItems]);
    const { loading, tracks } = useTracksByIds(ids);
    if (loading) {
        return <Stack direction="row" spacing={1}>{[...Array(5)].map((_, i) => (<Skeleton key={i} variant="rectangular" width={200} height={220} />))}</Stack>;
    }
    return (
        <Carousel ariaLabel="recently-played" variants={{
            hidden: { opacity: 0 },
            visible: {
                opacity: 1,
                transition: {
                    staggerChildren: 0.1,
                    delayChildren: 0.2
                }
            }
        }}>
            {tracks.map((t) => {
                const track = {
                    id: t.id || t.track_id || t.title,
                    title: t.title || t.name,
                    artist: t.artist_name || t.artist,
                    image: t.image,
                    audioUrl: t.audioUrl || t.audio || t.preview_url,
                };
                return (
                    <motion.div key={track.id} variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: {
                            opacity: 1,
                            y: 0,
                            transition: { duration: 0.5, ease: "easeOut" }
                        }
                    }} style={{ height: '100%' }}>
                        <TrackCard
                            track={track}
                            onPlay={() => onPlay(track)}
                            isFavorite={favoriteIds.includes(track.id)}
                            onToggleFavorite={(tr, makeFav) => onToggleFavorite(tr, makeFav)}
                        />
                    </motion.div>
                );
            })}
        </Carousel>
    );
};

HistoryCarousel.propTypes = {
    historyItems: PropTypes.array.isRequired,
    onPlay: PropTypes.func.isRequired,
    favoriteIds: PropTypes.array.isRequired,
    onToggleFavorite: PropTypes.func.isRequired,
};
