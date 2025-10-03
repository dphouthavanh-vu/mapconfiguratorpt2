import { useState, useEffect } from 'react';
import { Landmark } from '../data/types';
import { loadLandmarksFromCSV } from '../utils/csvUtils';

interface UseLandmarksFromCSVResult {
  landmarks: Landmark[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to load landmarks from a CSV file
 * @param csvUrl The URL/path to the CSV file (defaults to '/landmarks.csv')
 * @returns Object containing landmarks array, loading state, and error state
 */
export function useLandmarksFromCSV(csvUrl: string = '/landmarks.csv'): UseLandmarksFromCSVResult {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLandmarks() {
      try {
        setLoading(true);
        setError(null);
        
        const loadedLandmarks = await loadLandmarksFromCSV(csvUrl);
        
        if (isMounted) {
          setLandmarks(loadedLandmarks);
          setLoading(false);
        }
      } catch (err) {
        console.error('🗺️ Error loading landmarks:', err);
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error loading landmarks';
          setError(errorMessage);
          setLandmarks([]); // Reset to empty array on error
          setLoading(false);
        }
      }
    }

    loadLandmarks();

    return () => {
      isMounted = false;
    };
  }, [csvUrl]);

  return { landmarks, loading, error };
}