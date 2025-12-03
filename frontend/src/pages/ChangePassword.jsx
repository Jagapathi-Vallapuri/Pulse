import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Paper, TextField, Typography, InputAdornment, IconButton, CircularProgress } from '@mui/material';
import { Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import { changePassword } from '../../client.js';
import TwoFactorForm from '../components/auth/TwoFactorForm.jsx';
import { useUI } from '../context/UIContext.jsx';

const ChangePassword = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState('form'); // form | verify
    const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [show, setShow] = useState({ current: false, next: false, confirm: false });
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);
    const { toastError, toastSuccess, toastInfo } = useUI();

    const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const validate = () => {
        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            setMsg('All fields are required');
            toastError('All fields are required');
            return false;
        }
        if (formData.newPassword !== formData.confirmPassword) {
            setMsg('Passwords do not match');
            toastError('Passwords do not match');
            return false;
        }
        if (formData.newPassword.length < 6) {
            setMsg('New password must be at least 6 characters');
            toastError('New password must be at least 6 characters');
            return false;
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
            setMsg('Password must contain lowercase, uppercase, and a number');
            toastError('Password must contain lowercase, uppercase, and a number');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg(null);
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await changePassword(formData.currentPassword, formData.newPassword);
            if (res?.success) {
                setMode('verify');
                toastInfo('2FA code sent to your email');
            } else {
                const m = res?.message || 'Password change initiation failed';
                setMsg(m);
                toastError(m);
            }
        } catch (err) {
            const m = err?.message || 'Password change failed';
            setMsg(m);
            toastError(m);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (code) => {
        setLoading(true);
        setMsg(null);
        try {
            const email = JSON.parse(localStorage.getItem('user') || '{}').email;
            const { verify2FA } = await import('../../client.js');
            const res = await verify2FA(email, code, 'password-change');
            if (res?.success) {
                toastSuccess('Password changed successfully');
                setMode('form');
                setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                navigate('/profile');
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

    return (
        <Container component="main" maxWidth="sm">
            <Box sx={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
                <Paper elevation={0} sx={(theme) => ({ p: 5, width: '100%', maxWidth: 520, bgcolor: 'background.paper', borderRadius: 4, border: `1px solid ${theme.palette.divider}` })}>
                    <Typography variant="h4" align="center" gutterBottom>{mode === 'form' ? 'Change Password' : 'Verify Change'}</Typography>

                    {mode === 'form' && (
                        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <TextField
                                label="Current Password"
                                name="currentPassword"
                                type={show.current ? 'text' : 'password'}
                                value={formData.currentPassword}
                                onChange={onChange}
                                required
                                InputProps={{
                                    startAdornment: (<InputAdornment position="start"><Lock /></InputAdornment>),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShow(s => ({ ...s, current: !s.current }))} edge="end">
                                                {show.current ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            <TextField
                                label="New Password"
                                name="newPassword"
                                type={show.next ? 'text' : 'password'}
                                value={formData.newPassword}
                                onChange={onChange}
                                required
                                helperText="At least 6 chars, with upper, lower, and a number"
                                InputProps={{
                                    startAdornment: (<InputAdornment position="start"><Lock /></InputAdornment>),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShow(s => ({ ...s, next: !s.next }))} edge="end">
                                                {show.next ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            <TextField
                                label="Confirm New Password"
                                name="confirmPassword"
                                type={show.confirm ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={onChange}
                                required
                                InputProps={{
                                    startAdornment: (<InputAdornment position="start"><Lock /></InputAdornment>),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))} edge="end">
                                                {show.confirm ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            <Button type="submit" variant="contained" size="large" disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}>Submit</Button>
                            {msg && <Typography variant="caption" color="error" sx={{ mt: 1 }}>{msg}</Typography>}
                        </Box>
                    )}

                    {mode === 'verify' && (
                        <TwoFactorForm
                            onVerify={handleVerify}
                            onResend={handleSubmit}
                            onBack={() => setMode('form')}
                            loading={loading}
                            email={JSON.parse(localStorage.getItem('user') || '{}').email}
                            resendCooldown={0}
                        />
                    )}
                </Paper>
            </Box>
        </Container>
    );
};

export default ChangePassword;
