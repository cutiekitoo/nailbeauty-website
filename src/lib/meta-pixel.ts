declare global {
    interface Window {
      fbq?: (...args: any[]) => void;
      _fbq?: any;
    }
  }
  
  const PIXEL_ID = "1070296012305601";
  
  export function initMetaPixel() {
    if (typeof window === "undefined") return;
    if (window.fbq) return;
  
    const n: any = function (...args: any[]) {
      if (n.callMethod) {
        n.callMethod.apply(n, args);
      } else {
        n.queue.push(args);
      }
    };
  
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
  
    window.fbq = n;
  
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
  
    const firstScript = document.getElementsByTagName("script")[0];
  
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  
    // Meta Pixel initialization
    window.fbq?.("init", PIXEL_ID);
  }
  
  export function trackPageView() {
    if (typeof window === "undefined") return;
    if (!window.fbq) return;
  
    window.fbq("track", "PageView");
  }