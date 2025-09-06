import { getCurrentUser } from '../auth/auth.utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface TrafficData {
  page_name: string;
  page_url: string;
  session_id: string;
  referrer?: string;
  screen_resolution?: string;
  time_on_page?: number;
  meta_data?: Record<string, unknown>;
}

export class TrafficTracker {
  private static instance: TrafficTracker;
  private sessionId: string;
  private pageStartTime: number = 0;
  private currentPageId: string | null = null;
  private isEnabled: boolean;
  private retryQueue: TrafficData[] = [];
  private isProcessingQueue: boolean = false;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = typeof window !== 'undefined' && process.env.NODE_ENV !== 'development';
    
    // Check for Do Not Track
    if (typeof window !== 'undefined' && (navigator as Navigator & { doNotTrack?: string }).doNotTrack === '1') {
      this.isEnabled = false;
    }

    // Set up page unload handler to track time on page
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handlePageUnload.bind(this));
      window.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
  }

  public static getInstance(): TrafficTracker {
    if (!TrafficTracker.instance) {
      TrafficTracker.instance = new TrafficTracker();
    }
    return TrafficTracker.instance;
  }

  private generateSessionId(): string {
    // Check if session ID exists in sessionStorage
    if (typeof window !== 'undefined') {
      const existingSessionId = sessionStorage.getItem('traffic_session_id');
      if (existingSessionId) {
        return existingSessionId;
      }
    }

    // Generate new session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('traffic_session_id', sessionId);
    }
    
    return sessionId;
  }

  private getScreenResolution(): string {
    if (typeof window === 'undefined') return '';
    return `${window.screen.width}x${window.screen.height}`;
  }

  private getPageName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Extract meaningful page name from pathname
      if (pathname === '/') return 'home';
      
      const segments = pathname.split('/').filter(Boolean);
      
      // Handle dynamic routes like /courses/[id]
      if (segments.includes('courses') && segments.length > 1) {
        return 'course-detail';
      }
      
      if (segments.includes('instructor')) {
        return 'instructor-dashboard';
      }
      
      return segments.join('-') || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private async sendTrackingData(data: TrafficData): Promise<boolean> {
    if (!this.isEnabled) return true;

    try {
      const user = getCurrentUser();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add auth header if user is logged in
      if (user?.userId) {
        headers.Authorization = `Bearer ${user.userId}`;
      }

      const response = await fetch(`${API_BASE_URL}/track`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        keepalive: true, // Important: ensures request completes even if page is unloaded
        mode: 'cors',
      });

      return response.status === 204;
    } catch (error) {
      console.debug('Traffic tracking failed:', error);
      return false;
    }
  }

  public async trackPageView(url?: string): Promise<void> {
    if (!this.isEnabled || typeof window === 'undefined') return;

    const currentUrl = url || window.location.href;
    const pageName = this.getPageName(currentUrl);
    
    // Track time spent on previous page if there was one
    if (this.currentPageId && this.pageStartTime > 0) {
      const timeOnPage = Date.now() - this.pageStartTime;
      await this.trackPageExit(timeOnPage);
    }

    // Start tracking new page
    this.pageStartTime = Date.now();
    this.currentPageId = pageName;

    const trackingData: TrafficData = {
      page_name: pageName,
      page_url: currentUrl,
      session_id: this.sessionId,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      screen_resolution: this.getScreenResolution(),
      meta_data: {
        timestamp: new Date().toISOString(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        language: typeof navigator !== 'undefined' ? navigator.language : undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : undefined,
      },
    };

    const success = await this.sendTrackingData(trackingData);
    
    if (!success) {
      this.addToRetryQueue(trackingData);
    }
  }

  private async trackPageExit(timeOnPage: number): Promise<void> {
    if (!this.currentPageId || timeOnPage < 1000) return; // Only track if spent more than 1 second

    const trackingData: TrafficData = {
      page_name: this.currentPageId,
      page_url: window.location.href,
      session_id: this.sessionId,
      time_on_page: timeOnPage,
      meta_data: {
        exit_timestamp: new Date().toISOString(),
      },
    };

    const success = await this.sendTrackingData(trackingData);
    
    if (!success) {
      this.addToRetryQueue(trackingData);
    }
  }

  private addToRetryQueue(data: TrafficData): void {
    this.retryQueue.push(data);
    this.processRetryQueue();
  }

  private async processRetryQueue(): Promise<void> {
    if (this.isProcessingQueue || this.retryQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    const toRetry = [...this.retryQueue];
    this.retryQueue = [];
    
    for (const data of toRetry) {
      const success = await this.sendTrackingData(data);
      if (!success) {
        // Add back to queue for later retry (max 3 times)
        if (!data.meta_data) data.meta_data = {};
        const retryCount = ((data.meta_data.retry_count as number) || 0) + 1;
        
        if (retryCount < 3) {
          data.meta_data.retry_count = retryCount;
          this.retryQueue.push(data);
        }
      }
      
      // Small delay between retries
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isProcessingQueue = false;
    
    // Process queue again if there are still items
    if (this.retryQueue.length > 0) {
      setTimeout(() => this.processRetryQueue(), 5000); // Retry after 5 seconds
    }
  }

  private handlePageUnload(): void {
    if (this.currentPageId && this.pageStartTime > 0) {
      const timeOnPage = Date.now() - this.pageStartTime;
      
      // Use sendBeacon for unload events (more reliable)
      if (navigator.sendBeacon && this.isEnabled) {
        const trackingData: TrafficData = {
          page_name: this.currentPageId,
          page_url: window.location.href,
          session_id: this.sessionId,
          time_on_page: timeOnPage,
          meta_data: {
            exit_type: 'unload',
            exit_timestamp: new Date().toISOString(),
          },
        };

        const user = getCurrentUser();
        const payload = JSON.stringify(trackingData);
        
        try {
          navigator.sendBeacon(`${API_BASE_URL}/track`, payload);
        } catch (error) {
          console.debug('sendBeacon failed:', error);
        }
      }
    }
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page became hidden, track time spent
      if (this.currentPageId && this.pageStartTime > 0) {
        const timeOnPage = Date.now() - this.pageStartTime;
        this.trackPageExit(timeOnPage);
      }
    } else {
      // Page became visible again, restart timer
      this.pageStartTime = Date.now();
    }
  }

  public trackCustomEvent(eventName: string, eventData?: Record<string, unknown>): void {
    if (!this.isEnabled) return;

    const trackingData: TrafficData = {
      page_name: this.currentPageId || 'unknown',
      page_url: typeof window !== 'undefined' ? window.location.href : '',
      session_id: this.sessionId,
      meta_data: {
        event_type: 'custom_event',
        event_name: eventName,
        event_data: eventData,
        timestamp: new Date().toISOString(),
      },
    };

    this.sendTrackingData(trackingData);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
export const trafficTracker = TrafficTracker.getInstance();

// Export convenience functions
export const trackPageView = (url?: string) => trafficTracker.trackPageView(url);
export const trackCustomEvent = (eventName: string, eventData?: Record<string, unknown>) => 
  trafficTracker.trackCustomEvent(eventName, eventData);
export const setTrackingEnabled = (enabled: boolean) => trafficTracker.setEnabled(enabled);