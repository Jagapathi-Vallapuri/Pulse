const { searchTracks, getTrackById, getPopular, getAlbums: fetchAlbums, getTracksByIds: fetchTracksByIdsService, getAlbumById, getAlbumsByCategories } = require('../services/jamendoService');
const axios = require('axios');
const { AbortController: NodeAbortController } = require('abort-controller');


const search = async (req, res) => {
	try {
		const { q } = req.query;

		if (!q) {
			return res.status(400).json({ message: 'Missing query parameter ?q=track_name' });
		}
		const tracks = await searchTracks(q);
		res.json(tracks);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Failed to search tracks', error: err.message });
	}
};

const getTrackDetails = async (req, res) => {
	try {
		const track = await getTrackById(req.params.id);
		if (!track) return res.status(404).json({ message: 'Track not found' });
		res.json(track);
	} catch (err) {
		res.status(500).json({ message: 'Failed to get track info', error: err.message });
	}
};

const getPopularTracks = async (req, res) => {
	try {
		const tracks = await getPopular();
		res.json(tracks);
	} catch (err) {
		res.status(500).json({ message: `Failed to get popular tracks: ${err.message}`, error: err.message, code: err.code });
	}
};

const getAlbums = async (req, res) => {
    try {
        const albums = await fetchAlbums();
        res.json(albums);
    } catch (err) {
		res.status(500).json({ message: `Failed to get albums: ${err.message}`, error: err.message, code: err.code });
    }
};

const getAlbum = async (req, res) => {
	try {
		const { id } = req.params;
		const album = await getAlbumById(id);
		if (!album) return res.status(404).json({ message: 'Album not found' });
		res.json(album);
	} catch (err) {
		res.status(500).json({ message: `Failed to get album: ${err.message}` , error: err.message, code: err.code });
	}
};

const getAlbumsPerCategories = async (req, res) => {
	try {
		const cats = req.query.cats || '';
		const per = Number(req.query.per) || 5;
		if (!cats) return res.status(400).json({ message: 'Missing query parameter ?cats=genre1,genre2' });
		const data = await getAlbumsByCategories(cats, per);
		res.json(data);
	} catch (err) {
		res.status(500).json({ message: `Failed to get albums by categories: ${err.message}`, error: err.message, code: err.code });
	}
};

const getTracksByIds = async (req, res) => {
    try {
        const { ids } = req.query;
        if (!ids) {
            return res.status(400).json({ message: 'Missing query parameter ?ids=track_id1,track_id2' });
        }
        const trackIds = ids.split(',');
        const tracks = await fetchTracksByIdsService(trackIds);
        res.json(tracks);
    } catch (err) {
		console.error(err);
		res.status(500).json({ message: `Failed to get tracks by IDs: ${err.message}`, error: err.message, code: err.code });
    }
};


module.exports = {
	search,
	getTrackDetails,
	getPopularTracks,
	getAlbums,
	getAlbum,
	getTracksByIds,
    getAlbumsPerCategories
};


module.exports.streamAudio = async (req, res) => {
	try {
		const { src } = req.query;
		if (!src) {
			return res.status(400).json({ message: 'Missing src parameter' });
		}
		let url;
		try {
			url = new URL(src);
		} catch (e) {
			return res.status(400).json({ message: 'Invalid src URL' });
		}
		const hostname = url.hostname.toLowerCase();
		const allowed = hostname.endsWith('.jamendo.com') || hostname === 'jamendo.com';
		if (!allowed) {
			return res.status(400).json({ message: 'Source host not allowed' });
		}

		const headers = {};
		if (req.headers.range) headers.Range = req.headers.range;
		headers['User-Agent'] = req.headers['user-agent'] || 'MusicPlayer/1.0';

		const aborter = new NodeAbortController();
		let clientGone = false;
		const onClientAbort = () => {
			clientGone = true;
			try { aborter.abort(); } catch (_) {}
		};
		res.on('close', onClientAbort);
		req.on('aborted', onClientAbort);

		const upstream = await axios.get(url.toString(), {
			responseType: 'stream',
			headers,
			validateStatus: () => true,
			signal: aborter.signal,
		});

		const passthroughHeaders = [
			'content-type',
			'content-length',
			'accept-ranges',
			'content-range',
			'cache-control',
			'etag',
			'last-modified',
		];
		passthroughHeaders.forEach((h) => {
			const v = upstream.headers[h];
			if (v) res.setHeader(h, v);
		});
		if (!upstream.headers['accept-ranges']) res.setHeader('accept-ranges', 'bytes');
		if (!upstream.headers['cache-control']) res.setHeader('cache-control', 'no-store');

		const status = upstream.status === 206 ? 206 : upstream.status === 200 ? 200 : upstream.status;
		res.status(status);
		if (status >= 400) {
			upstream.data.on('data', () => {});
			upstream.data.on('end', () => res.end());
		} else {
			upstream.data.pipe(res);
			const cleanup = () => {
				try { upstream.data.unpipe(res); } catch (_) {}
				try { upstream.data.destroy(); } catch (_) {}
				try { res.end(); } catch (_) {}
			};
			res.on('close', cleanup);
			req.on('aborted', cleanup);
		}
	} catch (err) {
		console.error('Audio stream proxy error:', err.message);
		res.status(500).json({ message: 'Failed to stream audio' });
	}
};

