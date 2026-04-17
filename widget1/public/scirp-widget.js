/**
 * SCIRP+ Embeddable Government Widget
 * ====================================
 * Drop this script on any municipal website with a single tag:
 *
 *   <script src="scirp-widget.js" data-tenant-id="pune-uuid-here"></script>
 *
 * The widget renders a floating "Report Issue" button that opens
 * the citizen complaint portal in an iframe overlay.
 *
 * NO framework dependencies. Runs in any browser.
 */
(function () {
  var tenantId = document.currentScript.getAttribute("data-tenant-id");
  var widgetOrigin = "http://localhost:5173"; // Point to deployed Citizen Widget URL

  if (!tenantId) {
    console.error("[SCIRP+] scirp-widget.js: data-tenant-id attribute is required.");
    return;
  }

  // ── Inject styles ──
  var style = document.createElement("style");
  style.textContent = [
    "#scirp-widget-btn {",
    "  position: fixed; bottom: 24px; right: 24px; z-index: 99999;",
    "  background: #1d4ed8; color: #fff; border: none; border-radius: 50px;",
    "  padding: 14px 22px; font-size: 15px; font-weight: 700;",
    "  cursor: pointer; box-shadow: 0 4px 20px rgba(29,78,216,0.35);",
    "  font-family: system-ui, sans-serif; transition: background 0.2s;",
    "}",
    "#scirp-widget-btn:hover { background: #1e40af; }",
    "#scirp-widget-overlay {",
    "  display: none; position: fixed; inset: 0; z-index: 99998;",
    "  background: rgba(0,0,0,0.55); align-items: center; justify-content: center;",
    "}",
    "#scirp-widget-overlay.open { display: flex; }",
    "#scirp-widget-iframe {",
    "  width: 96vw; max-width: 520px; height: 90vh;",
    "  border: none; border-radius: 16px; background: #fff;",
    "  box-shadow: 0 24px 64px rgba(0,0,0,0.3);",
    "}",
  ].join("\n");
  document.head.appendChild(style);

  // ── Floating Button ──
  var btn = document.createElement("button");
  btn.id = "scirp-widget-btn";
  btn.textContent = "📍 Report Civic Issue";
  document.body.appendChild(btn);

  // ── Overlay ──
  var overlay = document.createElement("div");
  overlay.id = "scirp-widget-overlay";

  // ── Iframe ──
  var iframe = document.createElement("iframe");
  iframe.id = "scirp-widget-iframe";
  // Pass tenant_id as query param so the citizen widget knows which city
  iframe.src = widgetOrigin + "?tenant=" + encodeURIComponent(tenantId);
  iframe.title = "Report a Civic Issue";
  iframe.allow = "geolocation";

  overlay.appendChild(iframe);
  document.body.appendChild(overlay);

  // ── Toggle Open ──
  btn.addEventListener("click", function () {
    overlay.classList.add("open");
  });

  // ── Close on backdrop click ──
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) overlay.classList.remove("open");
  });

  // ── Allow iframe to close widget via postMessage ──
  window.addEventListener("message", function (e) {
    if (e.origin === widgetOrigin && e.data === "scirp-close-widget") {
      overlay.classList.remove("open");
    }
  });
})();
