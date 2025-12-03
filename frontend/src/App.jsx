import './App.css'
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import UserProfile from './pages/UserProfile.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import AlbumPage from './pages/Album.jsx';
import AlbumsPage from './pages/Albums.jsx';
import PlaylistsPage from './pages/Playlists.jsx';
import PlaylistDetailPage from './pages/PlaylistDetail.jsx';
import UploadSongPage from './pages/UploadSong.jsx';
import SearchPage from './pages/Search.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import PlayerBar from './components/PlayerBar.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

const AuthedPlayer = () => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <PlayerBar /> : null;
};

import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import PageTransition from './components/PageTransition.jsx';

const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={<PageTransition><Login /></PageTransition>} />
                <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
                <Route path="/home" element={<ProtectedRoute><PageTransition><Home /></PageTransition></ProtectedRoute>} />
                <Route path="/albums" element={<ProtectedRoute><PageTransition><AlbumsPage /></PageTransition></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><PageTransition><SearchPage /></PageTransition></ProtectedRoute>} />
                <Route path="/playlists" element={<ProtectedRoute><PageTransition><PlaylistsPage /></PageTransition></ProtectedRoute>} />
                <Route path="/playlists/:id" element={<ProtectedRoute><PageTransition><PlaylistDetailPage /></PageTransition></ProtectedRoute>} />
                <Route path="/playlist/:id" element={<ProtectedRoute><PageTransition><PlaylistDetailPage /></PageTransition></ProtectedRoute>} />
                <Route path="/upload" element={<ProtectedRoute><PageTransition><UploadSongPage /></PageTransition></ProtectedRoute>} />
                <Route path="/album/:id" element={<ProtectedRoute><PageTransition><AlbumPage /></PageTransition></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><PageTransition><UserProfile /></PageTransition></ProtectedRoute>} />
                <Route path="/settings/password" element={<ProtectedRoute><PageTransition><ChangePassword /></PageTransition></ProtectedRoute>} />
            </Routes>
        </AnimatePresence>
    );
};

function App() {

    return (
        <Router>
            <AuthProvider>
                <Header />
                <AnimatedRoutes />
                <AuthedPlayer />
            </AuthProvider>
        </Router>
    )
}

export default App
