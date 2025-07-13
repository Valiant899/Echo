import React from 'react';

const LoadingSpinner = ({ fullPage = false }) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: fullPage ? '100vh' : 'auto',
      width: fullPage ? '100vw' : 'auto',
      backgroundColor: fullPage ? 'rgba(0,0,0,0.7)' : 'transparent'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '5px solid #f3f3f3',
        borderTop: '5px solid #4da6ff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;