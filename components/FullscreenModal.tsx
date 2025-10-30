'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

interface FullscreenModalProps {
  open: boolean;
  contentUrl: string;
  landmarkName?: string;
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
  description,
  images,
  links,
  videos,
  onClose
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reset image index when modal opens
  useEffect(() => {
    if (open) {
      setCurrentImageIndex(0);
      setLightboxOpen(false);
    }
  }, [open]);

  if (!open) return null;

  // Helper function to convert YouTube URLs to embed format
  const convertToEmbedUrl = (url: string): string => {
    let embedUrl = url.trim();

    if (embedUrl.includes('youtu.be/')) {
      const videoId = embedUrl.split('youtu.be/')[1].split('?')[0].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (embedUrl.includes('youtube.com/watch?v=')) {
      const videoId = embedUrl.split('v=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (embedUrl.includes('youtube.com/shorts/')) {
      const videoId = embedUrl.split('shorts/')[1].split('?')[0].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (embedUrl.includes('vimeo.com/') && !embedUrl.includes('player.vimeo.com')) {
      const videoId = embedUrl.split('vimeo.com/')[1].split('?')[0].split('&')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }

    return embedUrl;
  };

  const hasVideos = videos && videos.length > 0;
  const hasImages = images && images.length > 0;
  const hasLinks = links && links.length > 0;
  const hasDescription = description && description.length > 0;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(80px)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      overflowY: 'auto',
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}>
        {/* Zone Title */}
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
          </div>
        )}

        {/* Main Content Area */}
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
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
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

            {/* Images Gallery */}
            {hasImages && images && (
              <div>
                <h2 style={{
                  margin: '0 0 24px 0',
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#fff',
                  letterSpacing: '-0.5px',
                }}>Gallery</h2>

                {/* Hero Image */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    position: 'relative',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    aspectRatio: '16/9',
                    maxHeight: '400px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    cursor: 'pointer',
                    marginBottom: '20px',
                  }}
                  whileHover={{ scale: 1.015 }}
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

                  {/* Zoom Icon */}
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

                  {/* Navigation Arrows */}
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

                {/* Thumbnail Strip */}
                {images.length > 1 && (
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    overflowX: 'auto',
                    paddingBottom: '6px',
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
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
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
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
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
                        e.currentTarget.style.transform = 'translateX(8px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <span>{link.label || link.url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Close Button */}
      <div style={{
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1001,
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
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '9999px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          <X size={18} strokeWidth={2.5} />
          <span>Close</span>
        </motion.button>
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
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
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
                zIndex: 1101,
              }}
            >
              <X size={28} strokeWidth={2.5} />
            </motion.button>

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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FullscreenModal;
