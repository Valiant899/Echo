// src/lib/auth.js
import { getAuth, sendEmailVerification } from 'firebase/auth';
import { customFetch } from './api';

export const sendCustomVerificationEmail = async (user) => {
  const auth = getAuth();
  const actionCodeSettings = {
    url: `${window.location.origin}/verify-email?from=email`,
    handleCodeInApp: true
  };
  
  try {
    // 1. Send default Firebase verification
    await sendEmailVerification(user, actionCodeSettings);
    
    // 2. Send your custom email via your backend
    await customFetch('/api/send-verification-email', {
      method: 'POST',
      body: JSON.stringify({ userId: user.uid })
    });
    
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};