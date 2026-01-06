
import { AUDIO_EXTENSIONS } from '../constants';

export const validator = {
  isValidAudioUrl: (url: string): boolean => {
    try {
      const lowerUrl = url.toLowerCase();
      // Basic URL structure check
      new URL(url);
      
      // Reject common folder/playlist indicators
      if (lowerUrl.includes('/folder/') || lowerUrl.includes('?list=') || lowerUrl.includes('/sets/')) {
        return false;
      }

      // Check for valid audio extensions
      // Note: Some direct links have query params (e.g. Dropbox ?dl=1)
      const cleanUrl = url.split('?')[0];
      return AUDIO_EXTENSIONS.some(ext => cleanUrl.toLowerCase().endsWith(ext));
    } catch {
      return false;
    }
  },

  isReachable: async (url: string): Promise<boolean> => {
    try {
      // Use HEAD request to check availability without downloading the whole file
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      // In 'no-cors' mode we can't check status, but successful completion means reachable
      return true;
    } catch {
      return false;
    }
  }
};
