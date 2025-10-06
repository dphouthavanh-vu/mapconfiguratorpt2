import React, { useState, useEffect } from 'react';
import styles from './FullscreenModal.module.scss';


interface FullscreenModalProps {
  open: boolean;
  contentUrl: string;
  landmarkName?: string;
  landmarkSubtitle?: string;
  landmarkContent?: string;
  description?: string;
  images?: string[];
  links?: Array<{url: string; label?: string}>;
  videos?: string[];
  onClose: () => void;
  onReset: () => void;
}

const FullscreenModal: React.FC<FullscreenModalProps> = ({
  open,
  contentUrl,
  landmarkName,
  landmarkSubtitle,
  landmarkContent,
  description,
  images,
  links,
  videos,
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
        {/* Hero Section with Zone Title */}
        {landmarkName && (
          <div style={{
            padding: '32px 40px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '32px',
              fontWeight: '700',
              color: '#fff',
              letterSpacing: '-0.5px',
            }}>{landmarkName}</h2>
            {landmarkSubtitle && (
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.7)',
              }}>{landmarkSubtitle}</p>
            )}
          </div>
        )}

        {/* Content Container with Scroll */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 40px',
        }}>
          {/* Description Section */}
          {description && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#fff',
              }}>Description</h3>
              <p style={{
                margin: 0,
                fontSize: '15px',
                lineHeight: '1.7',
                color: 'rgba(255, 255, 255, 0.85)',
              }}>{description}</p>
            </div>
          )}

          {/* Images Gallery */}
          {images && images.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#fff',
              }}>Images</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '16px',
              }}>
                {images.map((image, index) => (
                  <div key={index} style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    aspectRatio: '16/9',
                  }}>
                    <img
                      src={image}
                      alt={`${landmarkName} - Image ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos Section */}
          {videos && videos.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h3
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#fff',
                }}
              >
                Videos
              </h3>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {videos.map((videoUrl, index) => {
                  let embedUrl = videoUrl.trim();

                  // Convert YouTube watch links
                  if (embedUrl.includes('youtube.com/watch?v=')) {
                    embedUrl = embedUrl.replace('watch?v=', 'embed/');
                  }

                  // Convert YouTube Shorts
                  if (embedUrl.includes('youtube.com/shorts/')) {
                    embedUrl = embedUrl.replace('youtube.com/shorts/', 'www.youtube.com/embed/');
                  }

                  // Convert Vimeo links
                  if (embedUrl.includes('vimeo.com/') && !embedUrl.includes('player.vimeo.com')) {
                    const id = embedUrl.split('vimeo.com/')[1];
                    embedUrl = `https://player.vimeo.com/video/${id}`;
                  }

                  return (
                    <div
                      key={index}
                      style={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        aspectRatio: '16/9',
                      }}
                    >
                      <iframe
                        src={embedUrl}
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                        }}
                        title={`Video ${index + 1}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* Links Section */}
          {links && links.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#fff',
              }}>Links</h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                {links.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px 20px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      color: '#3b82f6',
                      textDecoration: 'none',
                      fontSize: '15px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M11 3C10.4477 3 10 3.44772 10 4C10 4.55228 10.4477 5 11 5H13.5858L7.29289 11.2929C6.90237 11.6834 6.90237 12.3166 7.29289 12.7071C7.68342 13.0976 8.31658 13.0976 8.70711 12.7071L15 6.41421V9C15 9.55228 15.4477 10 16 10C16.5523 10 17 9.55228 17 9V4C17 3.44772 16.5523 3 16 3H11Z" fill="currentColor"/>
                      <path d="M5 7C4.44772 7 4 7.44772 4 8V15C4 15.5523 4.44772 16 5 16H12C12.5523 16 13 15.5523 13 15V12C13 11.4477 13.4477 11 14 11C14.5523 11 15 11.4477 15 12V15C15 16.6569 13.6569 18 12 18H5C3.34315 18 2 16.6569 2 15V8C2 6.34315 3.34315 5 5 5H8C8.55228 5 9 5.44772 9 6C9 6.55228 8.55228 7 8 7H5Z" fill="currentColor"/>
                    </svg>
                    <span>{link.label || link.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Legacy iframe support (if contentUrl is provided but not in videos array) */}
          {contentUrl && !videos?.includes(contentUrl) && (
            <div>
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

              <iframe
                src={contentUrl}
                className={styles.video}
                style={{
                  width: '100%',
                  height: '400px',
                  border: 'none',
                  borderRadius: '12px',
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
            </div>
          )}

          {landmarkContent && (
            <div className={styles.landmarkContent}>
              <p>{landmarkContent}</p>
            </div>
          )}
        </div>
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