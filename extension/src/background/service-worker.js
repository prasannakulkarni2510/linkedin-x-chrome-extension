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
