import React, { useMemo, useState } from 'react';
import { AppBar, Box, IconButton, Toolbar, Typography, Avatar, Slider, Stack, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Pause from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { usePlayer } from '../context/PlayerContext.jsx';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import QueueDrawer from './QueueDrawer.jsx';
import ShuffleIcon from '@mui/icons-material/Shuffle';

const PlayerBar = () => {
    const { current, playing, togglePlay, progress, seekTo, next, prev, volume, setVolume, muted, toggleMute, queue, index, shuffleUpcoming } = usePlayer();
    const [queueOpen, setQueueOpen] = useState(false);
    const theme = useTheme();
    const uiColor = theme.palette.text.primary;
    const pct = progress.duration ? Math.max(0, Math.min(100, (progress.currentTime / progress.duration) * 100)) : 0;
    const timeLabel = useMemo(() => {
        const fmt = (s) => {
            if (!Number.isFinite(s)) return '0:00';
            const m = Math.floor(s / 60);
            const sec = Math.floor(s % 60);
            return `${m}:${sec.toString().padStart(2, '0')}`;
        };
        return `${fmt(progress.currentTime)} / ${fmt(progress.duration || 0)}`;
    }, [progress]);
    const isEmpty = !current && (!queue || queue.length === 0);
    const placeholder = {
        title: 'Nothing playing',
        artist: queue && queue.length ? `${queue.length} track(s) in queue` : 'Add a song to get started',
        image: undefined,
    };
    return (
        <AppBar position="fixed" color="default" sx={{ top: 'auto', bottom: 0, bgcolor: 'background.paper', borderTop: (t) => `1px solid ${t.palette.divider}`, zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <Toolbar sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, minHeight: 72 }}>
                {/* Left: track info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1, color: 'text.primary' }}>
                    <Avatar variant="rounded" src={(current || placeholder).image} alt={(current || placeholder).title} sx={{ width: 48, height: 48, borderRadius: 2, boxShadow: 1 }} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>{(current || placeholder).title}</Typography>
                        <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>{(current || placeholder).artist}</Typography>
                    </Box>
                </Box>

                {/* Center: playback controls + seek */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 2, mx: 'auto', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={shuffleUpcoming} disabled={!queue || queue.length <= 2} size="small" sx={{ color: 'text.secondary' }}>
                            <ShuffleIcon fontSize="small" />
                        </IconButton>
                        <IconButton onClick={prev} disabled={index <= 0} aria-label="Previous" sx={{ color: 'text.primary' }}>
                            <SkipPreviousIcon />
                        </IconButton>
                        <IconButton onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            width: 40,
                            height: 40,
                            '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.05)' },
                            transition: 'all 0.2s'
                        }}>
                            {playing ? <Pause /> : <PlayArrow />}
                        </IconButton>
                        <IconButton onClick={next} disabled={!queue || index >= (queue.length - 1)} aria-label="Next" sx={{ color: 'text.primary' }}>
                            <SkipNextIcon />
                        </IconButton>
                        <IconButton onClick={() => setQueueOpen(true)} size="small" sx={{ color: 'text.secondary' }}>
                            <QueueMusicIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', maxWidth: 500 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 35, textAlign: 'right' }}>{timeLabel.split(' / ')[0]}</Typography>
                        <Slider
                            aria-label="Seek"
                            size="small"
                            value={pct}
                            onChange={(_, v) => {
                                if (!progress.duration) return;
                                const pctVal = Array.isArray(v) ? v[0] : v;
                                const sec = (pctVal / 100) * progress.duration;
                                seekTo(sec);
                            }}
                            sx={{
                                color: 'primary.main',
                                height: 4,
                                '& .MuiSlider-thumb': { width: 12, height: 12, transition: '0.2s', '&:hover, &.Mui-focusVisible': { boxShadow: '0px 0px 0px 8px rgba(99, 102, 241, 0.16)' } },
                                '& .MuiSlider-rail': { opacity: 0.2 },
                            }}
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 35 }}>{timeLabel.split(' / ')[1]}</Typography>
                    </Box>
                </Box>

                {/* Right: volume */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end', flex: 1 }}>
                    <IconButton onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} size="small" sx={{ color: 'text.secondary' }}>
                        {muted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
                    </IconButton>
                    <Slider
                        aria-label="Volume"
                        size="small"
                        value={(muted ? 0 : volume) * 100}
                        onChange={(_, v) => {
                            const pctVal = Array.isArray(v) ? v[0] : v;
                            setVolume((pctVal || 0) / 100);
                        }}
                        sx={{ width: 100, color: 'text.secondary', height: 4 }}
                    />
                </Box>
            </Toolbar>
            <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />
        </AppBar>
    );
};

export default PlayerBar;
