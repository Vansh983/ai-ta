'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trafficTracker } from '@/lib/services/traffic';

export interface UsePageTrackingOptions {
  enabled?: boolean;
  trackSearchParams?: boolean;
  customPageName?: string;
}

/**
 * Hook to automatically track page views and user navigation
 * Integrates with Next.js App Router to track route changes
 */
export function usePageTracking(options: UsePageTrackingOptions = {}) {
  const {
    enabled = true,
    trackSearchParams = false,
    customPageName
  } = options;

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef<string>('');
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Don't track if disabled
    if (!enabled) return;

    // Build current URL
    let currentUrl = pathname;
    if (trackSearchParams && searchParams.toString()) {
      currentUrl += `?${searchParams.toString()}`;
    }

    // Add domain and protocol for absolute URL
    const absoluteUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${currentUrl}`
      : currentUrl;

    // Only track if URL has changed
    if (lastTrackedUrl.current !== absoluteUrl) {
      lastTrackedUrl.current = absoluteUrl;

      // Track the page view
      trafficTracker.trackPageView(absoluteUrl);

      // If custom page name is provided, update meta data
      if (customPageName) {
        trafficTracker.trackCustomEvent('page_view', {
          custom_page_name: customPageName,
          url: absoluteUrl,
          pathname: pathname,
        });
      }
    }

    isInitialMount.current = false;
  }, [pathname, searchParams, enabled, trackSearchParams, customPageName]);

  // Return utility functions for manual tracking
  return {
    trackCustomEvent: (eventName: string, eventData?: Record<string, unknown>) => {
      if (enabled) {
        trafficTracker.trackCustomEvent(eventName, eventData);
      }
    },
    
    trackPageView: (url?: string) => {
      if (enabled) {
        trafficTracker.trackPageView(url);
      }
    },
    
    sessionId: trafficTracker.getSessionId(),
  };
}