const express = require('express');
const router = express.Router();
const { register, login, refresh, verify2FAUnified, changePassword } = require('../controllers/authController.js');
const { validateRegister, validateLogin } = require('../middleware/validationMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const verifyToken = require('../middleware/authMiddleware');

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/refresh', authLimiter, refresh);
router.post('/verify-2fa', authLimiter, verify2FAUnified);
router.post('/change-password', authLimiter, verifyToken, changePassword);
router.get('/validate', verifyToken, (req, res) => {
    res.json({ valid: true, user: { id: req.user._id, username: req.user.username, email: req.user.email } });
});

module.exports = router;