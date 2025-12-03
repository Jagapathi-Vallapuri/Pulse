import React, { useRef } from 'react';
import { Box, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { motion } from 'framer-motion';

const gapPx = 12;

const Carousel = ({ children, ariaLabel = 'carousel', showArrows = true, variants }) => {
    const ref = useRef(null);

    const scrollBy = (delta) => {
        const el = ref.current;
        if (!el) return;
        el.scrollBy({ left: delta, behavior: 'smooth' });
    };

    return (
        <Box sx={{ position: 'relative' }}>
            {showArrows && (
                <IconButton
                    aria-label="previous"
                    size="small"
                    onClick={() => scrollBy(-ref.current?.clientWidth || -300)}
                    sx={{ position: 'absolute', left: -8, top: '40%', zIndex: 1, bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'background.paper' } }}
                >
                    <ChevronLeftIcon />
                </IconButton>
            )}
            <Box
                component={motion.div}
                ref={ref}
                role="region"
                aria-label={ariaLabel}
                variants={variants}
                animate="visible"

                sx={{
                    display: 'grid',
                    gridAutoFlow: 'column',
                    gridAutoColumns: {
                        xs: `calc(70% - ${gapPx}px)`,
                        sm: `calc(45% - ${gapPx}px)`,
                        md: `calc(25% - ${gapPx}px)`,
                        lg: `calc(20% - ${gapPx}px)`,
                    },
                    gap: `${gapPx}px`,
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    '& > *': { scrollSnapAlign: 'start' },
                    pb: 1,
                }}
            >
                {children}
            </Box>
            {showArrows && (
                <IconButton
                    aria-label="next"
                    size="small"
                    onClick={() => scrollBy(ref.current?.clientWidth || 300)}
                    sx={{ position: 'absolute', right: -8, top: '40%', zIndex: 1, bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'background.paper' } }}
                >
                    <ChevronRightIcon />
                </IconButton>
            )}
        </Box>
    );
};

export default Carousel;