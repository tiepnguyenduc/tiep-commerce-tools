export {};
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    gtag: (command: 'config' | 'event' | 'set', eventName: string, eventParams?: Record<string, unknown>) => void;
  }
}
