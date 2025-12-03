import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { register } from "../../client.js";
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Alert,
    Link,
    InputAdornment,
    IconButton,
    CircularProgress
} from '@mui/material';
import {
    Person,
    Email,
    Lock,
    Visibility,
    VisibilityOff
} from '@mui/icons-material';
import TwoFactorForm from '../components/auth/TwoFactorForm.jsx';
import { useUI } from '../context/UIContext.jsx';
import { motion } from 'framer-motion';

const Register = () => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [msg, setMsg] = useState(null);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('form'); // 'form' | 'verify'
    const [sessionId, setSessionId] = useState(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const navigate = useNavigate();
    const { toastError, toastSuccess, toastInfo } = useUI();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const validateForm = () => {
        if (formData.password !== formData.confirmPassword) {
            setMsg('Passwords do not match');
            toastError('Passwords do not match');
            return false;
        }
        if (formData.password.length < 6) {
            setMsg('Password must be at least 6 characters long');
            toastError('Password must be at least 6 characters long');
            return false;
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            setMsg('Password must contain at least one lowercase letter, one uppercase letter, and one number');
            toastError('Password must contain at least one lowercase letter, one uppercase letter, and one number');
            return false;
        }
        return true;
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setMsg(null);
        if (!validateForm()) return;
        setLoading(true);
        try {
            const response = await register(formData.username, formData.email, formData.password);
            if (response?.success && response?.data?.twoFactorRequired && response?.data?.sessionId) {
                setSessionId(response.data.sessionId);
                sessionStorage.setItem('registerSessionId', response.data.sessionId);
                sessionStorage.setItem('registerEmail', formData.email);
                setMode('verify');
                setResendCooldown(30);
                setMsg('Verification code sent to your email');
                toastInfo('Verification code sent to your email');
                startResendTimer();
            } else {
                const m = response?.message || 'Registration failed';
                setMsg(m);
                toastError(m);
            }
        } catch (error) {
            const m = error?.message || 'Registration error';
            setMsg(m);
            toastError(m);
        } finally {
            setLoading(false);
        }
    };

    const startResendTimer = () => {
        const iv = setInterval(() => {
            setResendCooldown(s => {
                if (s <= 1) { clearInterval(iv); return 0; }
                return s - 1;
            });
        }, 1000);
    };

    const handleVerify = async (code) => {
        setLoading(true);
        setMsg(null);
        try {
            const { verify2FA } = await import('../../client.js');
            const email = sessionStorage.getItem('registerEmail') || formData.email;
            const sid = sessionStorage.getItem('registerSessionId') || sessionId;
            const res = await verify2FA(email, code, 'register', sid);
            if (res?.success && res?.data?.token) {
                setMsg('Account verified! Redirecting to login...');
                toastSuccess('Account verified');
                setTimeout(() => navigate('/'), 1500);
            } else {
                const m = res?.message || 'Verification failed';
                setMsg(m);
                toastError(m);
            }
        } catch (err) {
            const m = err?.message || 'Verification error';
            setMsg(m);
            toastError(m);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setLoading(true);
        setMsg(null);
        try {
            // trigger re-register to resend code (could add dedicated endpoint later)
            const response = await register(formData.username, formData.email, formData.password);
            if (response?.success && response?.data?.sessionId) {
                setSessionId(response.data.sessionId);
                sessionStorage.setItem('registerSessionId', response.data.sessionId);
                setMsg('Code resent');
                toastInfo('Verification code resent');
                setResendCooldown(30);
                startResendTimer();
            } else {
                const m = response?.message || 'Resend failed';
                setMsg(m);
                toastError(m);
            }
        } catch (err) {
            const m = err?.message || 'Resend failed';
            setMsg(m);
            toastError(m);
        } finally { setLoading(false); }
    };

    const handleBack = () => {
        setMode('form');
        setMsg(null);
    };

    useEffect(() => {
        const existingSid = sessionStorage.getItem('registerSessionId');
        const existingEmail = sessionStorage.getItem('registerEmail');
        if (existingSid && existingEmail) {
            setSessionId(existingSid);
            setFormData(f => ({ ...f, email: existingEmail }));
            setMode('verify');
            if (resendCooldown === 0) setResendCooldown(10);
            startResendTimer();
        }
    }, []);

    return (
        <Container component="main" maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
            <Box
                sx={{
                    minHeight: 'calc(100vh - 64px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 6
                }}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    style={{ width: '100%', maxWidth: 520 }}
                >
                    <Paper
                        elevation={0}
                        sx={(theme) => ({
                            p: 5,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            width: '100%',
                            gap: 2,
                            bgcolor: 'background.paper',
                            borderRadius: 4,
                            boxShadow: theme.palette.mode === 'light'
                                ? '0 4px 12px rgba(0,0,0,0.05)'
                                : '0 4px 12px rgba(0,0,0,0.3)',
                            position: 'relative',
                            border: `1px solid ${theme.palette.divider}`
                        })}
                    >
                        <Typography component="h1" variant="h4" gutterBottom sx={{ textAlign: 'center' }}>
                            {mode === 'form' ? 'Create your account' : 'Verify your email'}
                        </Typography>

                        {msg && (
                            <Alert
                                severity={msg.includes('successful') ? 'success' : 'error'}
                                sx={{ width: '100%', mb: 2 }}
                            >
                                {msg}
                            </Alert>
                        )}

                        {mode === 'form' && (
                            <Box component="form" onSubmit={handleRegister} sx={{ mt: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="username"
                                    label="Username"
                                    name="username"
                                    autoComplete="username"
                                    autoFocus
                                    value={formData.username}
                                    onChange={handleChange}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Person />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="email"
                                    label="Email Address"
                                    name="email"
                                    autoComplete="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Email />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    autoComplete="new-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Lock />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="toggle password visibility"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    edge="end"
                                                >
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="confirmPassword"
                                    label="Confirm Password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="confirmPassword"
                                    autoComplete="new-password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Lock />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="toggle confirm password visibility"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    edge="end"
                                                >
                                                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2 }} disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}>
                                    {loading ? 'Creating Account...' : 'Create Account'}
                                </Button>
                            </Box>
                        )}
                        {mode === 'verify' && (
                            <TwoFactorForm
                                onVerify={handleVerify}
                                onResend={handleResend}
                                onBack={handleBack}
                                loading={loading}
                                email={formData.email}
                                resendCooldown={resendCooldown}
                            />
                        )}

                        {mode === 'form' && (
                            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                                Already have an account?{' '}
                                <Link component={RouterLink} to="/" variant="subtitle2" underline="hover" sx={{ fontWeight: 600 }}>
                                    Sign in
                                </Link>
                            </Typography>
                        )}
                    </Paper>
                </motion.div>
            </Box>
        </Container>
    );
}

export default Register;