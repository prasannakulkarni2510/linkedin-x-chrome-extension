// Toolbar button and keyboard command toggle Swipe Mode in the current tab; content scripts
// ask here to open LinkedIn or X links in a background tab. No state lives in the worker.
const SITE_URL = /^https:\/\/((www\.)?linkedin\.com|x\.com)\//;

async function toggleIn(tab) {
  if (!tab || tab.id == null) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'swipe-mode:toggle' });
  } catch (_) {
    // Not a LinkedIn or X tab, or the page loaded before the extension: nothing to toggle.
  }
}

chrome.action.onClicked.addListener(toggleIn);

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-swipe-mode') toggleIn(tab);
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'swipe-mode:open-tab' || typeof msg.url !== 'string' || !SITE_URL.test(msg.url)) return;
  const props = { url: msg.url, active: false };
  if (sender.tab) {
    props.index = sender.tab.index + 1;
    props.openerTabId = sender.tab.id;
  }
  chrome.tabs.create(props);
});

// --- tweet screenshots -------------------------------------------------------------------
// The content script renders the PNG; saving happens here because the folder handle and its
// permission belong to the extension, not to x.com. The folder is asked for once, in the folder
// page, and remembered. After a browser restart Chrome may ask once more to allow it.
importScripts('../core/folder-store.js');
const store = self.SwipeMode.folderStore;
const IMAGE_HOSTS = /^https:\/\/(pbs|abs|video)\.twimg\.com\//;

function openFolderPage(mode) {
  chrome.windows.create({ url: chrome.runtime.getURL('shot/folder.html?mode=' + mode), type: 'popup', width: 480, height: 380 });
}

async function imageAsDataUrl(url) {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const type = res.headers.get('content-type') || 'image/jpeg';
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return `data:${type};base64,${btoa(bin)}`;
}

// Saves into the remembered folder, or parks the shot and opens the folder page.
async function saveShot(shot) {
  const dir = await store.getFolder();
  if (dir && (await store.permission(dir)) === 'granted') {
    const blob = await (await fetch(shot.dataUrl)).blob();
    const file = await store.writePng(dir, shot.name, blob);
    return { status: 'saved', folder: dir.name, file };
  }
  await store.setPending(shot);
  openFolderPage(dir ? 'allow' : 'choose');
  return { status: dir ? 'allow' : 'choose' };
}

async function flushPending() {
  const shot = await store.getPending();
  if (!shot) return { status: 'none' };
  const result = await saveShot(shot);
  if (result.status === 'saved') {
    await store.clearPending();
    if (shot.tabId != null) chrome.tabs.sendMessage(shot.tabId, Object.assign({ type: 'swipe-mode:shot-saved' }, result)).catch(() => {});
  }
  return result;
}

// Replies live on the post's own page. To read them without leaving Swipe Mode, the post opens in
// a background tab next to this one, the content script there reads the thread, and the tab
// closes again.
const STATUS_URL = /^https:\/\/x\.com\/\w{1,15}\/status\/\d+$/;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function readThreadInTab(url, id, scrolls, opener, mainOnly) {
  const props = { url, active: false };
  if (opener) {
    props.index = opener.index + 1;
    props.openerTabId = opener.id;
  }
  const tab = await chrome.tabs.create(props);
  try {
    for (const end = Date.now() + 30000; Date.now() < end; ) {
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'swipe-mode:shot-read', id, scrolls, mainOnly: !!mainOnly }).catch(() => null);
      if (res) return res;
      await pause(500); // not loaded yet, or still on another URL
    }
    return { status: 'error', error: 'The post did not load in time.' };
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
}
self.readThreadInTab = readThreadInTab; // e2e tests call it with the mock post page

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string') return;
  const reply = (p) => {
    p.then(sendResponse, (err) => sendResponse({ status: 'error', error: String((err && err.message) || err) }));
    return true;
  };
  switch (msg.type) {
    case 'swipe-mode:fetch-image':
      if (typeof msg.url !== 'string' || !IMAGE_HOSTS.test(msg.url)) return sendResponse({ status: 'error', error: 'host' });
      return reply(imageAsDataUrl(msg.url).then((dataUrl) => ({ status: 'ok', dataUrl })));
    case 'swipe-mode:save-shot':
      if (typeof msg.dataUrl !== 'string' || !msg.dataUrl.startsWith('data:image/png;')) return sendResponse({ status: 'error', error: 'png' });
      return reply(
        saveShot({
          dataUrl: msg.dataUrl,
          name: String(msg.name || 'tweet').replace(/[^\w.-]+/g, '-').slice(0, 80) || 'tweet',
          tabId: sender.tab ? sender.tab.id : null,
        })
      );
    case 'swipe-mode:shot-thread':
      if (typeof msg.url !== 'string' || !STATUS_URL.test(msg.url) || !/^\d+$/.test(String(msg.id))) return sendResponse({ status: 'error', error: 'url' });
      return reply(readThreadInTab(msg.url, String(msg.id), Math.min(Number(msg.scrolls) || 0, 10), sender.tab, !!msg.mainOnly));
    case 'swipe-mode:folder-ready':
      return reply(flushPending());
    case 'swipe-mode:folder-info':
      return reply(store.getFolder().then((d) => ({ status: 'ok', folder: d ? d.name : null })));
    case 'swipe-mode:choose-folder':
      openFolderPage('choose');
      return sendResponse({ status: 'ok' });
  }
});
