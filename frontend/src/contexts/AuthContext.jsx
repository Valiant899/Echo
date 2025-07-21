import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { 
  auth,
  db,
  functions
} from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  applyActionCode,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userClaims, setUserClaims] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initAuthPersistence = useCallback(async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (err) {
      console.error("Auth persistence error:", err);
      throw new Error("Failed to initialize authentication");
    }
  }, []);

  const generateDefaultAvatar = useCallback((name) => {
    const encodedName = encodeURIComponent(name?.trim() || 'U');
    return `https://ui-avatars.com/api/?name=${encodedName}&background=4da6ff&color=fff&length=1&rounded=true`;
  }, []);

  const isValidFirebaseUser = useCallback((user) => {
    return user && typeof user.getIdToken === 'function' && user.uid;
  }, []);

  const handleEmailVerification = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user");
      
      const lastSent = localStorage.getItem(`verificationEmailSent:${user.uid}`);
      if (lastSent && Date.now() - parseInt(lastSent) < 60000) {
        throw new Error("Verification email was recently sent. Please check your inbox.");
      }

      await sendEmailVerification(user);
      localStorage.setItem(`verificationEmailSent:${user.uid}`, Date.now().toString());
      
      await user.reload();
      return { success: true };
    } catch (error) {
      console.error('Verification error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const getUserClaims = useCallback(async (user) => {
    if (!isValidFirebaseUser(user)) return null;
    try {
      const tokenResult = await user.getIdTokenResult(true);
      return tokenResult.claims;
    } catch (error) {
      console.error("Error fetching user claims:", error);
      return null;
    }
  }, [isValidFirebaseUser]);

  const ensureFreshToken = useCallback(async () => {
    if (!isValidFirebaseUser(auth.currentUser)) {
      throw new Error("No authenticated user");
    }
    try {
      const token = await auth.currentUser.getIdToken(true);
      console.log('Token refreshed');
      return token;
    } catch (error) {
      console.error("Token refresh error:", error);
      throw error;
    }
  }, [isValidFirebaseUser]);

  const reloadAuthUser = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        const claims = await getUserClaims(user);
        setCurrentUser(user);
        setUserClaims(claims);
        return user;
      }
      setCurrentUser(null);
      setUserClaims(null);
      return null;
    } catch (error) {
      console.error("Reload user error:", error);
      throw error;
    }
  }, [getUserClaims]);

  const updateUserProfilePicture = useCallback(async (photoURL) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      await Promise.all([
        updateProfile(user, { photoURL }),
        setDoc(doc(db, 'users', user.uid), {
          profilePicture: photoURL,
          lastUpdated: serverTimestamp()
        }, { merge: true })
      ]);

      await reloadAuthUser();
      return true;
    } catch (error) {
      console.error("Profile update failed:", error);
      setError(error.message);
      throw error;
    }
  }, [reloadAuthUser]);

  const signup = useCallback(async (email, password, name, username, birthDate) => {
    try {
      setError(null);
      await initAuthPersistence();

      if (!name?.trim() || !username?.trim() || !birthDate || isNaN(new Date(birthDate).getTime())) {
        throw new Error('All fields are required and birth date must be valid');
      }

      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        throw new Error('Email already in use');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const defaultAvatar = generateDefaultAvatar(name);

      await Promise.all([
        updateProfile(user, {
          displayName: name.trim(),
          photoURL: defaultAvatar
        }),
        setDoc(doc(db, 'users', user.uid), {
          email,
          displayName: name.trim(),
          authorname: username.trim(),
          birthDate,
          uid: user.uid,
          createdAt: serverTimestamp(),
          profilePicture: defaultAvatar,
          lastLogin: serverTimestamp(),
          emailVerified: false
        }),
        handleEmailVerification()
      ]);

      await reloadAuthUser();
      return user;
    } catch (error) {
      console.error("Signup failed:", error);
      setError(error.message);
      
      if (auth.currentUser?.uid) {
        try {
          await deleteUser(auth.currentUser);
        } catch (deleteError) {
          console.error("Cleanup failed:", deleteError);
        }
      }

      throw error;
    }
  }, [initAuthPersistence, generateDefaultAvatar, handleEmailVerification, reloadAuthUser]);

  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        lastLogin: serverTimestamp()
      }, { merge: true });
      await reloadAuthUser();
      return userCredential;
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage;
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Account temporarily locked due to too many attempts';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection';
          break;
        default:
          errorMessage = 'Login failed. Please try again';
      }
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [reloadAuthUser]);

  const logout = useCallback(async () => {
    try {
      const user = auth.currentUser;
      await signOut(auth);
      if (user) {
        localStorage.removeItem(`verificationEmailSent:${user.uid}`);
      }
      setCurrentUser(null);
      setUserClaims(null);
      setError(null);
    } catch (error) {
      console.error("Logout failed:", error);
      setError(error.message);
      throw error;
    }
  }, []);

  const deleteAccount = useCallback(async (password) => {
    try {
      setError(null);
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      await Promise.all([
        deleteDoc(doc(db, 'users', user.uid)),
        deleteUser(user)
      ]);

      localStorage.removeItem(`verificationEmailSent:${user.uid}`);
      await logout();
    } catch (error) {
      console.error("Account deletion failed:", error);
      setError(error.message);
      throw error;
    }
  }, [logout]);

  const sendPasswordResetEmailHandler = useCallback(async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      console.error("Password reset failed:", error);
      let errorMessage;
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later';
          break;
        default:
          errorMessage = 'Failed to send password reset email';
      }
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const verifyEmailWithCode = useCallback(async (oobCode) => {
    try {
      setError(null);
      await applyActionCode(auth, oobCode);
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          emailVerified: true
        }, { merge: true });
        await reloadAuthUser();
      }
      return true;
    } catch (error) {
      console.error("Email verification failed:", error);
      setError(error.message);
      throw error;
    }
  }, [reloadAuthUser]);

  useEffect(() => {
    let unsubscribe;
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        setError('Authentication initialization timed out');
        setLoading(false);
      }
    }, 10000);

    const initializeAuth = async () => {
      try {
        await initAuthPersistence();
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!mounted) return;
          
          try {
            if (user) {
              await reloadAuthUser();
            } else {
              setCurrentUser(null);
              setUserClaims(null);
            }
          } catch (error) {
            console.error("Auth state error:", error);
            setError(error.message);
          } finally {
            if (mounted) setLoading(false);
          }
        });
      } catch (error) {
        if (mounted) {
          setError(error.message);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(timeout);
      if (unsubscribe) unsubscribe();
    };
  }, [initAuthPersistence, reloadAuthUser]);

  const contextValue = useMemo(() => ({
    currentUser,
    userClaims,
    loading,
    error,
    signup,
    login,
    logout,
    reloadUser: reloadAuthUser,
    deleteAccount,
    sendPasswordResetEmail: sendPasswordResetEmailHandler,
    verifyEmail: verifyEmailWithCode,
    sendVerificationEmail: handleEmailVerification,
    updateProfilePicture: updateUserProfilePicture,
    clearError: () => setError(null),
    isValidFirebaseUser,
    ensureFreshToken,
    getUserClaims
  }), [
    currentUser,
    userClaims,
    loading,
    error,
    signup,
    login,
    logout,
    reloadAuthUser,
    deleteAccount,
    sendPasswordResetEmailHandler,
    verifyEmailWithCode,
    handleEmailVerification,
    updateUserProfilePicture,
    isValidFirebaseUser,
    ensureFreshToken,
    getUserClaims
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading ? children : (
        <div className="auth-loading-overlay">
          <div className="auth-spinner" aria-busy="true" />
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};