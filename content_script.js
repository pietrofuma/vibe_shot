// content_script.js (VERSIONE FINALE COMPLETA CON CATTURA URL)

function startSelection() {
  if (document.getElementById('vibe-shot-overlay')) return;

  const customCursor = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 0V32M0 16H32" stroke="#00BFFF" stroke-width="2"/></svg>`;
  const cursorUrl = `data:image/svg+xml;base64,${btoa(customCursor)}`;
  
  const overlay = document.createElement('div');
  overlay.id = 'vibe-shot-overlay';
  overlay.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;background-color:rgba(0,0,0,0.5);cursor:url(${cursorUrl}) 16 16, crosshair;z-index:2147483647;`;
  document.body.appendChild(overlay);

  const selectionBox = document.createElement('div');
  selectionBox.id = 'vibe-shot-selection-box';
  selectionBox.style.cssText = `border:2px dashed #00BFFF;position:absolute;background-color:rgba(0,191,255,0.2);`;
  overlay.appendChild(selectionBox);

  let startX, startY, isSelecting = false;
  
  const handleKeyDown = e => { if (e.key === 'Escape') cleanup(); };

  const cleanup = () => {
    overlay.remove();
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('keydown', handleKeyDown);
  };

  const onMouseDown = e => {
    e.preventDefault(); e.stopPropagation(); isSelecting = true;
    startX = e.clientX; startY = e.clientY;
    Object.assign(selectionBox.style, { left: `${startX}px`, top: `${startY}px`, width: '0px', height: '0px' });
  };

  const onMouseMove = e => {
    if (!isSelecting) return;
    e.preventDefault(); e.stopPropagation();
    const width = Math.abs(e.clientX - startX), height = Math.abs(e.clientY - startY);
    const newX = Math.min(e.clientX, startX), newY = Math.min(e.clientY, startY);
    Object.assign(selectionBox.style, { left: `${newX}px`, top: `${newY}px`, width: `${width}px`, height: `${height}px` });
  };

  const onMouseUp = e => {
    if (!isSelecting) { cleanup(); return; }
    e.preventDefault(); e.stopPropagation();
    
    const finalCoords = {
      x: parseInt(selectionBox.style.left, 10), y: parseInt(selectionBox.style.top, 10),
      width: parseInt(selectionBox.style.width, 10), height: parseInt(selectionBox.style.height, 10),
      devicePixelRatio: window.devicePixelRatio
    };
    
    cleanup();
    
    setTimeout(() => {
      if (finalCoords.width > 10 && finalCoords.height > 10) {
        chrome.runtime.sendMessage({
          action: 'captureArea',
          data: {
            coords: finalCoords,
            sourceUrl: document.location.href // Includiamo l'URL corrente
          }
        });
      }
    }, 100);
  };

  window.addEventListener('mousedown', onMouseDown, { once: true });
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mouseup', onMouseUp, { once: true });
  window.addEventListener('keydown', handleKeyDown);
}

startSelection();