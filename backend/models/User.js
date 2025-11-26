const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    favorites: [String],
    playlists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Playlist' }],
    history: [
        {
            trackId: String,
            listenedAt: { type: Date, default: Date.now }
        }
    ],
    profilePicture: { type: Buffer },
    profilePictureType: { type: String },
    about: { type: String, maxlength: 500, default: '' },
    avatarFilename: { type: String },
    avatarMimeType: { type: String },
    avatarGridfsId: { type: mongoose.Schema.Types.ObjectId },
    uploadedSongs: []
});

module.exports = mongoose.model('User', userSchema);  