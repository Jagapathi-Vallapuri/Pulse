import React from 'react';
import { Box, Card, CardActionArea, CardContent, CardMedia, Typography } from '@mui/material';

import { motion } from 'framer-motion';

const AlbumCard = ({ album, onOpen }) => {
    const cover = album.image || album.cover || `https://picsum.photos/seed/album-${encodeURIComponent(album.id || album.name)}/300/300`;
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
                <CardActionArea onClick={() => onOpen?.(album)} sx={{ flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                    <Box sx={{ position: 'relative', width: '100%', paddingTop: '100%', bgcolor: 'action.hover' }}>
                        <CardMedia component="img" image={cover} alt={album.name} sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        <Box className="play-overlay" sx={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            bgcolor: 'rgba(0,0,0,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.2s ease-in-out'
                        }}>
                            {/* Optional: Add an icon here if desired, or just keep the dimming effect */}
                        </Box>
                    </Box>
                    <CardContent sx={{ flexGrow: 1, p: 2 }}>
                        <Typography variant="subtitle1" noWrap title={album.name} sx={{ fontWeight: 700 }}>{album.name}</Typography>
                        {album.artist && <Typography variant="body2" color="text.secondary" noWrap title={album.artist}>{album.artist}</Typography>}
                    </CardContent>
                </CardActionArea>
            </Card>
        </motion.div>
    );
};

export default AlbumCard;
