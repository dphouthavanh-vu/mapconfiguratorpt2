'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface ZoneDetailViewProps {
  open: boolean;
  landmarkName?: string;
  description?: string;
  images?: string[];
  links?: Array<{url: string; label?: string}>;
  videos?: string[];
  onBack: () => void;
}

const ZoneDetailView: React.FC<ZoneDetailViewProps> = ({
  open,
  landmarkName,
  description,
  images,
  links,
  videos,
  onBack
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
      zIndex: 900,
      pointerEvents: 'none',
    }}>
      {/* Back Button - Top Left */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        onClick={onBack}
        style={{
          position: 'absolute',
          top: '3vh',
          left: '3vw',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          color: '#fff',
          fontSize: '15px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          pointerEvents: 'auto',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
          e.currentTarget.style.transform = 'translateX(-4px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          e.currentTarget.style.transform = 'translateX(0)';
        }}
      >
        <ArrowLeft size={18} strokeWidth={2.5} />
        Back to Map
      </motion.button>

      {/* Title Card - Top Center */}
      {landmarkName && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{
            position: 'absolute',
            top: '2vh',
            left: '45%',
            transform: 'translateX(-50%)',
            padding: '12px 32px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'auto',
          }}
        >
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '600',
            color: '#fff',
            letterSpacing: '-0.3px',
            textAlign: 'center',
          }}>
            {landmarkName}
          </h1>
        </motion.div>
      )}

      {/* Gallery Card - Right Side, Top */}
      {hasImages && images && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          style={{
            position: 'absolute',
            top: '12vh',
            right: '3vw',
            width: 'min(40vw, 600px)',
            maxHeight: '40vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          {/* Main Image */}
          <div style={{ position: 'relative', aspectRatio: '16/9', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
            <AnimatePresence mode="wait">
              <motion.img
                    key={currentImageIndex}
                    src={images[currentImageIndex]}
                    alt={`${landmarkName} - Image ${currentImageIndex + 1}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </AnimatePresence>

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
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
                    </button>

                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
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
                    </button>

                    {/* Image Counter */}
                    <div style={{
                      position: 'absolute',
                      bottom: '16px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px',
                      padding: '6px 14px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}>
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '16px',
              overflowX: 'auto',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            }}>
              {images.map((image, index) => (
                <div
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  style={{
                    minWidth: '80px',
                    height: '50px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: currentImageIndex === index
                      ? '2px solid rgba(96, 165, 250, 0.8)'
                      : '2px solid rgba(255, 255, 255, 0.2)',
                    opacity: currentImageIndex === index ? 1 : 0.5,
                    transition: 'all 0.2s ease',
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
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* About Card - Left Side, Under Back Button */}
      {hasDescription && (
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          style={{
            position: 'absolute',
            top: '12vh',
            left: '3vw',
            width: 'min(30vw, 450px)',
            maxHeight: '75vh',
            overflowY: 'auto',
            padding: '24px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'auto',
          }}
        >
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '20px',
            fontWeight: '600',
            color: '#fff',
          }}>
            About
          </h2>
          <p style={{
            margin: 0,
            fontSize: '15px',
            lineHeight: '1.6',
            color: 'rgba(255, 255, 255, 0.85)',
          }}>
            {description}
          </p>
        </motion.div>
      )}

      {/* Links Card - Bottom Right */}
      {hasLinks && (
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          style={{
            position: 'absolute',
            bottom: '5vh',
            right: '3vw',
            width: 'min(25vw, 400px)',
            maxHeight: '40vh',
            overflowY: 'auto',
            padding: '24px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'auto',
          }}
        >
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '20px',
            fontWeight: '600',
            color: '#fff',
          }}>
            Quick Links
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '14px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  color: '#60a5fa',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(96, 165, 250, 0.12)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {link.label || link.url}
                </span>
                <ExternalLink size={14} />
              </a>
            ))}
          </div>
        </motion.div>
      )}

      {/* Video Card - Right Side, Below Gallery with spacing */}
      {hasVideos && (
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          style={{
            position: 'absolute',
            top: hasImages ? '55vh' : '12vh',
            right: '3vw',
            width: 'min(40vw, 600px)',
            maxHeight: '40vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ padding: '20px 20px 16px 20px' }}>
            <h2 style={{
              margin: '0 0 12px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#fff',
            }}>
              Featured Video
            </h2>
          </div>
          <div style={{
            aspectRatio: '16/9',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
        </motion.div>
      )}
    </div>
  );
};

export default ZoneDetailView;
