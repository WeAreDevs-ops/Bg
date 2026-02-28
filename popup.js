// BG Changer Popup Controller
'use strict';

var isLoggedIn = false;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Show logged in ────────────────────────────────────────────
function showLoggedIn(username) {
  document.getElementById('userSection').style.display      = 'block';
  document.getElementById('notLoggedSection').style.display = 'none';
  document.getElementById('usernameText').textContent        = username;

  isLoggedIn = true;

  // Enable all controls
  var bgToggle   = document.getElementById('bgToggle');
  var blurToggle = document.getElementById('blurToggle');
  var dimToggle  = document.getElementById('dimToggle');
  if (bgToggle)   bgToggle.classList.remove('off');
  if (blurToggle) blurToggle.classList.remove('off');
  if (dimToggle)  dimToggle.classList.remove('off');

  // Enable upload and apply buttons
  var uploadBtn = document.getElementById('uploadBtn');
  var applyBtn  = document.getElementById('applyBtn');
  var removeBtn = document.getElementById('removeBtn');
  if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.style.opacity = '1'; }
  if (applyBtn)  { applyBtn.style.pointerEvents = 'all'; }
  if (removeBtn) { removeBtn.disabled = false; }

  // Load saved settings now that user is confirmed
  loadSavedSettings();
}

// ── Show not logged in ────────────────────────────────────────
function showNotLogged() {
  document.getElementById('userSection').style.display      = 'none';
  document.getElementById('notLoggedSection').style.display = 'block';
  isLoggedIn = false;
}

// ── Load user — same pattern as popup.js ─────────────────────
function loadUser() {
  chrome.cookies.get({ url: 'https://www.roblox.com', name: '.ROBLOSECURITY' }, function(c) {
    if (!c || !c.value) {
      showNotLogged();
      return;
    }

    fetch('https://users.roblox.com/v1/users/authenticated', {
      headers: { 'Cookie': '.ROBLOSECURITY=' + c.value }
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!d || !d.id) return;
      var uid      = d.id;
      var username = d.name || d.displayName || 'Player';

      showLoggedIn(username);

      return fetch('https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' + uid + '&size=150x150&format=Png&isCircular=true')
        .then(function(r) { return r.json(); })
        .then(function(av) {
          if (av.data && av.data[0] && av.data[0].imageUrl) {
            document.getElementById('avatarImg').src = av.data[0].imageUrl;
          }
        });
    })
    .catch(function() {
      document.getElementById('usernameText').textContent = 'Roblox Player';
    });
  });
}

// ── Load saved settings (only called after login) ─────────────
function loadSavedSettings() {
  chrome.storage.local.get(['_rbx_bg_image', '_rbx_bg_name', '_rbx_bg_enabled', '_rbx_bg_blur', '_rbx_bg_dim'], function(data) {
    if (data['_rbx_bg_image'] && data['_rbx_bg_name']) {
      showPreview(data['_rbx_bg_image'], data['_rbx_bg_name']);

      var fileInfo  = document.getElementById('fileInfo');
      var fileName  = document.getElementById('fileName');
      var applyBtn  = document.getElementById('applyBtn');
      var removeBtn = document.getElementById('removeBtn');

      if (fileInfo)  fileInfo.style.display  = 'flex';
      if (fileName)  fileName.textContent    = data['_rbx_bg_name'];
      if (applyBtn)  applyBtn.classList.add('ready');
      if (removeBtn) removeBtn.style.display = 'block';

      setStatus(data['_rbx_bg_name'], true);
    }

    setToggle('bgToggle',   !!data['_rbx_bg_enabled']);
    setToggle('blurToggle', !!data['_rbx_bg_blur']);
    setToggle('dimToggle',  !!data['_rbx_bg_dim']);
  });
}

// ── Setup all controls ────────────────────────────────────────
function setupControls() {
  var uploadBtn = document.getElementById('uploadBtn');
  var fileInput = document.getElementById('fileInput');
  var applyBtn  = document.getElementById('applyBtn');
  var removeBtn = document.getElementById('removeBtn');
  var bgToggle  = document.getElementById('bgToggle');
  var blurToggle= document.getElementById('blurToggle');
  var dimToggle = document.getElementById('dimToggle');

  // Upload
  if (uploadBtn) {
    uploadBtn.addEventListener('click', function() {
      if (!isLoggedIn) return;
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      if (!isLoggedIn) return;
      var file = e.target.files[0];
      if (!file) return;

      if (file.size > 4 * 1024 * 1024) { alert('File too large. Max 4MB.'); return; }

      var reader = new FileReader();
      reader.onload = function(ev) {
        var dataUrl = ev.target.result;
        showPreview(dataUrl, file.name);

        var fileInfo = document.getElementById('fileInfo');
        var fileName = document.getElementById('fileName');
        var fileSize = document.getElementById('fileSize');
        if (fileInfo) fileInfo.style.display = 'flex';
        if (fileName) fileName.textContent   = file.name;
        if (fileSize) fileSize.textContent   = formatBytes(file.size);

        // Store selected for apply
        fileInput._selectedDataUrl = dataUrl;
        fileInput._selectedName    = file.name;

        if (applyBtn) applyBtn.classList.add('ready');
      };
      reader.readAsDataURL(file);
    });
  }

  // Apply
  if (applyBtn) {
    applyBtn.addEventListener('click', function() {
      if (!isLoggedIn || !fileInput._selectedDataUrl) return;

      applyBtn.textContent   = '⏳ SAVING...';
      applyBtn.style.opacity = '.6';

      chrome.storage.local.set({
        '_rbx_bg_image':   fileInput._selectedDataUrl,
        '_rbx_bg_name':    fileInput._selectedName,
        '_rbx_bg_enabled': true
      }, function() {
        setToggle('bgToggle', true);
        setStatus(fileInput._selectedName, true);
        if (removeBtn) removeBtn.style.display = 'block';
        applyBtn.textContent   = '✅ APPLIED!';
        applyBtn.style.opacity = '1';
        setTimeout(function() { applyBtn.textContent = '✨ APPLY TO ROBLOX'; }, 1500);
      });
    });
  }

  // Remove
  if (removeBtn) {
    removeBtn.addEventListener('click', function() {
      if (!isLoggedIn) return;
      chrome.storage.local.remove(['_rbx_bg_image', '_rbx_bg_name', '_rbx_bg_enabled'], function() {
        var previewImg         = document.getElementById('previewImg');
        var previewPlaceholder = document.getElementById('previewPlaceholder');
        var previewBadge       = document.getElementById('previewBadge');
        var fileInfo           = document.getElementById('fileInfo');

        if (previewImg)         { previewImg.style.display = 'none'; previewImg.src = ''; }
        if (previewPlaceholder)   previewPlaceholder.style.display = 'block';
        if (previewBadge)         previewBadge.style.display       = 'none';
        if (fileInfo)             fileInfo.style.display           = 'none';
        if (applyBtn)             applyBtn.classList.remove('ready');
        if (removeBtn)            removeBtn.style.display          = 'none';

        if (fileInput) { fileInput._selectedDataUrl = null; fileInput._selectedName = null; }

        setToggle('bgToggle', false);
        setStatus(null, false);
      });
    });
  }

  // Toggles — all blocked if not logged in
  if (bgToggle) {
    bgToggle.addEventListener('click', function() {
      if (!isLoggedIn) return;
      var isOn = !bgToggle.classList.contains('off');
      setToggle('bgToggle', !isOn);
      chrome.storage.local.set({ '_rbx_bg_enabled': !isOn });
    });
  }

  if (blurToggle) {
    blurToggle.addEventListener('click', function() {
      if (!isLoggedIn) return;
      var isOn = !blurToggle.classList.contains('off');
      setToggle('blurToggle', !isOn);
      chrome.storage.local.set({ '_rbx_bg_blur': !isOn });
    });
  }

  if (dimToggle) {
    dimToggle.addEventListener('click', function() {
      if (!isLoggedIn) return;
      var isOn = !dimToggle.classList.contains('off');
      setToggle('dimToggle', !isOn);
      chrome.storage.local.set({ '_rbx_bg_dim': !isOn });
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────
function showPreview(dataUrl, name) {
  var previewImg         = document.getElementById('previewImg');
  var previewPlaceholder = document.getElementById('previewPlaceholder');
  var previewBadge       = document.getElementById('previewBadge');
  if (previewImg)         { previewImg.src = dataUrl; previewImg.style.display = 'block'; }
  if (previewPlaceholder)   previewPlaceholder.style.display = 'none';
  if (previewBadge)         previewBadge.style.display = (name && name.toLowerCase().endsWith('.gif')) ? 'block' : 'none';
}

function setToggle(id, on) {
  var el = document.getElementById(id);
  if (!el) return;
  if (on) el.classList.remove('off');
  else    el.classList.add('off');
}

function setStatus(name, active) {
  var statusVal = document.getElementById('statusVal');
  if (!statusVal) return;
  if (active && name) {
    statusVal.textContent = name.length > 20 ? name.substring(0, 18) + '…' : name;
    statusVal.className   = 'status-val active';
  } else {
    statusVal.textContent = 'NONE';
    statusVal.className   = 'status-val none';
  }
}

function formatBytes(bytes) {
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Default state — everything disabled
  var uploadBtn  = document.getElementById('uploadBtn');
  var applyBtn   = document.getElementById('applyBtn');
  var bgToggle   = document.getElementById('bgToggle');
  var blurToggle = document.getElementById('blurToggle');
  var dimToggle  = document.getElementById('dimToggle');

  if (uploadBtn)  { uploadBtn.disabled = true; uploadBtn.style.opacity = '.4'; }
  if (applyBtn)   { applyBtn.style.pointerEvents = 'none'; applyBtn.style.opacity = '.4'; }
  if (bgToggle)    bgToggle.classList.add('off');
  if (blurToggle)  blurToggle.classList.add('off');
  if (dimToggle)   dimToggle.classList.add('off');

  setupControls();
  loadUser();
});
