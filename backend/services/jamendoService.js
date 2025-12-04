const axios = require('axios');
const cache = require('./cacheService');
const JAMENDO_API_BASE = 'https://api.jamendo.com/v3.0/';
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

const ensureClient = () => {
    if (!CLIENT_ID) {
        const err = new Error('JAMENDO_CLIENT_ID is not set. Please configure your Jamendo client id in the backend environment.');
        err.code = 'CONFIG_JAMENDO_CLIENT_ID_MISSING';
        throw err;
    }
};

const decodeHtmlEntities = (text) => {
    if (!text) return '';
    return text.replace(/&amp;/g, '&');
};

const withCache = async (key, fn, transform, ttlSeconds) => {
    const cached = await cache.get(key);
    if (cached !== null && cached !== undefined) {
        if (typeof cached === 'string') {
            try {
                return JSON.parse(cached);
            } catch {
                return cached;
            }
        }
        return cached;
    }

    const result = await fn();
    const transformedResult = transform ? transform(result) : result;

    await cache.set(key, transformedResult, ttlSeconds);
    return transformedResult;
};

const searchTracks = (query) => {
    const normalized = String(query || '').trim().toLowerCase();
    return withCache(`search:${normalized}`, async () => {
        ensureClient();
        const response = await axios.get(`${JAMENDO_API_BASE}tracks`, {
            params: {
                client_id: CLIENT_ID,
                format: 'json',
                limit: 20,
                namesearch: query,
                audioformat: 'mp32',
                include: 'musicinfo'
            },
        });
        const results = Array.isArray(response?.data?.results) ? response.data.results : [];
        return results.map(track => ({
            ...track,
            artist_name: decodeHtmlEntities(track.artist_name)
        }));
    }, null, 3600);
};

const getTrackById = (id) => {
    const normId = String(id).trim();
    return withCache(`track:${normId}`, async () => {
        ensureClient();
        const response = await axios.get(`${JAMENDO_API_BASE}tracks`, {
            params: {
                client_id: CLIENT_ID,
                id: normId,
                format: 'json',
                include: 'musicinfo',
                audioformat: 'mp32'
            }
        });
        const results = Array.isArray(response?.data?.results) ? response.data.results : [];
        const track = results[0];
        if (track) {
            track.artist_name = decodeHtmlEntities(track.artist_name);
        }
        return track;
    }, null, 21600);
};

const getPopular = () => {
    return withCache('popular:auto', async () => {
        ensureClient();
        const orders = ['listens_week', 'popularity_week', 'popularity_total'];
        for (const order of orders) {
            const response = await axios.get(`${JAMENDO_API_BASE}tracks`, {
                params: {
                    client_id: CLIENT_ID,
                    format: 'json',
                    order,
                    limit: 30,
                    include: 'musicinfo',
                    audioformat: 'mp32'
                }
            });
            const results = Array.isArray(response?.data?.results) ? response.data.results : [];
            if (results.length > 0) {
                return results;
            }
        }
        return [];
    }, (results) => (Array.isArray(results) ? results : []).map((track) => ({
        id: track.id,
        name: track.name,
        artist: decodeHtmlEntities(track.artist_name),
        audioUrl: track.audio,
        image: track.image,
        duration: track.duration,
        album: track.album_name,
        genres: track.musicinfo?.tags?.genres || []
    })), 900);
};


const getAlbumsByCategories = (categories = [], per = 5) => {
    const cats = (Array.isArray(categories) ? categories : String(categories).split(',')).map(s => String(s || '').trim().toLowerCase()).filter(Boolean);
    const key = `albums:bycat:${cats.join('|')}:${per}`;
    return withCache(key, async () => {
        ensureClient();
        const axiosCalls = cats.map(tag => axios.get(`${JAMENDO_API_BASE}tracks`, {
            params: {
                client_id: CLIENT_ID,
                format: 'json',
                tags: tag,
                featured: 1,
                groupby: 'album_id',
                order: 'popularity_week',
                limit: per,
                include: 'musicinfo',
                audioformat: 'mp32'
            }
        }).then(res => ({ tag, results: res.data.results || [] })));
        const responses = await Promise.all(axiosCalls);
        return responses.reduce((acc, { tag, results }) => {
            const albums = [];
            const seen = new Set();
            for (const t of (Array.isArray(results) ? results : [])) {
                const aid = t.album_id;
                if (!aid || seen.has(aid)) continue;
                seen.add(aid);
                albums.push({
                    id: aid,
                    name: t.album_name,
                    artist: decodeHtmlEntities(t.artist_name),
                    image: t.album_image || t.image,
                });
            }
            acc[tag] = albums;
            return acc;
        }, {});
    }, null, 1800);
};

const getAlbums = () => {
    return withCache('albums', async () => {
        ensureClient();
        const response = await axios.get(`${JAMENDO_API_BASE}albums/tracks`, {
            params: {
                client_id: CLIENT_ID,
                format: 'json',
                order: 'popularity_total',
                limit: 10,
                include: 'musicinfo',
                audioformat: 'mp32'
            }
        });
        return Array.isArray(response?.data?.results) ? response.data.results : [];
    }, (results) => (Array.isArray(results) ? results : []).map((album) => ({
        id: album.id,
        name: album.name,
        artist: decodeHtmlEntities(album.artist_name),
        image: album.image,
        tracks: album.tracks
    })), 3600);
};

const getAlbumById = (id) => {
    const normId = String(id).trim();
    return withCache(`album:${normId}`, async () => {
        ensureClient();
        const response = await axios.get(`${JAMENDO_API_BASE}albums/tracks`, {
            params: {
                client_id: CLIENT_ID,
                format: 'json',
                id: normId,
                include: 'musicinfo',
                audioformat: 'mp32'
            }
        });
        const results = Array.isArray(response?.data?.results) ? response.data.results : [];
        return results?.[0] || null;
    }, (album) => {
        if (!album) return null;
        return {
            id: album.id,
            name: album.name,
            artist: decodeHtmlEntities(album.artist_name),
            image: album.image,
            tracks: (album.tracks || []).map(t => ({
                id: t.id,
                name: t.name,
                artist: decodeHtmlEntities(t.artist_name),
                duration: t.duration,
                audioUrl: t.audio,
                image: t.image,
                album: t.album_name,
            }))
        };
    }, 3600);
};

const getTracksByIds = (ids) => {
    const idsArr = Array.isArray(ids) ? ids.map(String).map(s => s.trim()) : String(ids).split(',').map(s => s.trim());
    const sorted = idsArr.slice().sort();
    return withCache(`tracks:${sorted.join(',')}`, async () => {
        ensureClient();
        const response = await axios.get(`${JAMENDO_API_BASE}tracks`, {
            params: {
                client_id: CLIENT_ID,
                id: sorted.join('+'),
                format: 'json',
                include: 'musicinfo'
            }
        });
        const results = Array.isArray(response?.data?.results) ? response.data.results : [];
        return results.map(track => ({
            ...track,
            artist_name: decodeHtmlEntities(track.artist_name)
        }));
    }, null, 21600);
};

module.exports = { searchTracks, getTrackById, getPopular, getAlbums, getTracksByIds, getAlbumById, getAlbumsByCategories };