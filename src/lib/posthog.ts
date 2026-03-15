import posthog from 'posthog-js';

// Initialized in main.tsx — this module re-exports for convenience
export { posthog };

export const trackEvent = (event: string, properties?: Record<string, any>) => {
  try {
    posthog.capture(event, properties);
  } catch {
    // PostHog not initialized or disabled — silently ignore
  }
};

export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  try {
    posthog.identify(userId, traits);
  } catch {}
};

export const resetUser = () => {
  try {
    posthog.reset();
  } catch {}
};
