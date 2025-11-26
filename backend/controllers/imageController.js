const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');
const User = require('../models/User');
const Playlist = require('../models/Playlist');

let bucket;
const conn = mongoose.connection;
conn.once('open', () => {
    bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
});

const getPlaylistCover = async (req, res) => {
    try {
        const { id } = req.params;
        const playlist = await Playlist.findById(id).select('coverGridfsId coverMimeType');
        if (!playlist || !playlist.coverGridfsId) return res.status(404).json({ message: 'Cover not found' });
        try {
            const dl = bucket.openDownloadStream(new ObjectId(playlist.coverGridfsId));
            if (playlist.coverMimeType) res.set('Content-Type', playlist.coverMimeType);
            const cleanup = () => { try { dl.unpipe(res); } catch (_) { } try { dl.destroy(); } catch (_) { } try { res.end(); } catch (_) { } };
            dl.on('error', (e) => { cleanup(); res.status(500).json({ message: 'Stream error', error: e.message }); });
            res.on('close', cleanup);
            req.on('aborted', cleanup);
            dl.pipe(res);
        } catch (e) {
            return res.status(500).json({ message: 'Failed to stream cover', error: e.message });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to get cover', error: err.message });
    }
};

// Auth required: GET /api/images/me/avatar -> current user's avatar
const getMyAvatar = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('avatarGridfsId avatarMimeType');
        if (!user) return res.status(404).json({ message: 'Avatar not set' });
        if (user.avatarGridfsId) {
            try {
                const dl = bucket.openDownloadStream(new ObjectId(user.avatarGridfsId));
                if (user.avatarMimeType) res.set('Content-Type', user.avatarMimeType);
                const cleanup = () => { try { dl.unpipe(res); } catch (_) { } try { dl.destroy(); } catch (_) { } try { res.end(); } catch (_) { } };
                dl.on('error', (e) => { cleanup(); res.status(500).json({ message: 'Stream error', error: e.message }); });
                res.on('close', cleanup);
                req.on('aborted', cleanup);
                return dl.pipe(res);
            } catch (e) {
                return res.status(500).json({ message: 'Failed to stream avatar', error: e.message });
            }
        }
        return res.status(404).json({ message: 'Avatar not set' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to get avatar', error: err.message });
    }
};

module.exports = { getPlaylistCover, getMyAvatar };
