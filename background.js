// background.js (VERSIONE FINALE E FUNZIONANTE CON INIEZIONE SCRIPT)

const MAX_SCREENSHOTS = 10;
const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';
const CLEANUP_PERIOD_MINUTES = 120;

// --- LOGICA DI PULIZIA E BADGE (INVARIATA) ---
chrome.alarms.create('totalCleanupAlarm', { periodInMinutes: CLEANUP_PERIOD_MINUTES });
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'totalCleanupAlarm') clearAllScreenshots(); });
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: '#007bff' });
  chrome.storage.local.get(['screenshots'], r => { if (!r.screenshots) chrome.storage.local.set({ screenshots: [] }); updateBadge(); });
});
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.screenshots) updateBadge(); });
async function clearAllScreenshots() { await chrome.storage.local.set({ screenshots: [] }); }
async function updateBadge() {
  const result = await chrome.storage.local.get('screenshots');
  const count = result.screenshots?.length || 0;
  chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
}

// --- GESTIONE MESSAGGI E COMANDI ---
chrome.runtime.onMessage.addListener((req, sender) => {
  if (req.action === 'startCapture') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => tabs[0] && startCaptureProcess(tabs[0]));
  } else if (req.action === 'captureArea') {
    handleCaptureArea(req.data, sender.tab); // Passiamo l'intera scheda
  } else if (req.type === 'webp-created') {
    saveScreenshot(req.data.webpDataUrl, req.data.sourceUrl);
    closeOffscreenDocument();
  }
});
chrome.commands.onCommand.addListener(cmd => { if (cmd === 'trigger-area-capture') chrome.tabs.query({ active: true, currentWindow: true }, tabs => tabs[0] && startCaptureProcess(tabs[0])); });

async function startCaptureProcess(tab) {
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('https://chrome.google.com/')) {
    chrome.notifications.create({ type: 'basic', iconUrl: 'icon_128.png', title: 'Vibe-shot: Unsupported Page', message: 'Cannot capture on this special page.' });
    return;
  }
  const r = await chrome.storage.local.get('screenshots');
  if (r.screenshots?.length >= MAX_SCREENSHOTS) {
    chrome.notifications.create({ type: 'basic', iconUrl: 'icon_128.png', title: 'Vibe-shot: Limit Reached', message: `You already have ${MAX_SCREENSHOTS} screenshots.` });
    return;
  }
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content_script.js'] });
}

// NUOVA LOGICA DI GESTIONE DELLA CATTURA
async function handleCaptureArea(data, tab) {
  const { coords, sourceUrl } = data;
  const fullScreenshotDataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });

  // Eseguiamo le due operazioni in parallelo
  const [copyResult] = await Promise.all([
    copyToClipboardInPage(tab.id, fullScreenshotDataUrl, coords),
    createAndStoreWebp(fullScreenshotDataUrl, coords, sourceUrl)
  ]);

  // Mostra la notifica finale in base al risultato della copia
  showFinalNotification(copyResult);
}

// NUOVA FUNZIONE per iniettare lo script di copia nella pagina
async function copyToClipboardInPage(tabId, dataUrl, coords) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: processAndCopyToClipboard,
      args: [dataUrl, coords]
    });
    // executeScript ritorna un array di risultati, prendiamo il primo
    return results[0].result;
  } catch (e) {
    console.error("Vibe-shot: Failed to inject or execute copy script.", e);
    return false;
  }
}

// QUESTA FUNZIONE VERRÀ ESEGUITA NELLA PAGINA WEB, NON NEL BACKGROUND SCRIPT
function processAndCopyToClipboard(dataUrl, coords) {
  return new Promise(async (resolve) => {
    try {
      const image = await new Promise(res => {
        const img = new Image();
        img.onload = () => res(img);
        img.src = dataUrl;
      });

      const dpr = coords.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      canvas.width = coords.width * dpr;
      canvas.height = coords.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, coords.x * dpr, coords.y * dpr, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

      // Ridimensionamento per la clipboard
      const MAX_CLIPBOARD_DIMENSION = 1024;
      let finalCanvas = canvas;
      if (canvas.width > MAX_CLIPBOARD_DIMENSION || canvas.height > MAX_CLIPBOARD_DIMENSION) {
        let newWidth, newHeight;
        if (canvas.width > canvas.height) {
          newWidth = MAX_CLIPBOARD_DIMENSION;
          newHeight = (canvas.height / canvas.width) * MAX_CLIPBOARD_DIMENSION;
        } else {
          newHeight = MAX_CLIPBOARD_DIMENSION;
          newWidth = (canvas.width / canvas.height) * MAX_CLIPBOARD_DIMENSION;
        }
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = newWidth;
        resizedCanvas.height = newHeight;
        resizedCanvas.getContext('2d').drawImage(canvas, 0, 0, newWidth, newHeight);
        finalCanvas = resizedCanvas;
      }
      
      const blob = await new Promise(res => finalCanvas.toBlob(res, 'image/png'));
      
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      resolve(true); // Successo
    } catch (err) {
      console.error("Vibe-shot (in-page script): Error copying to clipboard.", err);
      resolve(false); // Fallimento
    }
  });
}

// Funzione per avviare la creazione del WebP
async function createAndStoreWebp(dataUrl, coords, sourceUrl) {
  await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
  chrome.runtime.sendMessage({
    type: 'create-webp',
    target: 'offscreen',
    data: { dataUrl, coords, sourceUrl }
  });
}

async function saveScreenshot(webpDataUrl, sourceUrl) {
  const r = await chrome.storage.local.get('screenshots');
  const s = r.screenshots || [];
  if (s.length < MAX_SCREENSHOTS) {
    const id = Date.now();
    s.unshift({ id, dataUrl: webpDataUrl, sourceUrl, customName: '' });
    await chrome.storage.local.set({ screenshots: s });
    await chrome.storage.session.set({ newScreenshotId: id });
  }
}

function showFinalNotification(copySuccess) {
  if (copySuccess) {
    chrome.notifications.create({
      type: 'basic', iconUrl: 'icon_128.png',
      title: 'Vibe-shot: Captured & Copied!',
      message: 'Screenshot saved and copied to clipboard.'
    });
  } else {
    chrome.notifications.create({
      type: 'basic', iconUrl: 'icon_128.png',
      title: 'Vibe-shot: Captured!',
      message: 'Screenshot saved, but copy to clipboard failed.'
    });
  }
}

// GESTIONE OFFSCREEN (ora solo per DOM_PARSER)
async function hasOffscreenDocument(path) {
  const offscreenUrl = chrome.runtime.getURL(path);
  const matchedClients = await clients.matchAll();
  return matchedClients.some(client => client.url === offscreenUrl);
}
async function setupOffscreenDocument(path) {
  if (await hasOffscreenDocument(path)) return;
  await chrome.offscreen.createDocument({
    url: path,
    reasons: [chrome.offscreen.Reason.DOM_PARSER],
    justification: 'Required to process images on a canvas for storage'
  });
}
async function closeOffscreenDocument() {
  if (!(await hasOffscreenDocument(OFFSCREEN_DOCUMENT_PATH))) return;
  await chrome.offscreen.closeDocument();
}