// Folder page: picks the screenshot folder once (or allows it again after a browser restart),
// then asks the service worker to save the screenshot that was waiting for it.
(function () {
  'use strict';
  const store = window.SwipeMode.folderStore;
  const $ = (id) => document.getElementById(id);
  const mode = new URLSearchParams(location.search).get('mode');

  function say(text, error) {
    $('status').textContent = text;
    $('status').className = error ? 'error' : '';
  }

  async function done(dir) {
    $('allow').hidden = true;
    $('choose').hidden = true;
    $('close').hidden = false;
    $('close').focus();
    const res = await chrome.runtime.sendMessage({ type: 'swipe-mode:folder-ready' });
    if (res && res.status === 'saved') {
      say(`Saved ${res.file} to “${res.folder}”.`);
      setTimeout(() => window.close(), 1400);
    } else if (res && res.status === 'error') {
      say('Could not save: ' + res.error, true);
    } else {
      say(`Screenshots will be saved to “${dir.name}”.`);
    }
  }

  async function init() {
    const dir = await store.getFolder();
    if (dir && mode === 'allow') {
      $('title').textContent = 'Allow saving again';
      $('lead').textContent = `Chrome asks again after a restart. Allow Swipe Mode to save into “${dir.name}”, or pick another folder.`;
      $('allow').hidden = false;
      $('choose').textContent = 'Choose another folder';
      $('choose').className = '';
    } else if (dir) {
      $('lead').textContent = `Screenshots are saved to “${dir.name}”. Choose another folder to change it.`;
      $('choose').textContent = 'Change folder';
    }
    // Keyboard first: Enter presses the main button (Chrome counts it as a click, which the folder
    // picker and the permission prompt need). Esc closes the window.
    ($('allow').hidden ? $('choose') : $('allow')).focus();
  }

  $('allow').addEventListener('click', async () => {
    const dir = await store.getFolder();
    try {
      if ((await dir.requestPermission({ mode: 'readwrite' })) === 'granted') return done(dir);
      say('Chrome did not allow it. Try again or choose another folder.', true);
    } catch (err) {
      say(String(err.message || err), true);
    }
  });

  $('choose').addEventListener('click', async () => {
    let dir;
    try {
      dir = await window.showDirectoryPicker({ id: 'swipe-mode-shots', mode: 'readwrite', startIn: 'pictures' });
    } catch (err) {
      if (err && err.name !== 'AbortError') say(String(err.message || err), true);
      return;
    }
    await store.setFolder(dir);
    done(dir);
  });

  $('close').addEventListener('click', () => window.close());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.close();
  });
  init();
})();
