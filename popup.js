// popup.js (FINALE - RISOLUZIONE CLIPBOARD A 1024px)

document.addEventListener('DOMContentLoaded', () => {
  // Riferimenti agli elementi (invariati)
  const captureBtn = document.getElementById('capture-btn');
  const clearAllBtn = document.getElementById('clear-all-btn');
  const screenshotsContainer = document.getElementById('screenshots-container');
  const limitMessage = document.getElementById('limit-message');
  const copyRemoveToggle = document.getElementById('copy-remove-toggle');
  const undockBtn = document.getElementById('undock-btn');
  const helpBtn = document.getElementById('help-btn');
  const helpModal = document.getElementById('help-modal');
  const closeHelpBtn = document.getElementById('close-help-btn');

  const MAX_SCREENSHOTS = 10;
  let allScreenshots = [];
  let idsBeingDragged = [];
  let isConfirmingClear = false;
  let confirmClearTimeout;

  // Logica della guida e dei pulsanti principali (invariata)
  helpBtn.addEventListener('click', (e) => { e.preventDefault(); helpModal.classList.remove('hidden'); });
  closeHelpBtn.addEventListener('click', () => { helpModal.classList.add('hidden'); });
  helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.classList.add('hidden'); });
  
  const resetClearButton = () => {
    isConfirmingClear = false;
    clearAllBtn.textContent = 'Clear All';
    clearAllBtn.classList.remove('confirming');
    clearTimeout(confirmClearTimeout);
  };
  clearAllBtn.addEventListener('click', () => {
    if (allScreenshots.length === 0) return;
    if (!isConfirmingClear) {
      isConfirmingClear = true;
      clearAllBtn.textContent = 'Confirm?';
      clearAllBtn.classList.add('confirming');
      confirmClearTimeout = setTimeout(resetClearButton, 3000);
    } else {
      chrome.storage.local.set({ screenshots: [] });
    }
  });
  clearAllBtn.addEventListener('mouseleave', () => { if (isConfirmingClear) resetClearButton(); });
  undockBtn.addEventListener('click', () => {
    chrome.windows.create({ url: 'popup.html', type: 'popup', width: 400, height: 600 });
    window.close();
  });
  
  // --- FUNZIONE DI CONVERSIONE FINALE ---
  function convertWebpToSmallPngBlob(webpDataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        let canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        let ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);

        // --- RIDIMENSIONAMENTO AGGIUNTIVO SOLO PER LA CLIPBOARD ---
        const MAX_CLIPBOARD_DIMENSION = 1024; // Valore abbassato per massima velocità
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
          const resizedCtx = resizedCanvas.getContext('2d');
          resizedCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
          canvas = resizedCanvas; // Sostituiamo il canvas grande con quello piccolo
        }
        // --- FINE RIDIMENSIONAMENTO AGGIUNTIVO ---

        // Esportiamo il canvas (originale o ridimensionato) in formato PNG, l'unico supportato
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Conversione in PNG fallita.'));
          }
        }, 'image/png');
      };
      image.onerror = (err) => reject(err);
      image.src = webpDataUrl;
    });
  }

  const sanitizeFilename = (name) => name.replace(/[\\/:*?"<>|]/g, '_').trim();
  const createScreenshotItem = (screenshot, newScreenshotId) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'screenshot-item';
    itemDiv.draggable = true;
    if (screenshot.sourceUrl) itemDiv.title = `Captured from: ${screenshot.sourceUrl}`;
    if (screenshot.id === newScreenshotId) {
      itemDiv.classList.add('new-item-glow');
      setTimeout(() => itemDiv.classList.remove('new-item-glow'), 6000);
    }
    itemDiv.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      idsBeingDragged = [screenshot.id];
      const name = screenshot.customName ? sanitizeFilename(screenshot.customName) : `vibe-shot-${screenshot.id}`;
      const downloadUrl = `image/webp:${name}.webp:${screenshot.dataUrl}`;
      e.dataTransfer.setData('DownloadURL', downloadUrl);
    });
    itemDiv.addEventListener('dragend', async () => {
      const { copyAndRemoveEnabled } = await chrome.storage.local.get({ copyAndRemoveEnabled: false });
      if (copyAndRemoveEnabled && idsBeingDragged.length > 0) removeScreenshots(idsBeingDragged);
      idsBeingDragged = [];
    });
    const img = document.createElement('img');
    img.src = screenshot.dataUrl;
    const nameDisplay = document.createElement('div');
    nameDisplay.className = 'screenshot-name';
    nameDisplay.textContent = screenshot.customName || 'Untitled';
    if (!screenshot.customName) nameDisplay.style.opacity = "0.5";
    const renameContainer = document.createElement('div');
    renameContainer.className = 'rename-container';
    const renameInput = document.createElement('input');
    renameInput.type = 'text';
    renameInput.placeholder = 'New name...';
    renameInput.value = screenshot.customName || '';
    renameContainer.appendChild(renameInput);
    const saveName = () => {
      const newName = renameInput.value.trim();
      if (newName === (screenshot.customName || '')) {
        renameContainer.style.display = 'none';
        actionsDiv.style.display = 'flex';
        return;
      }
      const ssIndex = allScreenshots.findIndex(ss => ss.id === screenshot.id);
      if (ssIndex > -1) {
        allScreenshots[ssIndex].customName = newName;
        chrome.storage.local.set({ screenshots: allScreenshots }).then(() => {
          nameDisplay.textContent = newName || 'Untitled';
          nameDisplay.style.opacity = newName ? "1" : "0.5";
          renameContainer.style.display = 'none';
          actionsDiv.style.display = 'flex';
        });
      }
    };
    renameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveName();
      if (e.key === 'Escape') {
        renameInput.value = screenshot.customName || '';
        renameInput.blur();
      }
    });
    renameInput.addEventListener('blur', saveName);
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions';
    const renameBtn = document.createElement('button');
    renameBtn.className = 'rename-btn';
    renameBtn.innerHTML = '✏️';
    renameBtn.title = 'Rename';
    renameBtn.addEventListener('click', () => {
      actionsDiv.style.display = 'none';
      renameContainer.style.display = 'block';
      renameInput.focus();
      renameInput.select();
    });
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', async () => {
      try {
        const pngBlob = await convertWebpToSmallPngBlob(screenshot.dataUrl);
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);

        const { copyAndRemoveEnabled } = await chrome.storage.local.get({ copyAndRemoveEnabled: false });
        if (copyAndRemoveEnabled) {
          copyBtn.textContent = 'Copied!';
          copyBtn.disabled = true;
          setTimeout(() => { removeScreenshots([screenshot.id]); }, 1000); 
        } else {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        }
      } catch (err) { 
        console.error("Failed to copy image:", err);
        copyBtn.textContent = 'Error'; 
      }
    });
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => removeScreenshots([screenshot.id]));
    actionsDiv.appendChild(copyBtn);
    actionsDiv.appendChild(removeBtn);
    actionsDiv.appendChild(renameBtn);
    itemDiv.appendChild(img);
    itemDiv.appendChild(nameDisplay);
    itemDiv.appendChild(renameContainer);
    itemDiv.appendChild(actionsDiv);
    return itemDiv;
  };
  const removeScreenshots = (idsToRemove) => {
    const remaining = allScreenshots.filter(ss => !idsToRemove.includes(ss.id));
    chrome.storage.local.set({ screenshots: remaining });
  };
  const renderScreenshots = () => {
    chrome.storage.session.get(['newScreenshotId'], (sessionResult) => {
      const newScreenshotId = sessionResult.newScreenshotId;
      chrome.storage.local.get(['screenshots'], (result) => {
        allScreenshots = result.screenshots || [];
        screenshotsContainer.innerHTML = '';
        if (allScreenshots.length === 0) {
          screenshotsContainer.innerHTML = '<p class="empty-state">No screenshots captured yet.</p>';
        } else {
          allScreenshots.forEach(ss => screenshotsContainer.appendChild(createScreenshotItem(ss, newScreenshotId)));
        }
        captureBtn.disabled = allScreenshots.length >= MAX_SCREENSHOTS;
        limitMessage.classList.toggle('hidden', allScreenshots.length < MAX_SCREENSHOTS);
      });
      if (newScreenshotId) chrome.storage.session.remove('newScreenshotId');
    });
  };
  chrome.storage.local.get({ copyAndRemoveEnabled: false }, (result) => { copyRemoveToggle.checked = result.copyAndRemoveEnabled; });
  copyRemoveToggle.addEventListener('change', () => { chrome.storage.local.set({ copyAndRemoveEnabled: copyRemoveToggle.checked }); });
  captureBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startCapture' });
    window.close();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.screenshots) {
      if (isConfirmingClear) { resetClearButton(); }
      renderScreenshots();
    }
  });
  renderScreenshots();
});