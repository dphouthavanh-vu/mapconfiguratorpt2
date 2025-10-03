import React from 'react';

interface ZoomOverlayButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

const ZoomOverlayButton: React.FC<ZoomOverlayButtonProps> = ({ onClick, children, disabled }) => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      pointerEvents: 'none', // allow only the button to be clickable
    }}
  >
    <button
      style={{
        pointerEvents: 'auto',
        padding: '18px 32px',
        background: 'none',
        color: '#fff',
        border: 'none',
        borderRadius: 10,
        fontWeight: 700,
        fontSize: 60,
        cursor: 'pointer',
        boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
        textAlign: 'center',
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  </div>
);

export default ZoomOverlayButton; 