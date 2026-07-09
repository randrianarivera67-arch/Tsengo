// src/App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import OAuthCallback from './pages/OAuthCallback';

const Home               = lazy(() => import('./pages/Home'));
const Profile            = lazy(() => import('./pages/Profile'));
const Friends            = lazy(() => import('./pages/Friends'));
const Messages           = lazy(() => import('./pages/Messages'));
const Notifications      = lazy(() => import('./pages/Notifications'));
const Settings           = lazy(() => import('./pages/Settings'));
const Reels              = lazy(() => import('./pages/Reels'));
const PostDetail         = lazy(() => import('./pages/PostDetail'));
const ArtistMessages     = lazy(() => import('./pages/ArtistMessages'));
const ArtistsAll         = lazy(() => import('./pages/ArtistsAll'));
const LanguageSettings   = lazy(() => import('./pages/LanguageSettings'));
const SecuritySettings   = lazy(() => import('./pages/SecuritySettings'));
const AppearanceSettings = lazy(() => import('./pages/AppearanceSettings'));
const VIPInfo            = lazy(() => import('./pages/VIPInfo'));
const AdminPanel         = lazy(() => import('./pages/AdminPanel'));
const BoostInfo          = lazy(() => import('./pages/BoostInfo'));
const Groups             = lazy(() => import('./pages/Groups'));
const GroupPage          = lazy(() => import('./pages/GroupPage'));
const Search             = lazy(() => import('./pages/Search'));
const Saved              = lazy(() => import('./pages/Saved'));
const Events             = lazy(() => import('./pages/Events'));
const Announcements      = lazy(() => import('./pages/Announcements'));
const Shop               = lazy(() => import('./pages/Shop'));
const Artists            = lazy(() => import('./pages/Artists'));
const ArtistDetail       = lazy(() => import('./pages/ArtistDetail'));
const ShopDetail          = lazy(() => import('./pages/ShopDetail'));
const Pages              = lazy(() => import('./pages/Pages'));
const PageDetail          = lazy(() => import('./pages/PageDetail'));
const Notes              = lazy(() => import('./pages/Notes'));

const Loader = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
    <div style={{ width:40, height:40, border:'4px solid #E4E6EB', borderTop:'4px solid #1877F2', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

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
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login"          element={<PublicRoute><Login /></PublicRoute>} />
        {/* Register gère lui-même la redirection (onboarding multi-étapes après création du compte) */}
        <Route path="/register"       element={<Register />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/"               element={<PrivateRoute><Layout><Home /></Layout></PrivateRoute>} />
        <Route path="/profile/:uid?"  element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
        <Route path="/friends"        element={<PrivateRoute><Layout><Friends /></Layout></PrivateRoute>} />
        <Route path="/groups"         element={<PrivateRoute><Layout><Groups /></Layout></PrivateRoute>} />
        <Route path="/groups/:groupId" element={<PrivateRoute><Layout><GroupPage /></Layout></PrivateRoute>} />
        <Route path="/search"         element={<PrivateRoute><Layout><Search /></Layout></PrivateRoute>} />
        <Route path="/saved"          element={<PrivateRoute><Layout><Saved /></Layout></PrivateRoute>} />
        <Route path="/events"         element={<PrivateRoute><Layout><Events /></Layout></PrivateRoute>} />
        <Route path="/announcements"  element={<PrivateRoute><Layout><Announcements /></Layout></PrivateRoute>} />
        <Route path="/shop"           element={<PrivateRoute><Layout><Shop /></Layout></PrivateRoute>} />
        <Route path="/artists"        element={<PrivateRoute><Layout><Artists /></Layout></PrivateRoute>} />
        <Route path="/artists/all/:type" element={<PrivateRoute><Layout><ArtistsAll /></Layout></PrivateRoute>} />
        <Route path="/artists/:artistId" element={<PrivateRoute><Layout><ArtistDetail /></Layout></PrivateRoute>} />
        <Route path="/artists/:artistId/messages" element={<PrivateRoute><ArtistMessages /></PrivateRoute>} />
        <Route path="/artists/:artistId/messages/:visitorUid" element={<PrivateRoute><ArtistMessages /></PrivateRoute>} />
        <Route path="/shop/:shopId"   element={<PrivateRoute><Layout><ShopDetail /></Layout></PrivateRoute>} />
        <Route path="/pages"          element={<PrivateRoute><Layout><Pages /></Layout></PrivateRoute>} />
        <Route path="/pages/:pageId"  element={<PrivateRoute><Layout><PageDetail /></Layout></PrivateRoute>} />
        <Route path="/notes"          element={<PrivateRoute><Layout><Notes /></Layout></PrivateRoute>} />
        <Route path="/messages"       element={<PrivateRoute><Layout><Messages /></Layout></PrivateRoute>} />
        <Route path="/messages/:chatId" element={<PrivateRoute><Layout><Messages /></Layout></PrivateRoute>} />
        <Route path="/notifications"  element={<PrivateRoute><Layout><Notifications /></Layout></PrivateRoute>} />
        <Route path="/settings"       element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
        <Route path="/settings/language"   element={<PrivateRoute><Layout><LanguageSettings /></Layout></PrivateRoute>} />
        <Route path="/settings/security"   element={<PrivateRoute><Layout><SecuritySettings /></Layout></PrivateRoute>} />
        <Route path="/settings/appearance" element={<PrivateRoute><Layout><AppearanceSettings /></Layout></PrivateRoute>} />
        <Route path="/vip"    element={<PrivateRoute><Layout><VIPInfo /></Layout></PrivateRoute>} />
        <Route path="/admin"  element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
        <Route path="/boost"  element={<PrivateRoute><Layout><BoostInfo /></Layout></PrivateRoute>} />
        <Route path="/reels"  element={<PrivateRoute><Layout><Reels /></Layout></PrivateRoute>} />
        <Route path="/post/:postId" element={<PrivateRoute><Layout><PostDetail /></Layout></PrivateRoute>} />
      </Routes>
    </Suspense>
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