import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from 'styled-components';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import RequireVerifiedEmail from './components/RequireVerifiedEmail';
import { AuthProvider } from './contexts/AuthContext';
import { LiveKitProvider } from './contexts/LiveKitContext';
import ErrorBoundary from './components/ErrorBoundary';
import VerificationBanner from './components/VerificationBanner';
import Avatar from './components/Avatar';
import { Buffer } from 'buffer';
window.Buffer = Buffer;

// Lazy-loaded components
const lazyLoad = (componentName) => lazy(() =>
  import(`./pages/${componentName}.jsx`).catch((err) => {
    console.error(`Failed to load ${componentName}:`, err);
    return { default: () => <div className="p-4 text-red-500">Error loading {componentName}</div> };
  })
);

const VoiceRooms = lazyLoad('VoiceRooms');
const NewsFeed = lazyLoad('NewsFeed');
const TextRoomView = lazyLoad('TextRoomView');
const RoomCreationPage = lazyLoad('RoomCreationPage');
const SearchResults = lazyLoad('SearchResults');
const Profile = lazyLoad('Profile');
const Highlights = lazyLoad('Highlights');
const HighlightCreationPage = lazyLoad('HighlightCreationPage');
const VerifyEmail = lazyLoad('VerifyEmail');
const VerifyRequired = lazyLoad('VerifyRequired');
const VerificationSuccess = lazyLoad('VerificationSuccess');
const VoiceRoomPage = lazyLoad('VoiceRoomPage');
const VoiceRoomCreation = lazyLoad('VoiceRoomCreation');

// Theme object
const theme = {
  darkBg: '#121212',
  panelBg: '#1e1e1e',
  accent: '#4da6ff',
  textLight: '#e0e0e0',
  textMuted: '#a0a0a0',
  highlight: '#7c4dff',
  success: '#28a745',
  danger: '#dc3545'
};

function App() {
  return (
    <AuthProvider>
      <LiveKitProvider>
        <ThemeProvider theme={theme}>
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: theme.darkBg,
              color: theme.textLight,
              fontFamily: "'Inter', sans-serif"
            }}
          >
            <ErrorBoundary>
              <Header AvatarComponent={Avatar} />
              <VerificationBanner />
            </ErrorBoundary>

            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: theme.panelBg,
                  color: theme.textLight,
                  border: `1px solid ${theme.accent}`
                },
                success: {
                  style: {
                    background: theme.panelBg,
                    color: theme.success,
                    border: `1px solid ${theme.success}`
                  }
                },
                error: {
                  style: {
                    background: theme.panelBg,
                    color: theme.danger,
                    border: `1px solid ${theme.danger}`
                  }
                }
              }}
            />

            <main
              style={{
                flex: 1,
                padding: '1rem',
                maxWidth: '1400px',
                width: '100%',
                margin: '0 auto',
                position: 'relative'
              }}
            >
              <ErrorBoundary>
                <Suspense fallback={<LoadingSpinner fullPage />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/rooms" replace />} />
                    
                    {/* Main content routes */}
                    <Route path="/rooms" element={<VoiceRooms />} />
                    <Route path="/news" element={<NewsFeed />} />
                    <Route path="/highlights/:id?" element={<Highlights />} />
                    
                    {/* Auth routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/verify-required" element={<VerifyRequired />} />
                    <Route path="/verification-success" element={<VerificationSuccess />} />

                    {/* Protected routes */}
                    <Route element={<ProtectedRoute />}>
                      {/* Profile routes */}
                      <Route path="/profile" element={<Profile AvatarComponent={Avatar} />} />
                      <Route path="/profile/:userId" element={<Profile AvatarComponent={Avatar} />} />
                      
                      {/* Search */}
                      <Route path="/search" element={<SearchResults />} />
                      
                      {/* Room creation */}
                      <Route
                        path="/create-room"
                        element={
                          <RequireVerifiedEmail>
                            <RoomCreationPage />
                          </RequireVerifiedEmail>
                        }
                      />
                      <Route
                        path="/create-room/voice"
                        element={
                          <RequireVerifiedEmail>
                            <VoiceRoomCreation />
                          </RequireVerifiedEmail>
                        }
                      />
                      
                      {/* Highlight creation */}
                      <Route
                        path="/create-highlight"
                        element={
                          <RequireVerifiedEmail>
                            <HighlightCreationPage />
                          </RequireVerifiedEmail>
                        }
                      />
                      
                      {/* Room viewing */}
                      <Route 
                        path="/room/text/:roomId" 
                        element={
                          <RequireVerifiedEmail>
                            <TextRoomView AvatarComponent={Avatar} />
                          </RequireVerifiedEmail>
                        } 
                      />
                      <Route 
                        path="/room/:roomId" 
                        element={
                          <RequireVerifiedEmail>
                            <VoiceRoomPage />
                          </RequireVerifiedEmail>
                        } 
                      />
                    </Route>

                    {/* Error routes */}
                    <Route path="/404" element={<NotFound />} />
                    <Route path="*" element={<Navigate to="/404" replace />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
        </ThemeProvider>
      </LiveKitProvider>
    </AuthProvider>
  );
}

export default App;