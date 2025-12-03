import { Box, Card, CardActionArea, CardContent, CardMedia, IconButton, Typography, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';

import { motion } from 'framer-motion';

const TrackCard = ({ track, onPlay, onFavorite, isFavorite = false, onToggleFavorite }) => {
    const cover = track.image || track.cover || track.albumImage || `https://picsum.photos/seed/${encodeURIComponent(track.id)}/300/300`;

    return (
        <motion.div
            whileHover={{ y: -6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
            <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                '&:hover .play-overlay': { opacity: 1 }
            }}>
                <CardActionArea onClick={() => onPlay?.(track)} sx={{ flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                    <Box sx={{ position: 'relative', width: '100%', paddingTop: '100%', bgcolor: 'action.hover' }}>
                        <CardMedia
                            component="img"
                            image={cover}
                            alt={track.title}
                            sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <Box className="play-overlay" sx={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            bgcolor: 'rgba(0,0,0,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.2s ease-in-out'
                        }}>
                            <Box sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                borderRadius: '50%',
                                p: 1,
                                display: 'flex',
                                '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.1)' },
                                transition: 'all 0.2s',
                                boxShadow: 3
                            }}>
                                <PlayArrowIcon fontSize="large" />
                            </Box>
                        </Box>
                    </Box>
                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5, p: 2 }}>
                        <Typography variant="subtitle1" noWrap title={track.title} sx={{ fontWeight: 700 }}>{track.title}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap title={track.artist}>{track.artist}</Typography>
                    </CardContent>
                </CardActionArea>
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            (onToggleFavorite ? onToggleFavorite(track, !isFavorite) : onFavorite?.(track));
                        }}
                        sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
                    >
                        {isFavorite ? <FavoriteIcon color="error" fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                    </IconButton>
                </Box>
            </Card>
        </motion.div>
    );
};

export default TrackCard;
