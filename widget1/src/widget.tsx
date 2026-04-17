/**
 * Widget Entry Point - IIFE Build
 * This file is used for production builds as an embeddable widget
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import type { WidgetInitOptions } from "./types";
import { isDomainAllowed } from "./lib/allowed-domains";

// Global interface for window object
declare global {
  interface Window {
    SCIRPWidget: {
      init: (options: WidgetInitOptions) => void;
    };
  }
}

/**
 * Initialize the widget on a webpage
 * Creates an isolated container with Shadow DOM to prevent style conflicts
 */
function init(options: WidgetInitOptions) {
  if (!options.tenantId) {
    console.error("[SCIRP+] Error: tenantId is required");
    return;
  }

  const referrer = document.referrer || window.location.href;
  const domainCheck = isDomainAllowed(referrer, options.tenantId);

  if (!domainCheck.allowed) {
    console.error("[SCIRP+] Security Error:", domainCheck.reason || "This domain is not authorized to embed the SCIRP+ widget");
    console.error("[SCIRP+] Contact your city administrator to authorize this domain");
    return;
  }

  console.log("[SCIRP+] Domain authorization: ✓ Passed");

  if (document.getElementById("scirp-citizen-widget")) {
    console.warn("[SCIRP+] Widget already initialized");
    return;
  }

  console.log("[SCIRP+] Initializing SCIRP+ Citizen Widget...", options);

  const container = document.createElement("div");
  container.id = "scirp-citizen-widget";
  document.body.appendChild(container);

  // Create Shadow DOM for style isolation
  const shadowRoot = container.attachShadow({ mode: "open" });

  // Create container for React app inside shadow
  const shadowContainer = document.createElement("div");
  shadowContainer.id = "shadow-root-container";
  shadowRoot.appendChild(shadowContainer);

  // Add base styles and CSS variables to shadow DOM
  const style = document.createElement("style");
  style.textContent = `
    :host {
      /* CSS Variables for theming - Blue gradient theme */
      --background: 0 0% 100%;
      --foreground: 0 0% 20%;
      --card: 0 0% 100%;
      --card-foreground: 0 0% 20%;
      --popover: 0 0% 100%;
      --popover-foreground: 0 0% 20%;
      --primary: 217 91% 60%;
      --primary-foreground: 0 0% 100%;
      --secondary: 0 0% 97%;
      --secondary-foreground: 0 0% 20%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 0 0% 40%;
      --accent: 217 91% 60%;
      --accent-foreground: 0 0% 100%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 0 0% 100%;
      --border: 214.3 31.8% 91.4%;
      --input: 214.3 31.8% 91.4%;
      --ring: 217 91% 60%;
      --radius: 0.5rem;
      
      all: initial;
      display: contents;
      font-family: 'Montserrat', 'Gotham', -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
    }
    #shadow-root-container {
      position: relative;
      z-index: 999999;
      color-scheme: light;
      font-family: 'Montserrat', 'Gotham', -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
      font-size: 16px;
      
      /* Re-apply CSS variables */
      --background: 0 0% 100%;
      --foreground: 0 0% 20%;
      --card: 0 0% 100%;
      --card-foreground: 0 0% 20%;
      --popover: 0 0% 100%;
      --popover-foreground: 0 0% 20%;
      --primary: 217 91% 60%;
      --primary-foreground: 0 0% 100%;
      --secondary: 0 0% 97%;
      --secondary-foreground: 0 0% 20%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 0 0% 40%;
      --accent: 217 91% 60%;
      --accent-foreground: 0 0% 100%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 0 0% 100%;
      --border: 214.3 31.8% 91.4%;
      --input: 214.3 31.8% 91.4%;
      --ring: 217 91% 60%;
      --radius: 0.5rem;
    }
    /* Ensure all elements have proper display */
    #shadow-root-container * {
      box-sizing: border-box;
      font-family: 'Montserrat', 'Gotham', -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
    }
  `;
  shadowRoot.appendChild(style);

  // Add Google Fonts link to shadow DOM
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap";
  shadowRoot.appendChild(fontLink);

  // Fetch and inject CSS content directly into shadow DOM
  // This is necessary because <link> tags don't always work reliably in Shadow DOM
  const loadCSS = async () => {
    let cssHref = "";

    // Try to find CSS link in document
    const existingStyles = document.querySelector('link[href*="widget.css"]');
    if (existingStyles) {
      cssHref = (existingStyles as HTMLLinkElement).href;
    } else {
      // Fallback: construct path from script src
      const scriptElement = document.querySelector('script[src*="widget.js"]');
      if (scriptElement) {
        const scriptSrc = (scriptElement as HTMLScriptElement).src;
        cssHref = scriptSrc.replace("widget.js", "widget.css");
      }
    }

    if (cssHref) {
      try {
        const response = await fetch(cssHref);
        let cssText = await response.text();

        // Replace :root with :host for Shadow DOM compatibility
        // This ensures CSS variables work inside the shadow root
        cssText = cssText.replace(/:root/g, ":host");

        // Replace body selector with #shadow-root-container for Shadow DOM
        // Since there's no body element in Shadow DOM, we target our container
        cssText = cssText.replace(/\bbody\b/g, "#shadow-root-container");

        // Add explicit background colors for common component classes
        // This ensures visibility even if CSS variables don't work properly
        cssText += `
          /* Explicit background colors for visibility - Blue theme */
          .bg-card { background-color: white !important; }
          .bg-background { background-color: white !important; }
          .bg-popover { background-color: white !important; }
          .bg-primary { background-color: #3B82F6 !important; color: white !important; }
          .bg-secondary { background-color: #f7f7f7 !important; }
          .bg-muted { background-color: #f5f5f5 !important; }
          .bg-accent { background-color: #3B82F6 !important; }
          .text-foreground { color: #333333 !important; }
          .text-muted-foreground { color: #666666 !important; }
          .text-primary-foreground { color: white !important; }
          .border { border-color: #e5e5e5 !important; }
        `;

        const styleElement = document.createElement("style");
        styleElement.textContent = cssText;
        shadowRoot.appendChild(styleElement);
        console.log("[SCIRP+] Styles loaded successfully");
        console.log(
          "[SCIRP+] CSS length:",
          cssText.length,
          "characters"
        );
      } catch (error) {
        console.error("[SCIRP+] Failed to load styles:", error);
      }
    } else {
      console.error("[SCIRP+] Could not determine CSS path");
    }
  };

  // Load CSS first, then render React app
  loadCSS().then(() => {
    // Render React app with provided configuration
    const root = ReactDOM.createRoot(shadowContainer);
    root.render(
      <React.StrictMode>
        <App config={options} />
      </React.StrictMode>
    );

    console.log("[SCIRP+] Citizen Widget initialized successfully");
  });
}

// Expose init function globally
window.SCIRPWidget = {
  init,
};

// Auto-initialize if data attributes are found on script tag
if (typeof window !== "undefined") {
  const currentScript = document.currentScript as HTMLScriptElement | null;
  if (currentScript) {
    const tenantId = currentScript.getAttribute("data-tenant-id");
    const apiEndpoint = currentScript.getAttribute("data-api-endpoint");

    if (tenantId) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          init({ tenantId, apiEndpoint: apiEndpoint || undefined });
        });
      } else {
        init({ tenantId, apiEndpoint: apiEndpoint || undefined });
      }
    }
  }
}

export { init };
