import React, { useState, useEffect } from 'react';
import styles from './FullscreenModal.module.scss';


interface FullscreenModalProps {
  open: boolean;
  contentUrl: string;
  landmarkName?: string;
  landmarkSubtitle?: string;
  landmarkContent?: string;
  onClose: () => void;
  onReset: () => void;
}

const FullscreenModal: React.FC<FullscreenModalProps> = ({ 
  open, 
  contentUrl, 
  landmarkName, 
  landmarkSubtitle, 
  landmarkContent, 
  onClose, 
  onReset 
}) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState<NodeJS.Timeout | null>(null);

  // Static UI values (removed UI scaling)
  const getScaledFontSize = (size: number) => size;
  const getScaledPadding = (padding: number) => padding;
  const getScaledBorderRadius = (radius: number) => radius;

  // Reset states when modal opens or contentUrl changes
  useEffect(() => {
    if (open) {
      if (contentUrl) {
        // There's a contentUrl - show loading state
        setIframeLoading(true);
        setIframeError(false);

        // Set a timeout for slow-loading iframes (15 seconds)
        const timeout = setTimeout(() => {
          if (iframeLoading) {
            setIframeError(true);
            setIframeLoading(false);
          }
        }, 15000);

        setLoadTimeout(timeout);

        return () => {
          if (timeout) clearTimeout(timeout);
        };
      } else {
        // No contentUrl - don't show loading state
        setIframeLoading(false);
        setIframeError(false);
      }
    }
  }, [open, contentUrl]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };
  }, [loadTimeout]);

  if (!open) return null;
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.videoArea}>
        {landmarkName && (
          <div className={styles.landmarkHeader}>
            <h2 className={styles.landmarkName}>{landmarkName}</h2>
            {landmarkSubtitle && (
              <p className={styles.landmarkSubtitle}>{landmarkSubtitle}</p>
            )}
          </div>
        )}
        
        {iframeLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading external content...</p>
            <p style={{ fontSize: '14px', opacity: 0.7 }}>This may take a few moments</p>
          </div>
        )}
        
        {iframeError && (
          <div className={styles.errorState}>
            <p>⚠️ Content loading timeout</p>
            <p>The external content is taking longer than expected to load.</p>
            <button 
              onClick={() => {
                setIframeError(false);
                setIframeLoading(true);
                // Reload the iframe
                const iframe = document.querySelector('iframe');
                if (iframe) {
                  iframe.src = iframe.src;
                }
              }}
              style={{
                marginTop: '12px',
                padding: `${getScaledPadding(8)}px ${getScaledPadding(16)}px`,
                backgroundColor: '#0086FF',
                color: '#fff',
                border: 'none',
                borderRadius: getScaledBorderRadius(4),
                cursor: 'pointer',
                fontSize: getScaledFontSize(14),
              }}
            >
              Retry
            </button>
          </div>
        )}

        {contentUrl && (
          <iframe
            src={contentUrl}
            className={styles.video}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '8px',
              display: iframeLoading || iframeError ? 'none' : 'block'
            }}
            title={landmarkName || 'Landmark Content'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => {
            setIframeLoading(false);
            if (loadTimeout) {
              clearTimeout(loadTimeout);
              setLoadTimeout(null);
            }
          }}
          onError={() => {
            setIframeLoading(false);
            setIframeError(true);
            if (loadTimeout) {
              clearTimeout(loadTimeout);
              setLoadTimeout(null);
            }
          }}
        />
        )}

        {landmarkContent && (
          <div className={styles.landmarkContent}>
            <p>{landmarkContent}</p>
          </div>
        )}
      </div>
      <div className={styles.bottomBar}>
        <div className={styles.actions}>
          <button 
            onClick={onClose}
            style={{
              fontSize: getScaledFontSize(18),
              padding: `${getScaledPadding(12)}px ${getScaledPadding(28)}px`,
              borderRadius: getScaledBorderRadius(6),
            }}
          >
            Go Back to Map
          </button>
          <button 
            onClick={onReset}
            style={{
              fontSize: getScaledFontSize(18),
              padding: `${getScaledPadding(12)}px ${getScaledPadding(28)}px`,
              borderRadius: getScaledBorderRadius(6),
            }}
          >
            Reset Tour
          </button>
        </div>
      </div>
    </div>
  );
};

export default FullscreenModal;