import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, Suspense, lazy } from 'react';
import Header from "./components/Header";
import LoadingSpinner from "./components/LoadingSpinner";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from './contexts/AuthContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import ErrorBoundary from './components/ErrorBoundary';

// Improved lazy load function with explicit paths
const lazyLoad = (componentName) => lazy(() => import(`./pages/${componentName}.jsx`)
  .catch((err) => {
    console.error(`Failed to load ${componentName}:`, err);
    return { default: () => <div className="p-4 text-red-500">Error loading {componentName}</div> };
  }));

// Lazy loaded components with explicit .jsx extensions
const VoiceRooms = lazyLoad("VoiceRooms");
const NewsFeed = lazyLoad("NewsFeed");
const RoomView = lazyLoad("RoomView");
const RoomCreationPage = lazyLoad("RoomCreationPage");
const SearchResults = lazyLoad("SearchResults");
const Profile = lazyLoad("Profile");
const Highlights = lazyLoad("Highlights");
const HighlightCreationPage = lazyLoad("HighlightCreationPage");

const colors = {
  darkBg: "#121212",
  panelBg: "#1e1e1e",
  accent: "#4da6ff",
  textLight: "#e0e0e0",
  textMuted: "#a0a0a0",
  danger: "#dc3545",
  success: "#28a745"
};

function App() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? "Logged in" : "Logged out");
    });
    return unsubscribe;
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div style={{ 
          minHeight: "100vh", 
          display: "flex", 
          flexDirection: "column",
          backgroundColor: colors.darkBg,
          color: colors.textLight,
          fontFamily: "'Inter', sans-serif"
        }}>
          <Header />
          
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
            toastStyle={{
              backgroundColor: colors.panelBg,
              color: colors.textLight,
              border: `1px solid ${colors.accent}`
            }}
            progressStyle={{
              backgroundColor: colors.accent,
            }}
          />

          <main style={{ 
            flex: 1, 
            padding: "1rem",
            maxWidth: "1400px",
            width: "100%",
            margin: "0 auto",
            position: "relative"
          }}>
            <ErrorBoundary>
              <Suspense fallback={<LoadingSpinner fullPage />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/rooms" replace />} />
                  <Route path="/rooms" element={<VoiceRooms />} />
                  <Route path="/news" element={<NewsFeed />} />
                  <Route path="/highlights" element={<Highlights />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/search" element={<SearchResults />} />
                  
                  {/* Protected Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/create-room" element={<RoomCreationPage />} />
                    <Route path="/room/:roomId" element={<RoomView />} />
                    <Route path="/create-highlight" element={<HighlightCreationPage />} />
                  </Route>
                  
                  {/* Error Routes */}
                  <Route path="/404" element={<NotFound />} />
                  <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;