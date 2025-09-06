'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { usePageTracking } from '@/hooks/usePageTracking';
import { setTrackingEnabled } from '@/lib/services/traffic';

interface TrackingContextType {
  trackCustomEvent: (eventName: string, eventData?: Record<string, unknown>) => void;
  trackPageView: (url?: string) => void;
  sessionId: string;
  isEnabled: boolean;
}

const TrackingContext = createContext<TrackingContextType | null>(null);

interface TrackingProviderProps {
  children: ReactNode;
  enabled?: boolean;
  trackSearchParams?: boolean;
}

export function TrackingProvider({ 
  children, 
  enabled = true,
  trackSearchParams = false 
}: TrackingProviderProps) {
  // Use the page tracking hook to automatically track page views
  const { trackCustomEvent, trackPageView, sessionId } = usePageTracking({
    enabled,
    trackSearchParams,
  });

  // Set tracking enabled state on mount
  useEffect(() => {
    // Check environment variables and user preferences
    const shouldEnable = enabled && 
      process.env.NODE_ENV !== 'test' && 
      typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost') &&
      (navigator as Navigator & { doNotTrack?: string }).doNotTrack !== '1';
    
    setTrackingEnabled(shouldEnable);
  }, [enabled]);

  // Performance monitoring for tracking
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Track performance metrics
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          
          trackCustomEvent('page_performance', {
            page_load_time: navEntry.loadEventEnd - navEntry.fetchStart,
            dom_content_loaded: navEntry.domContentLoadedEventEnd - navEntry.fetchStart,
            first_paint: navEntry.responseEnd - navEntry.fetchStart,
            navigation_type: navEntry.type,
          });
        }
        
        if (entry.entryType === 'largest-contentful-paint') {
          trackCustomEvent('lcp_timing', {
            largest_contentful_paint: entry.startTime,
          });
        }
      });
    });

    try {
      observer.observe({ 
        entryTypes: ['navigation', 'largest-contentful-paint'] 
      });
    } catch (error) {
      // Some browsers might not support all entry types
      console.debug('Performance observer initialization failed:', error);
    }

    return () => {
      observer.disconnect();
    };
  }, [enabled, trackCustomEvent]);

  // Track errors for debugging (only in production)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || process.env.NODE_ENV === 'development') {
      return;
    }

    const handleError = (event: ErrorEvent) => {
      trackCustomEvent('client_error', {
        message: event.message,
        filename: event.filename,
        line_number: event.lineno,
        column_number: event.colno,
        error_type: 'javascript_error',
        user_agent: navigator.userAgent,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackCustomEvent('client_error', {
        message: String(event.reason),
        error_type: 'unhandled_promise_rejection',
        user_agent: navigator.userAgent,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [enabled, trackCustomEvent]);

  const contextValue: TrackingContextType = {
    trackCustomEvent,
    trackPageView,
    sessionId,
    isEnabled: enabled,
  };

  return (
    <TrackingContext.Provider value={contextValue}>
      {children}
    </TrackingContext.Provider>
  );
}

/**
 * Hook to access tracking functionality from anywhere in the app
 */
export function useTracking(): TrackingContextType {
  const context = useContext(TrackingContext);
  
  if (!context) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  
  return context;
}

/**
 * Higher-order component to add tracking to any component
 */
export function withTracking<P extends object>(
  Component: React.ComponentType<P>,
  trackingOptions?: {
    customPageName?: string;
    autoTrackClicks?: boolean;
  }
) {
  return function TrackedComponent(props: P) {
    const { trackCustomEvent } = useTracking();
    
    useEffect(() => {
      if (trackingOptions?.customPageName) {
        trackCustomEvent('page_view', {
          custom_page_name: trackingOptions.customPageName,
        });
      }
    }, [trackCustomEvent]);

    // Auto-track clicks if enabled
    const handleClick = trackingOptions?.autoTrackClicks 
      ? (event: React.MouseEvent) => {
          const target = event.target as HTMLElement;
          const tagName = target.tagName.toLowerCase();
          const elementType = (target as HTMLInputElement).type || tagName;
          
          trackCustomEvent('element_click', {
            element_type: elementType,
            element_text: target.textContent?.slice(0, 50),
            element_class: target.className,
            page_name: trackingOptions.customPageName,
          });
          
          // Call original onClick if it exists
          const originalProps = props as Record<string, unknown> & { onClick?: (event: React.MouseEvent) => void };
          if (originalProps.onClick) {
            originalProps.onClick(event);
          }
        }
      : (props as Record<string, unknown> & { onClick?: (event: React.MouseEvent) => void }).onClick;

    const enhancedProps = trackingOptions?.autoTrackClicks
      ? { ...props, onClick: handleClick }
      : props;

    return <Component {...enhancedProps} />;
  };
}