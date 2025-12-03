const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { send2FACode } = require('../services/emailService');
const cache = require('../services/cacheService');

const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, isVerified: false });
        await newUser.save();

        const sessionId = randomUUID();
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await cache.set(`2fa:session:${sessionId}`, JSON.stringify({ code, email, purpose: 'register' }), 300);
        await send2FACode(newUser.email, code);

        return res.status(201).json({
            success: true,
            message: 'Registration initiated. 2FA code sent to email. Verify to activate account.',
            data: {
                sessionId,
                twoFactorRequired: true,
                type: 'register'
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ success: false, message: 'Error registering user', error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' });
    }
};

const { randomUUID } = require('crypto');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        if (!user.isVerified) return res.status(403).json({ success: false, message: 'Account not verified. Please complete email 2FA from registration.' });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30m' });
        const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        await cache.set(refreshToken, user._id, 604800);
        return res.json({ success: true, message: 'Login successful', data: { token, refreshToken, user: { id: user._id, username: user.username, email: user.email } } });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Login failed', error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' });
    }
};

const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Missing refresh token' });
        }

        const userId = await cache.get(refreshToken);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30m' });
        return res.json({ success: true, message: 'Refresh successful', data: { token, refreshToken, user: { id: user._id, username: user.username, email: user.email } } });
    }
    catch (err) {
        console.error('Refresh error:', err);
        return res.status(500).json({ success: false, message: 'Refresh failed', error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' });
    }
};

const verify2FAUnified = async (req, res) => {
    try {
        const { email, code, type, sessionId } = req.body;
        if (!type || !['password-change', 'register'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing type. Must be "login", "register" or "password-change"' });
        }

        if (type === 'register') {
            if (!sessionId) return res.status(400).json({ success: false, message: 'Missing sessionId for registration verification' });
            const key = `2fa:session:${sessionId}`;
            const raw = await cache.get(key);
            if (!raw) return res.status(401).json({ success: false, message: 'Invalid or expired 2FA code' });
            let parsed;
            try { parsed = JSON.parse(raw); } catch { parsed = { code: raw }; }
            if (parsed.code !== code || parsed.purpose !== 'register' || parsed.email !== email) {
                return res.status(401).json({ success: false, message: 'Invalid or expired 2FA code' });
            }
            await cache.del(key);

            const user = await User.findOne({ email });
            if (!user) return res.status(400).json({ success: false, message: 'User not found' });

            if (!user.isVerified) {
                user.isVerified = true;
                await user.save();
            }
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30m' });
            return res.json({ success: true, message: 'Registration verification successful', data: { token, user: { id: user._id, username: user.username, email: user.email } } });
        } else if (type === 'password-change') {
            const user = await User.findOne({ email });
            if (!user) return res.status(400).json({ success: false, message: 'User not found' });

            if (!(await verify2FACode(user._id, code))) {
                return res.status(401).json({ success: false, message: 'Invalid or expired 2FA code' });
            }

            const pendingPassword = await cache.get(`pendingPassword:${user._id}`);
            if (pendingPassword) {
                user.password = pendingPassword;
                await user.save();
                await cache.del(`pendingPassword:${user._id}`);
            }
            return res.json({ success: true, message: 'Password change confirmed successfully' });
        }
    } catch (err) {
        console.error('Unified 2FA verification error:', err);
        return res.status(500).json({ success: false, message: '2FA verification failed', error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await cache.set(`2fa:${user._id}`, code, 300);
        await cache.set(`pendingPassword:${user._id}`, await bcrypt.hash(newPassword, 10), 300);
        await send2FACode(user.email, code);

        res.json({ success: true, message: '2FA code sent to your email. Please verify to confirm password change.' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ success: false, message: 'Password change failed', error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' });
    }
};

const verify2FACode = async (userId, code) => {
    const storedCode = await cache.get(`2fa:${userId}`);
    if (!storedCode || storedCode !== code) {
        return false;
    }
    await cache.del(`2fa:${userId}`);
    await set2FAVerified(userId);
    return true;
};

const is2FAVerified = async (userId) => {
    const verified = await cache.get(`2faVerified:${userId}`);
    return verified === 'true';
};

const set2FAVerified = async (userId) => {
    await cache.set(`2faVerified:${userId}`, 'true', 300);
};

module.exports = { register, login, refresh, verify2FAUnified, changePassword, is2FAVerified, set2FAVerified, verify2FACode };