import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import { login } from '../../client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Container, Paper, Typography, Alert, Link } from '@mui/material';
import LoginForm from '../components/auth/LoginForm.jsx';
import { useUI } from '../context/UIContext.jsx';
import { motion } from 'framer-motion';

const Login = () => {
    const [email, setEmail] = useState('');
    const [msg, setMsg] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const auth = useAuth();
    const { toastError, toastSuccess } = useUI();

    // If the user is already authenticated, send them to /home
    useEffect(() => {
        if (auth?.isAuthenticated) {
            navigate('/home');
        }
    }, [auth?.isAuthenticated, navigate]);

    const handleLogin = async ({ email: eEmail, password }) => {
        setMsg(null);
        setLoading(true);
        try {
            setEmail(eEmail);
            const response = await login(eEmail, password);
            if (response && response.success && response.data && response.data.token) {
                auth.login(response.data.token, response.data.user);
                toastSuccess('Logged in successfully');
                navigate('/home');
                return;
            }
            const m = response?.message || 'Login failed';
            setMsg(m);
            toastError(m);
        } catch (error) {
            const m = error?.message || 'Login error';
            setMsg(m);
            toastError(m);
        } finally {
            setLoading(false);
        }
    }
    // Removed 2FA related hooks/state

    return (
        <Container component="main" maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{
                minHeight: 'calc(100vh - 64px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6
            }}>
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
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'stretch',
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
                            Welcome Back
                        </Typography>

                        {msg && (
                            <Alert
                                severity={msg === 'Code resent' ? 'success' : 'error'}
                                sx={{ width: '100%', mb: 2 }}
                            >
                                {msg}
                            </Alert>
                        )}

                        <LoginForm onSubmit={handleLogin} loading={loading} initialEmail={email} />

                        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                            Don't have an account?{' '}
                            <Link component={RouterLink} to="/register" variant="subtitle2" underline="hover" sx={{ fontWeight: 600 }}>
                                Create one
                            </Link>
                        </Typography>
                    </Paper>
                </motion.div>
            </Box>
        </Container>
    );
}

export default Login;