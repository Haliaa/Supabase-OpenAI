import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Extend Navigator interface for deviceMemory
declare global {
  interface Navigator {
    deviceMemory?: number;
  }
}

// Cache the fingerprint to avoid regenerating it
let cachedFingerprint: string | null = null;

/**
 * Get browser fingerprint using FingerprintJS
 * Returns a unique identifier for the browser/device
 */
export async function getBrowserFingerprint(): Promise<string> {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  try {
    // Load FingerprintJS
    const fp = await FingerprintJS.load();
    
    // Get the visitor identifier
    const result = await fp.get();
    
    // Cache the result
    cachedFingerprint = result.visitorId;
    
    return cachedFingerprint;
  } catch (error) {
    // Fallback: generate a basic fingerprint
    const fallbackFingerprint = generateFallbackFingerprint();
    cachedFingerprint = fallbackFingerprint;
    
    return fallbackFingerprint;
  }
}

/**
 * Generate a fallback fingerprint when FingerprintJS fails
 */
function generateFallbackFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.deviceMemory || 'unknown',
    navigator.platform,
    window.location.hostname
  ];
  
  // Simple hash function
  let hash = 0;
  const str = components.join('|');
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Get additional device information for enhanced tracking
 */
export function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
    maxTouchPoints: navigator.maxTouchPoints,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screen: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset()
  };
}

/**
 * Clear cached fingerprint (useful for testing)
 */
export function clearFingerprintCache() {
  cachedFingerprint = null;
} 