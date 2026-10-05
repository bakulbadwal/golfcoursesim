import { useState, useEffect } from 'react';

/**
 * Detects whether the current viewport/device is mobile (phone),
 * accounting for both vertical (portrait) and horizontal (landscape) orientations.
 */
export function checkIsMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const w = window.innerWidth;
  const h = window.innerHeight;

  // 1. Vertical / portrait mobile (width is narrow phone width < 768px)
  const isPortraitMobile = w < 768 && h >= w;

  // 2. Horizontal / landscape mobile (short phone vertical height <= 550px)
  const isLandscape = w > h;
  const isSmallHeight = h <= 550;
  const isShortSideMobile = Math.min(w, h) <= 520;

  const isLandscapeMobile = isLandscape && (isSmallHeight || isShortSideMobile);

  return isPortraitMobile || isLandscapeMobile || w < 640;
}

/**
 * Detects whether the current viewport is a landscape mobile phone
 */
export function checkIsLandscapeMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isLandscape = w > h;
  const isSmallHeight = h <= 550;
  const isShortSideMobile = Math.min(w, h) <= 520;

  return isLandscape && (isSmallHeight || isShortSideMobile);
}

/**
 * Detects whether the current viewport/device is in tablet view,
 * covering both vertical (portrait: 768px-1024px) and horizontal (landscape: 1024px-1366px, height 600px-1024px) orientations.
 */
export function checkIsTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const w = window.innerWidth;
  const h = window.innerHeight;

  // If it's already a phone, it's not a tablet
  if (checkIsMobileDevice()) return false;

  const isLandscape = w > h;
  const hasTouch =
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0);

  // 1. Tablet Vertical (Portrait): width 640px to 1024px where height >= width
  const isTabletPortrait = !isLandscape && w >= 640 && w <= 1024;

  // 2. Tablet Horizontal (Landscape): width 768px to 1366px, height up to 1024px
  // Covers iPad Mini (1024x768), iPad Air/Pro (1180x820, 1194x834, 1366x1024), Android tablets (1280x800), etc.
  const isTabletLandscape =
    isLandscape &&
    ((w <= 1280 && h <= 950) ||
      (w <= 1366 && (h <= 1024 || hasTouch || Math.min(w, h) <= 1024)));

  return isTabletPortrait || isTabletLandscape;
}

/**
 * Checks whether the application should enforce single panel mode (only one panel open at a time)
 * to prevent panel overlap on mobile and tablet viewports in both vertical and landscape orientations.
 */
export function checkIsSinglePanelMode(): boolean {
  if (typeof window === 'undefined') return false;
  return checkIsMobileDevice() || checkIsTabletDevice() || window.innerWidth <= 1180;
}

export function useIsLandscapeMobile(): boolean {
  const [isLandscapeMobile, setIsLandscapeMobile] = useState<boolean>(() => {
    return checkIsLandscapeMobile();
  });

  useEffect(() => {
    const handleUpdate = () => {
      setIsLandscapeMobile(checkIsLandscapeMobile());
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('orientationchange', handleUpdate);
    handleUpdate();

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('orientationchange', handleUpdate);
    };
  }, []);

  return isLandscapeMobile;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return checkIsMobileDevice();
  });

  useEffect(() => {
    const handleUpdate = () => {
      setIsMobile(checkIsMobileDevice());
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('orientationchange', handleUpdate);
    handleUpdate();

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('orientationchange', handleUpdate);
    };
  }, []);

  return isMobile;
}

export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState<boolean>(() => {
    return checkIsTabletDevice();
  });

  useEffect(() => {
    const handleUpdate = () => {
      setIsTablet(checkIsTabletDevice());
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('orientationchange', handleUpdate);
    handleUpdate();

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('orientationchange', handleUpdate);
    };
  }, []);

  return isTablet;
}

export function useIsSinglePanel(): boolean {
  const [isSinglePanel, setIsSinglePanel] = useState<boolean>(() => {
    return checkIsSinglePanelMode();
  });

  useEffect(() => {
    const handleUpdate = () => {
      setIsSinglePanel(checkIsSinglePanelMode());
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('orientationchange', handleUpdate);
    handleUpdate();

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('orientationchange', handleUpdate);
    };
  }, []);

  return isSinglePanel;
}
