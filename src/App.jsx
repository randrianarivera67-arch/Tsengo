// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Friends from './pages/Friends';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Reels from './pages/Reels';
import LanguageSettings from './pages/LanguageSettings';
import SecuritySettings from './pages/SecuritySettings';
import AppearanceSettings from './pages/AppearanceSettings';
import VIPInfo from './pages/VIPInfo';
import AdminPanel from './pages/AdminPanel';
import BoostInfo from './pages/BoostInfo';
import PostDetail from './pages/PostDetail';
import OAuthCallback from './pages/OAuthCallback';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}
function PublicRoute({ children }) {
  const { currentUser } = useAuth();
  return !currentUser ? children : <Navigate to="/" />;
}
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><Layout><Home /></Layout></PrivateRoute>} />
      <Route path="/profile/:uid?" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
      <Route path="/friends" element={<PrivateRoute><Layout><Friends /></Layout></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><Layout><Messages /></Layout></PrivateRoute>} />
      <Route path="/messages/:chatId" element={<PrivateRoute><Layout><Messages /></Layout></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Layout><Notifications /></Layout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
      <Route path="/settings/language" element={<PrivateRoute><Layout><LanguageSettings /></Layout></PrivateRoute>} />
      <Route path="/settings/security" element={<PrivateRoute><Layout><SecuritySettings /></Layout></PrivateRoute>} />
      <Route path="/settings/appearance" element={<PrivateRoute><Layout><AppearanceSettings /></Layout></PrivateRoute>} />
      <Route path="/vip" element={<PrivateRoute><Layout><VIPInfo /></Layout></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
      <Route path="/boost" element={<PrivateRoute><Layout><BoostInfo /></Layout></PrivateRoute>} />
      <Route path="/reels" element={<PrivateRoute><Layout><Reels /></Layout></PrivateRoute>} />
      <Route path="/post/:postId" element={<PrivateRoute><Layout><PostDetail /></Layout></PrivateRoute>} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
    </Routes>
  );
}
export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
