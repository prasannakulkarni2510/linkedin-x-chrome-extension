// Options page: edits settings in chrome.storage.local and runs page diagnostics.
(function () {
  'use strict';
  const { normalizeSettings } = window.SwipeMode.settings;
  const FIELDS = ['graceMs', 'postGapMs', 'excludePromoted', 'showLauncher', 'pacingEnabled', 'minGapMs', 'maxPerTenMinutes'];
  const savedMsg = document.getElementById('saved');
  let current = normalizeSettings({});

  function fill() {
    for (const k of FIELDS) {
      const el = document.getElementById(k);
      if (el.type === 'checkbox') el.checked = current[k];
      else el.value = String(current[k]);
    }
  }

  function read() {
    const raw = { ...current };
    for (const k of FIELDS) {
      const el = document.getElementById(k);
      raw[k] = el.type === 'checkbox' ? el.checked : Number(el.value);
    }
    return normalizeSettings(raw);
  }

  chrome.storage.local.get('settings', (o) => {
    current = normalizeSettings(o && o.settings);
    fill();
  });

  document.querySelector('main').addEventListener('change', (e) => {
    if (!FIELDS.includes(e.target.id)) return;
    current = read();
    chrome.storage.local.set({ settings: current }, () => {
      fill();
      savedMsg.textContent = 'Saved';
      setTimeout(() => (savedMsg.textContent = ''), 1500);
    });
  });

  const out = document.getElementById('diagOut');
  const copyBtn = document.getElementById('copyOut');

  // The most recently used LinkedIn or X tab.
  async function askSiteTab(type, pretty) {
    out.hidden = false;
    copyBtn.hidden = true;
    const tabs = await chrome.tabs.query({ url: ['https://www.linkedin.com/*', 'https://x.com/*'] });
    const tab = tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
    if (!tab) {
      out.textContent = 'No LinkedIn or X tab is open. Open www.linkedin.com/feed or x.com/home in a tab and try again.';
      return;
    }
    try {
      const report = await chrome.tabs.sendMessage(tab.id, { type });
      out.textContent = pretty ? JSON.stringify(report, null, 2) : JSON.stringify(report);
      copyBtn.hidden = false;
    } catch (_) {
      out.textContent = 'Swipe Mode is not running in that tab yet. Reload the tab and try again.';
    }
  }

  document.getElementById('diag').addEventListener('click', () => askSiteTab('swipe-mode:diagnostics', true));
  document.getElementById('probe').addEventListener('click', () => askSiteTab('swipe-mode:probe', false));
  copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(out.textContent);
    copyBtn.textContent = 'Copied';
    setTimeout(() => (copyBtn.textContent = 'Copy result'), 1500);
  });
})();
