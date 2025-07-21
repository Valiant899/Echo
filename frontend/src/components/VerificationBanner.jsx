import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/firebase';
import { sendEmailVerification, onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function VerificationBanner() {
  const { currentUser, reloadUser } = useAuth();
  const [cooldown, setCooldown] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Check verification status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await reloadUser();
        setIsVisible(!user.emailVerified);
      } else {
        setIsVisible(false);
      }
    });
    return () => unsubscribe();
  }, [reloadUser]);

  // Cooldown timer
  useEffect(() => {
    const timer = cooldown > 0 && setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => timer && clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isSending || !auth.currentUser) return;
    
    setIsSending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setCooldown(30);
      toast.success('Verification email sent!', {
        position: 'top-center'
      });
    } catch (error) {
      toast.error(error.message || "Failed to send verification");
    } finally {
      setIsSending(false);
    }
  };

  if (!isVisible || !currentUser) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="verification-banner"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-50 bg-amber-100 border-b border-amber-200 shadow-sm"
      >
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-amber-900">
                Please verify your email address
              </p>
              <p className="text-xs text-amber-800 mt-1">
                {cooldown > 0 
                  ? `Check your inbox (resend in ${cooldown}s)`
                  : "Didn't receive the email?"}
              </p>
            </div>
            
            <motion.button
              onClick={handleResend}
              disabled={cooldown > 0 || isSending}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                cooldown > 0 || isSending
                  ? 'bg-amber-200 text-amber-700 cursor-not-allowed'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              {isSending ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Resend Email'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}