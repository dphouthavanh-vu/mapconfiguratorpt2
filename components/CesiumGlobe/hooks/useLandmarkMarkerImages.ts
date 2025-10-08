import { useEffect, useState } from 'react';
import { Landmark } from '../data/types';
import { createMarkerImage } from '../utils/markerUtils';

/**
 * Custom hook to generate marker images for a list of landmarks.
 * @param landmarks Array of Landmark objects
 * @param fontSize Font size for marker text (defaults to 20)
 * @returns markerImages: Record<number, string> (data URLs), loading: boolean
 */
export function useLandmarkMarkerImages(landmarks: Landmark[], fontSize: number = 20) {
  const [markerImages, setMarkerImages] = useState<{ [id: number]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function generateImages() {
      setLoading(true);
      const images: { [id: number]: string } = {};
      for (let i = 0; i < landmarks.length; i++) {
        const landmark = landmarks[i];
        try {
          images[i] = await createMarkerImage({
            logoUrl: landmark.icon,
            text: landmark.name,
            color: landmark.color,
            fontSize: fontSize,
            category: landmark.category,
          });
        } catch (e) {
          console.error('❌ Error creating marker image for landmark', landmark, e);
          // Try to create a fallback marker without the logo
          try {
            images[i] = await createMarkerImage({
              logoUrl: undefined, // No logo
              text: landmark.name,
              color: landmark.color,
              fontSize: fontSize,
              category: landmark.category,
            });
          } catch (fallbackError) {
            console.error('❌ Even fallback marker failed for landmark', landmark, fallbackError);
            // If all else fails, create a basic marker
            images[i] = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjEwNyIgdmlld0JveD0iMCAwIDI1NiAxMDciIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTIxNy41IDBDMjM4Ljc2MyAwIDI1NiAxNy4yMzcgMjU2IDM4LjVDMjU2IDU5Ljc2MyAyMzguNzYzIDc3IDIxNy41IDc3SDYyLjU1MjdMNDMuMzY0MyAxMDYuNDk3TDIxLjY1NTMgNzMuMTI3QzguODM0NjQgNjYuODc4NSAwIDUzLjcyMTggMCAzOC41QzAgMTcuMjM3IDE3LjIzNyAwIDM4LjUgMEgyMTcuNVoiIGZpbGw9IiMwMDg2RkYiIGZpbGwtb3BhY2l0eT0iMC40IiBzdHJva2U9IiNGQ0YwNjAiIHN0cm9rZS13aWR0aD0iMyIvPjwvc3ZnPg==';
          }
        }
      }
      if (isMounted) {
        
        // Verify we have images for all landmarks
        const missingIndices = [];
        for (let i = 0; i < landmarks.length; i++) {
          if (!images[i]) {
            missingIndices.push(i);
          }
        }
        
        if (missingIndices.length > 0) {
          console.warn('⚠️ Missing marker images for indices:', missingIndices);
        } else {
        }
        
        setMarkerImages(images);
      }
      setLoading(false);
    }
    generateImages();
    return () => {
      isMounted = false;
    };
  }, [landmarks]);

  return { markerImages, loading };
}