import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

/**
 * Sends a password reset email to the specified email address
 * @param {string} email - User's email address
 * @param {string} [redirectBaseUrl] - Base URL for redirection (default: current origin)
 * @returns {Promise<void>}
 */
export const sendPasswordReset = async (
  email, 
  redirectBaseUrl = window.location.origin
) => {
  if (!email) {
    throw new Error('Email is required');
  }

  const actionCodeSettings = {
    url: `${redirectBaseUrl}/reset-password`,
    handleCodeInApp: true
  };

  try {
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
  } catch (error) {
    console.error('Password reset email sending failed:', {
      message: error.message,
      code: error.code,
      details: error.details || 'No additional details'
    });
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};