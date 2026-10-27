// The folder screenshots are saved to, kept as a File System Access handle in the extension's
// own IndexedDB (never the site's), plus the one screenshot waiting while you pick or allow it.
// Shared by the service worker (importScripts) and the folder page (<script>).
(function (root) {
  'use strict';
  const DB = 'swipe-mode';
  const STORE = 'kv';

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function run(mode, fn) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req && req.result);
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  const get = (key) => run('readonly', (s) => s.get(key));
  const set = (key, value) => run('readwrite', (s) => s.put(value, key));
  const del = (key) => run('readwrite', (s) => s.delete(key));

  // readwrite permission on the saved folder: 'granted', 'prompt' or 'denied'.
  async function permission(handle) {
    try {
      return await handle.queryPermission({ mode: 'readwrite' });
    } catch (_) {
      return 'denied';
    }
  }

  // Writes the PNG under a free name: name.png, then name-2.png, name-3.png...
  async function writePng(dir, base, blob) {
    let name = base + '.png';
    for (let i = 2; i < 1000; i++) {
      try {
        await dir.getFileHandle(name);
        name = `${base}-${i}.png`;
      } catch (_) {
        break; // NotFoundError: the name is free
      }
    }
    const file = await dir.getFileHandle(name, { create: true });
    const w = await file.createWritable();
    await w.write(blob);
    await w.close();
    return name;
  }

  (root.SwipeMode = root.SwipeMode || {}).folderStore = {
    getFolder: () => get('shotFolder'),
    setFolder: (h) => set('shotFolder', h),
    getPending: () => get('shotPending'),
    setPending: (p) => set('shotPending', p),
    clearPending: () => del('shotPending'),
    permission,
    writePng,
  };
})(globalThis);
