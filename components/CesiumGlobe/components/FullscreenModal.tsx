import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
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
  onClose
}) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState<NodeJS.Timeout | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
  
  // Helper function to convert YouTube URLs to embed format
  const convertToEmbedUrl = (url: string): string => {
    let embedUrl = url.trim();

    // Handle youtu.be short links
    if (embedUrl.includes('youtu.be/')) {
      const videoId = embedUrl.split('youtu.be/')[1].split('?')[0].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // Handle youtube.com/watch?v= links
    if (embedUrl.includes('youtube.com/watch?v=')) {
      const videoId = embedUrl.split('v=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // Handle youtube.com/shorts/
    if (embedUrl.includes('youtube.com/shorts/')) {
      const videoId = embedUrl.split('shorts/')[1].split('?')[0].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // Handle Vimeo links
    if (embedUrl.includes('vimeo.com/') && !embedUrl.includes('player.vimeo.com')) {
      const videoId = embedUrl.split('vimeo.com/')[1].split('?')[0].split('&')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }

    return embedUrl;
  };

  // Determine if there's video content
  const hasVideos = videos && videos.length > 0;
  const hasImages = images && images.length > 0;
  const hasLinks = links && links.length > 0;
  const hasDescription = description && description.length > 0;

  // Debug logging for videos
  if (hasVideos) {
    console.log('📹 Videos received:', videos);
    console.log('📹 First video URL:', videos[0]);
    console.log('📹 Converted embed URL:', convertToEmbedUrl(videos[0]));
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.videoArea}>
        {/* Zone Title - Centered at Top */}
        {landmarkName && (
          <div style={{
            padding: '40px 64px',
            textAlign: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <h1 style={{
              margin: 0,
              fontSize: '48px',
              fontWeight: '800',
              color: '#fff',
              letterSpacing: '-1px',
            }}>{landmarkName}</h1>
            {landmarkSubtitle && (
              <p style={{
                margin: '12px 0 0 0',
                fontSize: '18px',
                fontWeight: '400',
                color: 'rgba(255, 255, 255, 0.7)',
              }}>{landmarkSubtitle}</p>
            )}
          </div>
        )}

        {/* Main Content Area - Grid Layout for Large Screens */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '64px',
          display: 'grid',
          gridTemplateColumns: hasVideos ? '1.5fr 1fr' : '1fr',
          gap: '48px',
          alignItems: 'start',
        }}>

          {/* Left Column - Primary Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {/* Featured Video Section */}
            {hasVideos && (
              <div>
                <h2 style={{
                  margin: '0 0 24px 0',
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#fff',
                  letterSpacing: '-0.5px',
                }}>Featured Video</h2>
                <div style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  aspectRatio: '16/9',
                }}>
                  {videos[0].startsWith('data:video/') ? (
                    <video
                      controls
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                      title="Featured Video"
                    >
                      <source src={videos[0]} />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <iframe
                      src={convertToEmbedUrl(videos[0])}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                      }}
                      title="Featured Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  )}
                </div>
              </div>
            )}

            {/* Additional Videos */}
            {hasVideos && videos.length > 1 && (
              <div>
                <h2 style={{
                  margin: '0 0 24px 0',
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#fff',
                  letterSpacing: '-0.5px',
                }}>More Videos</h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '24px',
                }}>
                  {videos.slice(1).map((videoUrl, index) => (
                    <div
                      key={index + 1}
                      style={{
                        borderRadius: '16px',
                        overflow: 'hidden',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        aspectRatio: '16/9',
                      }}
                    >
                      {videoUrl.startsWith('data:video/') ? (
                        <video
                          controls
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                          }}
                          title={`Video ${index + 2}`}
                        >
                          <source src={videoUrl} />
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <iframe
                          src={convertToEmbedUrl(videoUrl)}
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                          }}
                          title={`Video ${index + 2}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Images Gallery - Hero Style */}
            {hasImages && images && (
              <div>
                <h2 style={{
                  margin: '0 0 24px 0',
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#fff',
                  letterSpacing: '-0.5px',
                }}>Gallery</h2>

                {/* Hero Image - Large Featured */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    position: 'relative',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    aspectRatio: '16/9',
                    maxHeight: '400px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    cursor: 'pointer',
                    marginBottom: '20px',
                  }}
                  whileHover={{ scale: 1.015, boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)' }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setLightboxOpen(true)}
                >
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentImageIndex}
                      src={images[currentImageIndex]}
                      alt={`${landmarkName} - Image ${currentImageIndex + 1}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </AnimatePresence>

                  {/* Zoom Icon Overlay */}
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '50%',
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}>
                    <ZoomIn size={18} color="white" />
                  </div>

                  {/* Navigation Arrows (if multiple images) */}
                  {images.length > 1 && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                        }}
                        style={{
                          position: 'absolute',
                          left: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '50%',
                          width: '40px',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'white',
                          transition: 'all 0.2s',
                        }}
                      >
                        <ChevronLeft size={20} strokeWidth={2.5} />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                        }}
                        style={{
                          position: 'absolute',
                          right: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '50%',
                          width: '40px',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'white',
                          transition: 'all 0.2s',
                        }}
                      >
                        <ChevronRight size={20} strokeWidth={2.5} />
                      </motion.button>
                    </>
                  )}

                  {/* Image Counter */}
                  {images.length > 1 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '16px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '16px',
                      padding: '6px 16px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}>
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  )}
                </motion.div>

                {/* Thumbnail Strip (if multiple images) */}
                {images.length > 1 && (
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    overflowX: 'auto',
                    paddingBottom: '6px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1)',
                  }}>
                    {images.map((image, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCurrentImageIndex(index)}
                        style={{
                          minWidth: '100px',
                          height: '65px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: currentImageIndex === index
                            ? '2.5px solid rgba(96, 165, 250, 0.8)'
                            : '2px solid rgba(255, 255, 255, 0.2)',
                          opacity: currentImageIndex === index ? 1 : 0.6,
                          transition: 'all 0.3s',
                          boxShadow: currentImageIndex === index
                            ? '0 0 16px rgba(96, 165, 250, 0.4)'
                            : 'none',
                        }}
                      >
                        <img
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Info Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {/* Description Card */}
            {hasDescription && (
              <div style={{
                padding: '32px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              }}>
                <h2 style={{
                  margin: '0 0 20px 0',
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#fff',
                  letterSpacing: '-0.5px',
                }}>About</h2>
                <p style={{
                  margin: 0,
                  fontSize: '18px',
                  lineHeight: '1.8',
                  color: 'rgba(255, 255, 255, 0.9)',
                }}>{description}</p>
              </div>
            )}

            {/* Links Card */}
            {hasLinks && (
              <div style={{
                padding: '32px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              }}>
                <h2 style={{
                  margin: '0 0 20px 0',
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#fff',
                  letterSpacing: '-0.5px',
                }}>Quick Links</h2>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
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
                        gap: '16px',
                        padding: '20px 24px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '14px',
                        color: '#60a5fa',
                        textDecoration: 'none',
                        fontSize: '18px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(96, 165, 250, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.4)';
                        e.currentTarget.style.transform = 'translateX(8px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                        <path d="M11 3C10.4477 3 10 3.44772 10 4C10 4.55228 10.4477 5 11 5H13.5858L7.29289 11.2929C6.90237 11.6834 6.90237 12.3166 7.29289 12.7071C7.68342 13.0976 8.31658 13.0976 8.70711 12.7071L15 6.41421V9C15 9.55228 15.4477 10 16 10C16.5523 10 17 9.55228 17 9V4C17 3.44772 16.5523 3 16 3H11Z" fill="currentColor"/>
                        <path d="M5 7C4.44772 7 4 7.44772 4 8V15C4 15.5523 4.44772 16 5 16H12C12.5523 16 13 15.5523 13 15V12C13 11.4477 13.4477 11 14 11C14.5523 11 15 11.4477 15 12V15C15 16.6569 13.6569 18 12 18H5C3.34315 18 2 16.6569 2 15V8C2 6.34315 3.34315 5 5 5H8C8.55228 5 9 5.44772 9 6C9 6.55228 8.55228 7 8 7H5Z" fill="currentColor"/>
                      </svg>
                      <span>{link.label || link.url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Legacy iframe support (if contentUrl is provided but not in videos array) */}
          {contentUrl && !videos?.includes(contentUrl) && (
            <div style={{ gridColumn: '1 / -1' }}>
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
                  height: '600px',
                  border: 'none',
                  borderRadius: '20px',
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
            <div className={styles.landmarkContent} style={{ gridColumn: '1 / -1' }}>
              <p>{landmarkContent}</p>
            </div>
          )}
        </div>
      </div>
      {/* Modal Navigation Bar - Only Close Button */}
      <div style={{
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          padding: '8px',
          borderRadius: '9999px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '9999px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
            }}
          >
            <X size={18} strokeWidth={2.5} />
            <span className="hidden md:inline">Close</span>
          </motion.button>
        </div>
      </div>

      {/* Fullscreen Lightbox */}
      <AnimatePresence>
        {lightboxOpen && images && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(false);
              }}
              style={{
                position: 'absolute',
                top: '30px',
                right: '30px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                zIndex: 101,
              }}
            >
              <X size={28} strokeWidth={2.5} />
            </motion.button>

            {/* Lightbox Image */}
            <motion.img
              key={`lightbox-${currentImageIndex}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              src={images[currentImageIndex]}
              alt={`${landmarkName} - Image ${currentImageIndex + 1}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 20px 80px rgba(0, 0, 0, 0.8)',
              }}
            />

            {/* Navigation Arrows in Lightbox */}
            {images.length > 1 && (
              <>
                <motion.button
                  whileHover={{ scale: 1.15, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                  }}
                  style={{
                    position: 'absolute',
                    left: '40px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '64px',
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    zIndex: 101,
                  }}
                >
                  <ChevronLeft size={32} strokeWidth={2.5} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.15, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                  }}
                  style={{
                    position: 'absolute',
                    right: '40px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '64px',
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    zIndex: 101,
                  }}
                >
                  <ChevronRight size={32} strokeWidth={2.5} />
                </motion.button>
              </>
            )}

            {/* Image Counter in Lightbox */}
            {images.length > 1 && (
              <div style={{
                position: 'absolute',
                bottom: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                padding: '12px 28px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                zIndex: 101,
              }}>
                {currentImageIndex + 1} / {images.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FullscreenModal;