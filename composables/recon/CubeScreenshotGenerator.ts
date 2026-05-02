import { PerspectiveCamera, WebGLRenderer, type Mesh, type Scene } from 'three';

export interface CubeScreenshotOptions {
  backgroundColor: string;
  includeFaceLabels: boolean;
  includeSetupMoves: boolean;
  size: number;
}

export interface ScreenshotSetupStatus {
  status: 'loading' | 'available' | 'error';
  message: string;
}

interface CubeScreenshotContext {
  scene: Scene | null;
  camera: PerspectiveCamera | null;
  viewerElement: HTMLDivElement | null;
  renderer: WebGLRenderer | null;
  faceLabelMeshes: Mesh[];
  setupMoves: string;
  setupStatus: ScreenshotSetupStatus;
}

type CubeScreenshotContextProvider = () => CubeScreenshotContext;

interface ParsedBackgroundColor {
  colorValue: number;
  alpha: number;
}

interface ViewerScreenshotDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

interface SetupMovesTextLayout {
  moveFontSize: number;
  moveLineHeight: number;
  moveLines: string[];
}

const SETUP_MOVES_LABEL = 'Setup moves';

const parseBackgroundColor = (value: string): ParsedBackgroundColor => {
  const sixDigitHex = /^#([0-9A-Fa-f]{6})$/;
  const eightDigitHex = /^#([0-9A-Fa-f]{8})$/;

  const sixDigitMatch = value.match(sixDigitHex);
  if (sixDigitMatch) {
    return {
      colorValue: parseInt(sixDigitMatch[1], 16),
      alpha: 1,
    };
  }

  const eightDigitMatch = value.match(eightDigitHex);
  if (eightDigitMatch) {
    const rgbHex = eightDigitMatch[1].slice(0, 6);
    const alphaHex = eightDigitMatch[1].slice(6, 8);

    return {
      colorValue: parseInt(rgbHex, 16),
      alpha: parseInt(alphaHex, 16) / 255,
    };
  }

  throw new Error('Background color must be a 6-digit or 8-digit hex value.');
};

const getViewerAspectRatioFromElement = (viewerElement: HTMLDivElement | null) => {
  const viewerWidth = (viewerElement?.clientWidth ?? 0) - 1;
  const viewerHeight = (viewerElement?.clientHeight ?? 0) - 1;

  if (viewerWidth <= 0 || viewerHeight <= 0) {
    return 1;
  }

  return viewerWidth / viewerHeight;
};

const getViewerScreenshotDimensions = (
  viewerElement: HTMLDivElement | null,
  targetLongEdge: number,
): ViewerScreenshotDimensions => {
  const fallbackSize = Math.max(1, Math.round(targetLongEdge));
  const viewerWidth = (viewerElement?.clientWidth ?? 0) - 1;
  const viewerHeight = (viewerElement?.clientHeight ?? 0) - 1;

  if (viewerWidth <= 0 || viewerHeight <= 0) {
    return {
      width: fallbackSize,
      height: fallbackSize,
      aspectRatio: 1,
    };
  }

  const aspectRatio = viewerWidth / viewerHeight;
  if (aspectRatio >= 1) {
    return {
      width: fallbackSize,
      height: Math.max(1, Math.round(fallbackSize / aspectRatio)),
      aspectRatio,
    };
  }

  return {
    width: Math.max(1, Math.round(fallbackSize * aspectRatio)),
    height: fallbackSize,
    aspectRatio,
  };
};

const wrapSetupMoves = (
  context: CanvasRenderingContext2D,
  movesText: string,
  maxTextWidth: number,
) => {
  const tokens = movesText.split(' ').filter((move) => move !== '');
  const lines: string[] = [];
  let currentLine = '';

  for (const token of tokens) {
    const candidate = currentLine ? `${currentLine} ${token}` : token;
    if (currentLine && context.measureText(candidate).width > maxTextWidth) {
      lines.push(currentLine);
      currentLine = token;
    } else {
      currentLine = candidate;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const fitSetupMovesText = (
  context: CanvasRenderingContext2D,
  setupMoves: string,
  maxTextWidth: number,
  scaleUnit: number,
  maxLines: number,
): SetupMovesTextLayout => {
  let moveFontSize = Math.max(12, Math.round(scaleUnit * 0.052));
  let moveLineHeight = Math.round(moveFontSize * 1.2);
  let moveLines: string[] = [];

  while (moveFontSize >= 12) {
    context.font = `600 ${moveFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace`;
    moveLines = wrapSetupMoves(context, setupMoves, maxTextWidth);
    moveLineHeight = Math.round(moveFontSize * 1.2);

    if (moveLines.length <= maxLines) {
      break;
    }

    moveFontSize -= 1;
  }

  if (moveLines.length > maxLines) {
    moveLines = moveLines.slice(0, maxLines);
    const lastLine = moveLines[maxLines - 1];
    moveLines[maxLines - 1] = lastLine.endsWith('...') ? lastLine : `${lastLine} ...`;
  }

  return {
    moveFontSize,
    moveLineHeight,
    moveLines,
  };
};

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const clampedRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + clampedRadius, y);
  context.lineTo(x + width - clampedRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + clampedRadius);
  context.lineTo(x + width, y + height - clampedRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - clampedRadius, y + height);
  context.lineTo(x + clampedRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - clampedRadius);
  context.lineTo(x, y + clampedRadius);
  context.quadraticCurveTo(x, y, x + clampedRadius, y);
  context.closePath();
};

const strokeAndFillText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  moveFontSize: number,
  fillStyle: string,
) => {
  context.lineJoin = 'round';
  context.miterLimit = 2;
  context.strokeStyle = 'rgba(0, 0, 0, 0.82)';
  context.lineWidth = Math.max(3, Math.round(moveFontSize * 0.18));
  context.strokeText(text, x, y);
  context.fillStyle = fillStyle;
  context.fillText(text, x, y);
};

const drawSetupMovesOverlay = (
  sourceCanvas: HTMLCanvasElement,
  screenshotWidth: number,
  screenshotHeight: number,
  scaleUnit: number,
  setupMoves: string,
) => {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = screenshotWidth;
  exportCanvas.height = screenshotHeight;

  const exportContext = exportCanvas.getContext('2d');
  if (!exportContext) {
    throw new Error('Failed to create cube image canvas.');
  }

  const boxMargin = Math.max(16, Math.round(scaleUnit * 0.025));
  const boxPaddingX = Math.max(18, Math.round(scaleUnit * 0.03));
  const boxPaddingY = Math.max(14, Math.round(scaleUnit * 0.018));
  const maxBoxWidth = screenshotWidth - (boxMargin * 2);
  const maxTextWidth = maxBoxWidth - (boxPaddingX * 2);
  const maxLines = 1;

  exportContext.clearRect(0, 0, screenshotWidth, screenshotHeight);
  exportContext.imageSmoothingEnabled = true;
  exportContext.imageSmoothingQuality = 'high';
  exportContext.drawImage(sourceCanvas, 0, 0, screenshotWidth, screenshotHeight);

  const { moveFontSize, moveLineHeight, moveLines } = fitSetupMovesText(
    exportContext,
    setupMoves,
    maxTextWidth,
    scaleUnit,
    maxLines,
  );
  const labelFontSize = Math.max(16, Math.round(moveFontSize * 0.62));
  const labelToMovesGap = Math.max(8, Math.round(labelFontSize * 0.7));

  exportContext.font = `700 ${labelFontSize}px ui-sans-serif, system-ui, sans-serif`;
  const labelWidth = exportContext.measureText(SETUP_MOVES_LABEL).width;
  exportContext.font = `600 ${moveFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace`;
  const widestMoveLineWidth = moveLines.reduce((maxWidth, line) => {
    return Math.max(maxWidth, exportContext.measureText(line).width);
  }, 0);

  const textContentWidth = Math.max(labelWidth, widestMoveLineWidth);
  const boxX = boxMargin;
  const boxWidth = Math.min(maxBoxWidth, Math.ceil(textContentWidth + (boxPaddingX * 2)));
  const boxContentHeight = labelFontSize + labelToMovesGap + (moveLines.length * moveLineHeight);
  const boxHeight = boxContentHeight + (boxPaddingY * 2);
  const boxY = screenshotHeight - boxMargin - boxHeight;
  const textX = boxX + boxPaddingX;
  const labelY = boxY + boxPaddingY;

  drawRoundedRect(
    exportContext,
    boxX,
    boxY,
    boxWidth,
    boxHeight,
    Math.max(8, Math.round(scaleUnit * 0.012)),
  );
  exportContext.fillStyle = 'rgba(10, 12, 20, 0.72)';
  exportContext.fill();
  exportContext.strokeStyle = 'rgba(172, 200, 215, 0.55)';
  exportContext.lineWidth = Math.max(1, Math.round(scaleUnit * 0.0016));
  exportContext.stroke();

  exportContext.textAlign = 'left';
  exportContext.textBaseline = 'top';
  exportContext.font = `700 ${labelFontSize}px ui-sans-serif, system-ui, sans-serif`;
  exportContext.lineWidth = Math.max(2, Math.round(labelFontSize * 0.2));
  exportContext.strokeStyle = 'rgba(0, 0, 0, 0.82)';
  exportContext.strokeText(SETUP_MOVES_LABEL, textX, labelY);
  exportContext.fillStyle = '#ACC8D7';
  exportContext.fillText(SETUP_MOVES_LABEL, textX, labelY);

  exportContext.font = `600 ${moveFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace`;

  moveLines.forEach((line, index) => {
    const y = labelY + labelFontSize + labelToMovesGap + (index * moveLineHeight);
    strokeAndFillText(exportContext, line, textX, y, moveFontSize, '#ECE6EF');
  });

  return exportCanvas;
};

export const createCubeScreenshotGenerator = (
  getContext: CubeScreenshotContextProvider,
) => {
  let screenshotRenderer: WebGLRenderer | null = null;

  const getOrCreateRenderer = () => {
    if (!screenshotRenderer) {
      screenshotRenderer = new WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
    }

    return screenshotRenderer;
  };

  const dispose = () => {
    screenshotRenderer?.dispose();
    screenshotRenderer = null;
  };

  const getViewerAspectRatio = () => {
    return getViewerAspectRatioFromElement(getContext().viewerElement);
  };

  const capture = (options: CubeScreenshotOptions) => {
    const { scene, camera, viewerElement, renderer, faceLabelMeshes, setupMoves, setupStatus } = getContext();
    const isSetupMovesUnavailable = setupStatus.status !== 'available';

    if (!scene || !camera) {
      throw new Error('Cube scene is not ready yet.');
    }

    const parsedBackground = parseBackgroundColor(options.backgroundColor);
    const {
      width: screenshotWidth,
      height: screenshotHeight,
      aspectRatio,
    } = getViewerScreenshotDimensions(viewerElement, options.size);
    const scaleUnit = Math.min(screenshotWidth, screenshotHeight);

    camera.updateMatrixWorld(true);
    scene.updateMatrixWorld(true);

    const screenshotCamera = camera.clone();
    screenshotCamera.aspect = aspectRatio;
    screenshotCamera.updateProjectionMatrix();
    screenshotCamera.updateMatrixWorld(true);

    const nextRenderer = getOrCreateRenderer();
    nextRenderer.setPixelRatio(1);
    nextRenderer.setSize(screenshotWidth, screenshotHeight, false);
    nextRenderer.outputColorSpace = renderer?.outputColorSpace ?? nextRenderer.outputColorSpace;
    nextRenderer.toneMapping = renderer?.toneMapping ?? nextRenderer.toneMapping;
    nextRenderer.toneMappingExposure = renderer?.toneMappingExposure ?? nextRenderer.toneMappingExposure;
    nextRenderer.setClearColor(parsedBackground.colorValue, parsedBackground.alpha);

    const previousFaceLabelVisibility = faceLabelMeshes.map((mesh) => mesh.visible);

    try {
      faceLabelMeshes.forEach((mesh) => {
        mesh.visible = options.includeFaceLabels;
      });

      nextRenderer.render(scene, screenshotCamera);

      if (!options.includeSetupMoves || !setupMoves || isSetupMovesUnavailable) {
        return nextRenderer.domElement.toDataURL('image/png');
      }

      return drawSetupMovesOverlay(
        nextRenderer.domElement,
        screenshotWidth,
        screenshotHeight,
        scaleUnit,
        setupMoves,
      ).toDataURL('image/png');
    } finally {
      faceLabelMeshes.forEach((mesh, index) => {
        mesh.visible = previousFaceLabelVisibility[index] ?? true;
      });
    }
  };

  return {
    getViewerAspectRatio,
    capture,
    dispose,
  };
};