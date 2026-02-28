'use strict';

var _selectedDataUrl = null;
var _selectedName    = null;
var _selectedIsGif   = false;

document.addEventListener('DOMContentLoaded', function () {
  checkLogin();
  loadSavedSettings();
  initControls();
});

// ── Login check — same pattern as popup.js ────────────────────
function checkLogin() {
  chrome.cookies.get({ url: 'https://www.roblox.com', name: '.ROBLOSECURITY' }, function (cookie) {
    if (!cookie || !cookie.value) {
      showNotLogged();
      return;
    }

    fetch('https://users.roblox.com/v1/users/authenticated', {
      method: 'GET',
      headers: { 'Cookie': '.ROBLOSECURITY=' + cookie.value },
      credentials: 'include'
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data || !data.id) { showNotLogged(); return; }

      var name = data.displayName || data.name || 'Roblox Player';
      showLoggedIn(name);

      // Fetch avatar
      fetch('https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' + data.id + '&size=150x150&format=Png&isCircular=true', {
        headers: { 'Cookie': '.ROBLOSECURITY=' + cookie.value },
        credentials: 'include'
      })
      .then(function (res) { return res.json(); })
      .then(function (d) {
        if (d && d.data && d.data[0] && d.data[0].imageUrl) {
          var avatarImg = document.getElementById('avatarImg');
          if (avatarImg) avatarImg.src = d.data[0].imageUrl;
        }
      })
      .catch(function () {});
    })
    .catch(function () { showNotLogged(); });
  });
}

function showLoggedIn(name) {
  var userSection      = document.getElementById('userSection');
  var notLoggedSection = document.getElementById('notLoggedSection');
  var usernameText     = document.getElementById('usernameText');
  if (notLoggedSection) notLoggedSection.style.display = 'none';
  if (userSection)      userSection.style.display      = 'block';
  if (usernameText)     usernameText.textContent        = name;
}

function showNotLogged() {
  var userSection      = document.getElementById('userSection');
  var notLoggedSection = document.getElementById('notLoggedSection');
  if (userSection)      userSection.style.display      = 'none';
  if (notLoggedSection) notLoggedSection.style.display = 'block';
}

// ── Load saved settings from storage ─────────────────────────
function loadSavedSettings() {
  chrome.storage.local.get(['_rbx_bg_image', '_rbx_bg_name', '_rbx_bg_enabled', '_rbx_bg_blur', '_rbx_bg_dim'], function (data) {

    if (data['_rbx_bg_image'] && data['_rbx_bg_name']) {
      // Show saved preview
      showPreview(data['_rbx_bg_image'], data['_rbx_bg_name']);
      _selectedDataUrl = data['_rbx_bg_image'];
      _selectedName    = data['_rbx_bg_name'];
      _selectedIsGif   = data['_rbx_bg_name'].toLowerCase().endsWith('.gif');

      // Enable apply button
      var applyBtn = document.getElementById('applyBtn');
      if (applyBtn) applyBtn.classList.add('ready');

      // Show remove button
      var removeBtn = document.getElementById('removeBtn');
      if (removeBtn) removeBtn.style.display = 'block';

      // Update status
      setStatus(data['_rbx_bg_name'], true);
    }

    // Restore toggles
    setToggle('bgToggle',   !!data['_rbx_bg_enabled']);
    setToggle('blurToggle', !!data['_rbx_bg_blur']);
    setToggle('dimToggle',  !!data['_rbx_bg_dim']);
  });
}

// ── Init controls ─────────────────────────────────────────────
function initControls() {

  // Upload button
  var uploadBtn = document.getElementById('uploadBtn');
  var fileInput = document.getElementById('fileInput');

  if (uploadBtn) {
    uploadBtn.addEventListener('click', function () {
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;

      // Max 4MB check
      if (file.size > 4 * 1024 * 1024) {
        alert('File too large. Max 4MB.');
        return;
      }

      _selectedIsGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
      _selectedName  = file.name;

      var reader = new FileReader();
      reader.onload = function (ev) {
        _selectedDataUrl = ev.target.result;
        showPreview(_selectedDataUrl, file.name);

        // Show file info
        var fileInfo = document.getElementById('fileInfo');
        var fileName = document.getElementById('fileName');
        var fileSize = document.getElementById('fileSize');
        if (fileInfo) fileInfo.style.display = 'flex';
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = formatBytes(file.size);

        // Enable apply button
        var applyBtn = document.getElementById('applyBtn');
        if (applyBtn) applyBtn.classList.add('ready');
      };
      reader.readAsDataURL(file);
    });
  }

  // Apply button
  var applyBtn = document.getElementById('applyBtn');
  if (applyBtn) {
    applyBtn.addEventListener('click', function () {
      if (!_selectedDataUrl) return;

      applyBtn.textContent = '⏳ SAVING...';
      applyBtn.style.opacity = '.6';

      chrome.storage.local.set({
        '_rbx_bg_image':   _selectedDataUrl,
        '_rbx_bg_name':    _selectedName,
        '_rbx_bg_enabled': true
      }, function () {
        setToggle('bgToggle', true);
        setStatus(_selectedName, true);

        var removeBtn = document.getElementById('removeBtn');
        if (removeBtn) removeBtn.style.display = 'block';

        applyBtn.textContent = '✅ APPLIED!';
        setTimeout(function () {
          applyBtn.textContent = '✨ APPLY TO ROBLOX';
          applyBtn.style.opacity = '1';
        }, 1500);
      });
    });
  }

  // Remove button
  var removeBtn = document.getElementById('removeBtn');
  if (removeBtn) {
    removeBtn.addEventListener('click', function () {
      chrome.storage.local.remove(['_rbx_bg_image', '_rbx_bg_name', '_rbx_bg_enabled'], function () {
        _selectedDataUrl = null;
        _selectedName    = null;

        // Reset preview
        var previewImg         = document.getElementById('previewImg');
        var previewPlaceholder = document.getElementById('previewPlaceholder');
        var previewBadge       = document.getElementById('previewBadge');
        var fileInfo           = document.getElementById('fileInfo');
        var applyBtn           = document.getElementById('applyBtn');

        if (previewImg)         { previewImg.style.display = 'none'; previewImg.src = ''; }
        if (previewPlaceholder)   previewPlaceholder.style.display = 'block';
        if (previewBadge)         previewBadge.style.display = 'none';
        if (fileInfo)             fileInfo.style.display = 'none';
        if (applyBtn)             applyBtn.classList.remove('ready');
        if (removeBtn)            removeBtn.style.display = 'none';

        setToggle('bgToggle', false);
        setStatus(null, false);
      });
    });
  }

  // Toggle — BG Enabled
  var bgToggle = document.getElementById('bgToggle');
  if (bgToggle) {
    bgToggle.addEventListener('click', function () {
      var isOn = !bgToggle.classList.contains('off');
      setToggle('bgToggle', !isOn);
      chrome.storage.local.set({ '_rbx_bg_enabled': !isOn });
    });
  }

  // Toggle — Blur
  var blurToggle = document.getElementById('blurToggle');
  if (blurToggle) {
    blurToggle.addEventListener('click', function () {
      var isOn = !blurToggle.classList.contains('off');
      setToggle('blurToggle', !isOn);
      chrome.storage.local.set({ '_rbx_bg_blur': !isOn });
    });
  }

  // Toggle — Dim
  var dimToggle = document.getElementById('dimToggle');
  if (dimToggle) {
    dimToggle.addEventListener('click', function () {
      var isOn = !dimToggle.classList.contains('off');
      setToggle('dimToggle', !isOn);
      chrome.storage.local.set({ '_rbx_bg_dim': !isOn });
    });
  }
}

// ── Show preview ──────────────────────────────────────────────
function showPreview(dataUrl, name) {
  var previewImg         = document.getElementById('previewImg');
  var previewPlaceholder = document.getElementById('previewPlaceholder');
  var previewBadge       = document.getElementById('previewBadge');

  if (previewImg) {
    previewImg.src = dataUrl;
    previewImg.style.display = 'block';
  }

  if (previewPlaceholder) previewPlaceholder.style.display = 'none';

  var isGif = name && name.toLowerCase().endsWith('.gif');
  if (previewBadge) {
    previewBadge.style.display = isGif ? 'block' : 'none';
  }
}

// ── Set toggle state ──────────────────────────────────────────
function setToggle(id, on) {
  var el = document.getElementById(id);
  if (!el) return;
  if (on) { el.classList.remove('off'); }
  else    { el.classList.add('off'); }
}

// ── Update status display ─────────────────────────────────────
function setStatus(name, active) {
  var statusVal = document.getElementById('statusVal');
  if (!statusVal) return;
  if (active && name) {
    var short = name.length > 20 ? name.substring(0, 18) + '…' : name;
    statusVal.textContent = short;
    statusVal.className   = 'status-val active';
  } else {
    statusVal.textContent = 'NONE';
    statusVal.className   = 'status-val none';
  }
}

// ── Format file size ──────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
