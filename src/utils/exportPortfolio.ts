import { GeneratedPortfolioData, LayoutMode, ImageAspectRatio, ImageFitMode } from '../types';

export interface ExportPortfolioOptions {
  layoutMode?: LayoutMode;
  aspectMode?: ImageAspectRatio;
  fitMode?: ImageFitMode;
}

/**
 * Exports the A4 Portfolio as a 300 DPI High-Resolution PNG
 * - Landscape: 3508 x 2480 px
 * - Portrait: 2480 x 3508 px
 */
export const downloadPortfolioHighRes = async (
  data: GeneratedPortfolioData,
  options: ExportPortfolioOptions | LayoutMode = 'landscape'
): Promise<void> => {
  const opts: ExportPortfolioOptions =
    typeof options === 'string'
      ? { layoutMode: options, aspectMode: '16:9', fitMode: 'cover' }
      : {
          layoutMode: options.layoutMode || 'landscape',
          aspectMode: options.aspectMode || '16:9',
          fitMode: options.fitMode || 'cover',
        };

  const isPortrait = opts.layoutMode === 'portrait';
  const width = isPortrait ? 2480 : 3508;
  const height = isPortrait ? 3508 : 2480;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Clean White Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2. Load Image
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image for export'));
    img.src = data.imageUrl;
  });

  // Calculate layout dimensions
  const padX = isPortrait ? 160 : 220;
  const padTop = isPortrait ? 180 : 160;
  const padBottom = isPortrait ? 180 : 160;
  const tableGap = 50;

  // Table specs (slim gallery table)
  const tableHeaderHeight = 64;
  const tableDataHeight = 76;
  const totalTableHeight = tableHeaderHeight + tableDataHeight;

  // Available space for image
  const maxImgWidth = width - padX * 2;
  const maxImgHeight = height - padTop - padBottom - tableGap - totalTableHeight;

  const targetAspect =
    opts.aspectMode === '16:9' ? 16 / 9 : img.naturalWidth / img.naturalHeight;
  const availAspect = maxImgWidth / maxImgHeight;

  let screenW: number;
  let screenH: number;

  if (targetAspect > availAspect) {
    // Width constrained
    screenW = maxImgWidth;
    screenH = screenW / targetAspect;
  } else {
    // Height constrained
    screenH = maxImgHeight;
    screenW = screenH * targetAspect;
  }

  // Center horizontally within the canvas
  const imgX = (width - screenW) / 2;
  // Position vertically: vertically balanced
  const totalBlockHeight = screenH + tableGap + totalTableHeight;
  const startY = (height - totalBlockHeight) / 2;
  const imgY = startY;

  // 3. Draw Artwork Image Stage
  if (opts.aspectMode === '16:9') {
    const srcAspect = img.naturalWidth / img.naturalHeight;
    if (opts.fitMode === 'cover') {
      // 16:9 Center Crop Fill
      let sx = 0;
      let sy = 0;
      let sWidth = img.naturalWidth;
      let sHeight = img.naturalHeight;

      if (srcAspect > 16 / 9) {
        sWidth = img.naturalHeight * (16 / 9);
        sx = (img.naturalWidth - sWidth) / 2;
      } else {
        sHeight = img.naturalWidth / (16 / 9);
        sy = (img.naturalHeight - sHeight) / 2;
      }
      ctx.drawImage(img, sx, sy, sWidth, sHeight, imgX, imgY, screenW, screenH);
    } else {
      // 16:9 Screen Fit (Contain with elegant gallery mat)
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(imgX, imgY, screenW, screenH);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e5e7eb';
      ctx.strokeRect(imgX, imgY, screenW, screenH);

      let dw: number;
      let dh: number;
      let dx: number;
      let dy: number;

      if (srcAspect > 16 / 9) {
        dw = screenW;
        dh = dw / srcAspect;
        dx = imgX;
        dy = imgY + (screenH - dh) / 2;
      } else {
        dh = screenH;
        dw = dh * srcAspect;
        dx = imgX + (screenW - dw) / 2;
        dy = imgY;
      }
      ctx.drawImage(img, dx, dy, dw, dh);
    }
  } else {
    ctx.drawImage(img, imgX, imgY, screenW, screenH);
  }

  // 4. Draw Gallery Information Table (exact width of artwork screen: screenW)
  const tableX = imgX;
  const tableY = imgY + screenH + tableGap;
  const tableW = screenW;

  // Table Column Definitions: 작품번호, Title, Canvas Size, Material, 제작년도
  const colFractions = [0.18, 0.34, 0.16, 0.20, 0.12];
  const colWidths = colFractions.map((f) => Math.round(tableW * f));
  // Adjust last column to match exact width
  const sumCols = colWidths.reduce((a, b) => a + b, 0);
  colWidths[colWidths.length - 1] += tableW - sumCols;

  const headers = ['작품번호', 'Title', 'Canvas Size', 'Material', '제작년도'];
  const values = [
    data.artworkNumber,
    data.title,
    data.canvasSize,
    data.materialLabel,
    data.year.toString(),
  ];

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#111827';

  // Table outer border
  ctx.strokeRect(tableX, tableY, tableW, totalTableHeight);

  // Header background: subtle off-white for gallery contrast
  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(tableX, tableY, tableW, tableHeaderHeight);

  // Horizontal divider line
  ctx.beginPath();
  ctx.moveTo(tableX, tableY + tableHeaderHeight);
  ctx.lineTo(tableX + tableW, tableY + tableHeaderHeight);
  ctx.stroke();

  // Vertical column divider lines
  let currentX = tableX;
  for (let i = 0; i < colWidths.length - 1; i++) {
    currentX += colWidths[i];
    ctx.beginPath();
    ctx.moveTo(currentX, tableY);
    ctx.lineTo(currentX, tableY + totalTableHeight);
    ctx.stroke();
  }

  // Draw Header text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif';
  ctx.fillStyle = '#4b5563';

  let textX = tableX;
  for (let i = 0; i < headers.length; i++) {
    const colCenterX = textX + colWidths[i] / 2;
    ctx.fillText(headers[i], colCenterX, tableY + tableHeaderHeight / 2);
    textX += colWidths[i];
  }

  // Draw Value text
  ctx.fillStyle = '#111827';
  textX = tableX;
  for (let i = 0; i < values.length; i++) {
    const colCenterX = textX + colWidths[i] / 2;
    // For Title, if long, fit or truncate
    if (i === 1) {
      ctx.font = '500 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif';
    } else if (i === 0) {
      ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    } else {
      ctx.font = '400 25px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif';
    }

    const val = values[i];
    // Simple fit check for title
    let displayVal = val;
    const maxColTextW = colWidths[i] - 24;
    while (ctx.measureText(displayVal).width > maxColTextW && displayVal.length > 3) {
      displayVal = displayVal.slice(0, -2) + '…';
    }

    ctx.fillText(displayVal, colCenterX, tableY + tableHeaderHeight + tableDataHeight / 2);
    textX += colWidths[i];
  }

  // 5. Trigger download
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const downloadLink = document.createElement('a');
  downloadLink.download = `${data.artworkNumber}_Portfolio_${isPortrait ? 'Portrait' : 'Landscape'}.png`;
  downloadLink.href = dataUrl;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};

