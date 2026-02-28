'use strict';

// ─────────────────────────────────────────────────────────────
//  content_bg.js — Roblox Background Changer
//  Injected on all roblox.com pages
//  Reads from chrome.storage.local and applies background
// ─────────────────────────────────────────────────────────────

(function () {

  var STYLE_ID = '_rbx_bg_style';

  function applyBackground(dataUrl, blur, dim) {
    // Remove existing style
    removeBackground();

    var style = document.createElement('style');
    style.id = STYLE_ID;

    var blurVal = blur ? 'blur(2px)' : 'none';
    var dimVal  = dim  ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)';

    style.textContent = [
      'html, body {',
      '  background-image: url("' + dataUrl + '") !important;',
      '  background-size: cover !important;',
      '  background-position: center center !important;',
      '  background-repeat: no-repeat !important;',
      '  background-attachment: fixed !important;',
      '}',
      // Dark overlay for readability
      'body::before {',
      '  content: "" !important;',
      '  position: fixed !important;',
      '  inset: 0 !important;',
      '  background: ' + dimVal + ' !important;',
      '  pointer-events: none !important;',
      '  z-index: 0 !important;',
      '}',
      // Make main page containers slightly transparent
      '.rbx-body, #root, .ng-scope, #main-content, .page-content {',
      '  background: transparent !important;',
      '}',
    ].join('\n');

    document.head.appendChild(style);
  }

  function removeBackground() {
    var existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();
  }

  function loadAndApply() {
    chrome.storage.local.get(['_rbx_bg_image', '_rbx_bg_enabled', '_rbx_bg_blur', '_rbx_bg_dim'], function (data) {
      if (data['_rbx_bg_image'] && data['_rbx_bg_enabled']) {
        applyBackground(
          data['_rbx_bg_image'],
          !!data['_rbx_bg_blur'],
          !!data['_rbx_bg_dim']
        );
      } else {
        removeBackground();
      }
    });
  }

  // Apply on page load
  if (document.head) {
    loadAndApply();
  } else {
    document.addEventListener('DOMContentLoaded', loadAndApply);
  }

  // Listen for changes from popup (toggle on/off, new image applied)
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    var keys = ['_rbx_bg_image', '_rbx_bg_enabled', '_rbx_bg_blur', '_rbx_bg_dim'];
    var relevant = keys.some(function (k) { return k in changes; });
    if (relevant) loadAndApply();
  });

})();
