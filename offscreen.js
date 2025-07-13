
// offscreen.js (VERSIONE SEMPLIFICATA - SOLO CREAZIONE WebP)

chrome.runtime.onMessage.addListener(handleMessage);

function handleMessage(request) {
  if (request.target !== 'offscreen' || request.type !== 'create-webp') {
    return;
  }
  
  const { dataUrl, coords, sourceUrl } = request.data;
  
  createWebpForStorage(dataUrl, coords)
    .then(webpDataUrl => {
      chrome.runtime.sendMessage({
        type: 'webp-created',
        data: { webpDataUrl, sourceUrl }
      });
    })
    .catch(error => console.error("Vibe-shot: Errore nella creazione del WebP.", error));

  return true;
}

function createWebpForStorage(dataUrl, coords) {
  return new Promise((resolve, reject) => {
    if (!coords) {
        return reject(new Error("Coordinate per il ritaglio non definite."));
    }
    const image = new Image();
    image.onload = () => {
      const dpr = coords.devicePixelRatio || 1;
      
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = coords.width * dpr;
      croppedCanvas.height = coords.height * dpr;
      croppedCanvas.getContext('2d').drawImage(image, coords.x * dpr, coords.y * dpr, croppedCanvas.width, croppedCanvas.height, 0, 0, croppedCanvas.width, croppedCanvas.height);

      const MAX_DIMENSION = 1920;
      let finalCanvas = croppedCanvas;

      if (croppedCanvas.width > MAX_DIMENSION || croppedCanvas.height > MAX_DIMENSION) {
        let newWidth, newHeight;
        if (croppedCanvas.width > croppedCanvas.height) {
          newWidth = MAX_DIMENSION;
          newHeight = (croppedCanvas.height / croppedCanvas.width) * MAX_DIMENSION;
        } else {
          newHeight = MAX_DIMENSION;
          newWidth = (croppedCanvas.width / croppedCanvas.height) * MAX_DIMENSION;
        }
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = newWidth;
        resizedCanvas.height = newHeight;
        resizedCanvas.getContext('2d').drawImage(croppedCanvas, 0, 0, newWidth, newHeight);
        finalCanvas = resizedCanvas;
      }
      
      resolve(finalCanvas.toDataURL('image/webp', 0.9));
    };
    image.onerror = (err) => reject(err);
    image.src = dataUrl;
  });
}
