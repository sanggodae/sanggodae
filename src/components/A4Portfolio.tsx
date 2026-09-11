import React, { useState, useRef, useEffect } from 'react';
import {
  MaterialCode,
  LayoutMode,
  ImageAspectRatio,
  ImageFitMode,
  GeneratedPortfolioData,
} from '../types';
import { CANVAS_SIZE_LIST, POPULAR_CANVAS_CODES } from '../data/canvasSizes';
import { MATERIALS, getMaterialByCode } from '../data/materials';
import {
  peekNextArtworkNumber,
  generateAndCommitArtworkNumber,
} from '../utils/artworkNumber';
import { downloadPortfolioHighRes } from '../utils/exportPortfolio';
import { GoogleSheetsSyncManager } from './GoogleSheetsSyncManager';
import {
  UploadCloud,
  Printer,
  Download,
  Edit3,
  RotateCcw,
  Search,
  ChevronDown,
  Sparkles,
  AlertCircle,
  X,
  RectangleHorizontal,
  RectangleVertical,
  Monitor,
  Sliders,
  Maximize2,
  ZoomIn,
} from 'lucide-react';

interface A4PortfolioProps {
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
}

export const A4Portfolio: React.FC<A4PortfolioProps> = ({
  layoutMode: initialLayoutMode = 'landscape',
  onLayoutModeChange,
}) => {
  // Layout mode state: 'landscape' (가로형) | 'portrait' (세로형)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(initialLayoutMode);

  // Sync with parent prop if provided
  useEffect(() => {
    if (initialLayoutMode) {
      setLayoutMode(initialLayoutMode);
    }
  }, [initialLayoutMode]);

  const handleLayoutModeSwitch = (mode: LayoutMode) => {
    setLayoutMode(mode);
    onLayoutModeChange?.(mode);
    setTimeout(updateArtworkWidth, 60);
  };

  // Input State
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageName, setImageName] = useState<string>('');
  const [imageNaturalWidth, setImageNaturalWidth] = useState<number>(0);
  const [imageNaturalHeight, setImageNaturalHeight] = useState<number>(0);

  const [title, setTitle] = useState<string>('');
  const [canvasSize, setCanvasSize] = useState<string>('');
  const [materialCode, setMaterialCode] = useState<MaterialCode | ''>('');
  const [year, setYear] = useState<number | ''>(new Date().getFullYear());

  // Image display ratio & fit: '16:9' (default horizontal 16:9 widescreen) | 'original'
  const [imageAspectMode, setImageAspectMode] = useState<ImageAspectRatio>('16:9');
  const [imageFitMode, setImageFitMode] = useState<ImageFitMode>('cover');
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  // App mode: 'editing' | 'generated'
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [generatedArtworkNumber, setGeneratedArtworkNumber] = useState<string>('');

  // Dropdown states
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const [sizeSearchQuery, setSizeSearchQuery] = useState('');
  const sizeDropdownRef = useRef<HTMLDivElement>(null);

  // Validation errors & loading states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Element refs for exact width synchronization
  const a4PageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [renderedArtworkWidth, setRenderedArtworkWidth] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update width of artwork image to strictly synchronize table width & responsive bounds
  const updateArtworkWidth = () => {
    if (!a4PageRef.current) return;
    const a4Rect = a4PageRef.current.getBoundingClientRect();
    const a4Width = a4Rect.width;
    const a4Height = a4Rect.height;
    if (a4Width <= 0 || a4Height <= 0) return;

    if (imageAspectMode === '16:9') {
      // Responsive vertical budget: calculate available height inside A4 sheet
      const isMobile = a4Width < 640;
      const verticalPadding = isMobile ? 32 : (layoutMode === 'landscape' ? 84 : 76);
      const expectedTableHeight = isMobile ? 40 : 54;
      const contentGap = isMobile ? 10 : 16;
      const availableHeightForImage = Math.max(
        100,
        a4Height - verticalPadding - expectedTableHeight - contentGap
      );

      // Max width constrained by available height in 16:9 aspect (width = height * 16/9)
      const widthFromHeight = availableHeightForImage * (16 / 9);

      // Width constrained by available page width
      const widthFactor =
        layoutMode === 'landscape' ? (isMobile ? 0.90 : 0.76) : (isMobile ? 0.94 : 0.88);
      const widthFromPage = a4Width * widthFactor;

      const maxCap = layoutMode === 'landscape' ? 820 : 700;
      const targetWidth = Math.round(Math.min(widthFromPage, widthFromHeight, maxCap));
      setRenderedArtworkWidth(targetWidth);
      return;
    }

    // Original ratio mode: measure rendered image
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        setRenderedArtworkWidth(Math.round(rect.width));
        return;
      }
    }
    const factor = layoutMode === 'landscape' ? 0.65 : 0.82;
    setRenderedArtworkWidth(Math.round(a4Width * factor));
  };

  useEffect(() => {
    updateArtworkWidth();
    const handleResize = () => updateArtworkWidth();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => {
      updateArtworkWidth();
    });

    if (imgRef.current) observer.observe(imgRef.current);
    if (a4PageRef.current) observer.observe(a4PageRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [imageUrl, isGenerated, layoutMode, imageAspectMode, imageFitMode]);

  // Close size dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(e.target as Node)) {
        setIsSizeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close responsive lightbox on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      }
    };
    if (isLightboxOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  // Handle image upload
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('이미지 파일(JPG, PNG, WEBP 등)만 업로드할 수 있습니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setImageUrl(result);
        setImageName(file.name);
        setImageNaturalWidth(img.naturalWidth);
        setImageNaturalHeight(img.naturalHeight);
        setErrorMessage(null);
        setTimeout(updateArtworkWidth, 50);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Preview generated number while in editing mode
  const previewArtworkNumber =
    year && canvasSize && materialCode
      ? peekNextArtworkNumber(Number(year), canvasSize, materialCode as MaterialCode).fullCode
      : null;

  // Validation and portfolio generation
  const handleGeneratePortfolio = () => {
    if (!imageUrl) {
      setErrorMessage('작품 이미지를 업로드해 주세요.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Title을 입력해 주세요.');
      return;
    }
    if (!canvasSize.trim()) {
      setErrorMessage('Canvas Size를 선택해 주세요.');
      return;
    }
    if (!materialCode) {
      setErrorMessage('Material을 선택해 주세요.');
      return;
    }
    if (!year) {
      setErrorMessage('제작년도를 선택해 주세요.');
      return;
    }

    setErrorMessage(null);

    // Commit sequential artwork number
    const finalNumber = generateAndCommitArtworkNumber(
      Number(year),
      canvasSize,
      materialCode as MaterialCode
    );

    setGeneratedArtworkNumber(finalNumber);
    setIsGenerated(true);
    setTimeout(updateArtworkWidth, 80);
  };

  // Quick Demo Artwork Loader (Exact 16:9 Widescreen)
  const loadDemoArtwork = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 900; // Perfect 16:9 Aspect Ratio
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#faf8f5';
      ctx.fillRect(0, 0, 1600, 900);

      // Prussian navy circle
      ctx.fillStyle = '#1c2833';
      ctx.beginPath();
      ctx.arc(800, 420, 310, 0, Math.PI * 2);
      ctx.fill();

      // Ochre crescent
      ctx.fillStyle = '#d4ac0d';
      ctx.beginPath();
      ctx.arc(930, 470, 210, 0, Math.PI * 2);
      ctx.fill();

      // Minimalist earthy line
      ctx.strokeStyle = '#935116';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(250, 750);
      ctx.lineTo(1350, 750);
      ctx.stroke();
    }

    const sampleUrl = canvas.toDataURL('image/png');
    setImageUrl(sampleUrl);
    setImageName('sample_artwork_16x9.png');
    setImageNaturalWidth(1600);
    setImageNaturalHeight(900);
    setImageAspectMode('16:9');
    setImageFitMode('cover');
    setTitle('Untitled (Eclipse #07)');
    setCanvasSize('030P');
    setMaterialCode('A');
    setYear(2026);
    setErrorMessage(null);
    setTimeout(updateArtworkWidth, 50);
  };

  // High-Res 300 DPI Export
  const handleExportPNG = async () => {
    if (!isGenerated) return;
    const matItem = getMaterialByCode(materialCode as MaterialCode);
    const materialLabel = matItem ? matItem.label : 'Acrylic on Canvas';

    try {
      setIsExporting(true);
      await downloadPortfolioHighRes(
        {
          artworkNumber: generatedArtworkNumber,
          title: title.trim(),
          canvasSize,
          materialCode: materialCode as MaterialCode,
          materialLabel,
          year: Number(year),
          imageUrl,
          imageNaturalWidth,
          imageNaturalHeight,
          createdAt: Date.now(),
        },
        {
          layoutMode,
          aspectMode: imageAspectMode,
          fitMode: imageFitMode,
        }
      );
    } catch (e) {
      console.error(e);
      alert('이미지 내보내기 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  // Year options: 2000 to current year
  const currentYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  for (let y = currentYear; y >= 2000; y--) {
    yearOptions.push(y);
  }

  // Filtered canvas sizes
  const filteredCanvasSizes = CANVAS_SIZE_LIST.filter((item) => {
    if (!sizeSearchQuery.trim()) return true;
    const q = sizeSearchQuery.toLowerCase().trim();
    return (
      item.code.toLowerCase().includes(q) ||
      item.dimensionText.toLowerCase().includes(q) ||
      item.categoryLabel.toLowerCase().includes(q)
    );
  });

  const selectedMaterialItem = materialCode ? getMaterialByCode(materialCode as MaterialCode) : null;
  const isLandscape = layoutMode === 'landscape';

  const currentPortfolioData: GeneratedPortfolioData | null =
    isGenerated && generatedArtworkNumber
      ? {
          artworkNumber: generatedArtworkNumber,
          title: title.trim(),
          canvasSize,
          materialCode: materialCode as MaterialCode,
          materialLabel: selectedMaterialItem ? selectedMaterialItem.label : 'Acrylic on Canvas',
          year: Number(year),
          imageUrl,
          imageNaturalWidth,
          imageNaturalHeight,
          createdAt: Date.now(),
        }
      : null;

  return (
    <div className="w-full flex flex-col items-center py-3 sm:py-6 px-2 sm:px-4">
      {/* Dynamic Print Size Style Tag */}
      <style>{`
        @page {
          size: A4 ${layoutMode};
          margin: 0;
        }
      `}</style>

      {/* Top Controls & Layout Mode Bar (Hidden when printing) */}
      <div className="no-print w-full max-w-[1040px] mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 sm:px-5 py-3 rounded-lg border border-neutral-200 shadow-xs">
        {/* Left: App Status & Mode Info */}
        <div className="flex items-center space-x-3">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-400 font-mono">
              {isLandscape ? 'A4 Landscape (297 × 210 mm)' : 'A4 Portrait (210 × 297 mm)'}
            </span>
            <span className="text-sm font-bold text-neutral-900">
              {isGenerated
                ? `포트폴리오 완성 · ${generatedArtworkNumber}`
                : 'A4 포트폴리오 작업 화면'}
            </span>
          </div>
        </div>

        {/* Center/Right: Layout View Mode Toggle & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Layout View Mode Toggle Button */}
          <div
            id="layout-view-mode-toggle"
            className="flex items-center bg-neutral-100 p-1 rounded-md border border-neutral-200 text-xs"
          >
            <span className="text-[11px] font-medium text-neutral-500 px-1.5 hidden md:inline">
              보기 모드:
            </span>
            <button
              type="button"
              id="toggle-layout-landscape"
              onClick={() => handleLayoutModeSwitch('landscape')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-all font-medium cursor-pointer ${
                isLandscape
                  ? 'bg-white text-neutral-950 font-bold shadow-2xs border border-neutral-200/80'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              title="가로형 A4 (297 × 210mm)"
            >
              <RectangleHorizontal className="w-3.5 h-3.5" />
              <span>가로형 A4</span>
            </button>

            <button
              type="button"
              id="toggle-layout-portrait"
              onClick={() => handleLayoutModeSwitch('portrait')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-all font-medium cursor-pointer ${
                !isLandscape
                  ? 'bg-white text-neutral-950 font-bold shadow-2xs border border-neutral-200/80'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              title="세로형 A4 (210 × 297mm)"
            >
              <RectangleVertical className="w-3.5 h-3.5" />
              <span>세로형 A4</span>
            </button>
          </div>

          {/* Image Screen Ratio Toggle (16:9 vs Original) */}
          <div
            id="image-aspect-mode-toggle"
            className="flex items-center bg-neutral-100 p-1 rounded-md border border-neutral-200 text-xs"
          >
            <span className="text-[11px] font-medium text-neutral-500 px-1.5 hidden lg:inline">
              화면 비율:
            </span>
            <button
              type="button"
              id="toggle-aspect-16-9"
              onClick={() => {
                setImageAspectMode('16:9');
                setTimeout(updateArtworkWidth, 50);
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-all font-medium cursor-pointer ${
                imageAspectMode === '16:9'
                  ? 'bg-white text-neutral-950 font-bold shadow-2xs border border-neutral-200/80'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              title="가로 16:9 화면 (Widescreen)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>가로 16:9</span>
            </button>

            <button
              type="button"
              id="toggle-aspect-original"
              onClick={() => {
                setImageAspectMode('original');
                setTimeout(updateArtworkWidth, 50);
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-all font-medium cursor-pointer ${
                imageAspectMode === 'original'
                  ? 'bg-white text-neutral-950 font-bold shadow-2xs border border-neutral-200/80'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              title="원본 비율 유지"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>원본 비율</span>
            </button>

            {imageAspectMode === '16:9' && (
              <div className="flex items-center border-l border-neutral-300 ml-1 pl-1 space-x-0.5">
                <button
                  type="button"
                  onClick={() => setImageFitMode('cover')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                    imageFitMode === 'cover'
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                  title="16:9 화면 꽉 채우기 (크롭)"
                >
                  채우기
                </button>
                <button
                  type="button"
                  onClick={() => setImageFitMode('contain')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                    imageFitMode === 'contain'
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                  title="16:9 화면 내 비율 맞춤"
                >
                  맞춤
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {!isGenerated ? (
              <button
                type="button"
                id="btn-sample-fill"
                onClick={loadDemoArtwork}
                className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-200 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
                <span>샘플 불러오기</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  id="btn-edit-mode"
                  onClick={() => setIsGenerated(false)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>정보 수정</span>
                </button>

                <button
                  type="button"
                  id="btn-new-artwork"
                  onClick={() => {
                    setImageUrl('');
                    setImageName('');
                    setTitle('');
                    setIsGenerated(false);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>새 작품</span>
                </button>

                <button
                  type="button"
                  id="btn-download-png"
                  onClick={handleExportPNG}
                  disabled={isExporting}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-900 border border-neutral-300 hover:bg-neutral-50 rounded transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExporting ? '저장 중...' : '300 DPI 저장'}</span>
                </button>

                <button
                  type="button"
                  id="btn-print-a4"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>인쇄 / PDF</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Validation Error Alert */}
      {errorMessage && (
        <div className="no-print w-full max-w-[1040px] mb-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-center justify-between text-xs text-red-700 font-medium">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        id="a4-image-upload-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleImageFile(e.target.files[0]);
          }
        }}
      />

      {/* ============================================================ */}
      {/* THE A4 SHEET (Adaptive Landscape 297×210 or Portrait 210×297) */}
      {/* ============================================================ */}
      <div className="w-full flex justify-center py-2 transition-all duration-300">
        <div
          id="portfolio-a4-sheet"
          ref={a4PageRef}
          className={`w-full bg-white text-neutral-900 shadow-2xl border border-neutral-200 overflow-hidden relative print:shadow-none print:border-0 print:m-0 print:p-0 transition-all duration-300 ${
            isLandscape
              ? 'max-w-[1020px] layout-landscape'
              : 'max-w-[760px] layout-portrait'
          }`}
          style={{
            // Exact A4 aspect ratio:
            // Landscape: 297mm / 210mm ≈ 1.414
            // Portrait: 210mm / 297mm ≈ 0.707
            aspectRatio: isLandscape ? '297 / 210' : '210 / 297',
          }}
        >
          {/* A4 Inner Gallery Margins */}
          <div
            className={`w-full h-full flex flex-col items-center justify-between box-border ${
              isLandscape
                ? 'p-3.5 sm:p-6 md:p-10 lg:p-12 print:p-8'
                : 'p-3.5 sm:p-6 md:p-8 lg:p-10 print:p-8'
            }`}
          >
            {/* Main Visual Center: Artwork + Information Table */}
            <div className="w-full flex-1 flex flex-col items-center justify-center">
              {/* Unified Wrapper: strictly locks Artwork and Table to identical horizontal width */}
              <div
                className="flex flex-col items-center justify-center max-w-full transition-all duration-200"
                style={{
                  width: renderedArtworkWidth
                    ? `${renderedArtworkWidth}px`
                    : isLandscape
                    ? '76%'
                    : '88%',
                  maxWidth: '100%',
                }}
              >
                {/* 1. Artwork Image Stage (16:9 Landscape Screen) */}
                <div className="w-full flex items-center justify-center">
                  {imageUrl ? (
                    imageAspectMode === '16:9' ? (
                      /* 16:9 Widescreen Frame (Fully Responsive) */
                      <div className="w-full aspect-[16/9] relative group rounded-xs overflow-hidden border border-neutral-300/80 bg-neutral-900/5 flex items-center justify-center shadow-2xs">
                        {imageFitMode === 'cover' ? (
                          <img
                            ref={imgRef}
                            src={imageUrl}
                            alt={title || '작품 이미지'}
                            onLoad={updateArtworkWidth}
                            className="w-full h-full object-cover select-none block transition-all duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-neutral-50/80 flex items-center justify-center p-1 sm:p-1.5">
                            <img
                              ref={imgRef}
                              src={imageUrl}
                              alt={title || '작품 이미지'}
                              onLoad={updateArtworkWidth}
                              className="max-w-full max-h-full object-contain select-none block transition-all duration-300"
                            />
                          </div>
                        )}

                        {/* Top Badges & Zoom Button */}
                        <div className="no-print absolute top-1.5 sm:top-2 right-1.5 sm:right-2 flex items-center space-x-1 z-10">
                          <span className="px-1.5 sm:px-2 py-0.5 bg-neutral-900/80 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-mono rounded tracking-wider uppercase pointer-events-none">
                            16:9 · {imageFitMode === 'cover' ? 'Fill' : 'Fit'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsLightboxOpen(true)}
                            className="p-1 sm:p-1.5 bg-neutral-900/80 hover:bg-neutral-900 text-white rounded cursor-pointer backdrop-blur-xs transition-colors"
                            title="16:9 화면 확대/전체화면 보기"
                          >
                            <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>

                        {/* Responsive Hover / Touch Quick Control Bar */}
                        {!isGenerated && (
                          <div className="no-print absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/45 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 sm:space-x-2">
                            <button
                              type="button"
                              onClick={() =>
                                setImageFitMode((prev) =>
                                  prev === 'cover' ? 'contain' : 'cover'
                                )
                              }
                              className="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-medium bg-white/95 hover:bg-white text-neutral-900 rounded shadow-xs cursor-pointer transition-colors"
                            >
                              {imageFitMode === 'cover'
                                ? '16:9 맞춤(Fit)'
                                : '16:9 채우기(Fill)'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsLightboxOpen(true)}
                              className="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-medium bg-white/95 hover:bg-white text-neutral-900 rounded shadow-xs cursor-pointer transition-colors flex items-center space-x-1"
                            >
                              <ZoomIn className="w-3 h-3" />
                              <span>확대</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-medium bg-white/95 hover:bg-white text-neutral-900 rounded shadow-xs cursor-pointer transition-colors"
                            >
                              변경
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setImageUrl('');
                                setImageName('');
                              }}
                              className="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-medium bg-red-600/90 hover:bg-red-600 text-white rounded shadow-xs cursor-pointer transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Original Ratio Frame (Responsive) */
                      <div className="relative group flex items-center justify-center max-w-full">
                        <img
                          ref={imgRef}
                          src={imageUrl}
                          alt={title || '작품 이미지'}
                          onLoad={updateArtworkWidth}
                          className={`block object-contain max-w-full w-auto select-none transition-all duration-300 ${
                            isLandscape
                              ? 'max-h-[44vh] sm:max-h-[50vh] md:max-h-[56vh] print:max-h-[150mm]'
                              : 'max-h-[48vh] sm:max-h-[54vh] md:max-h-[60vh] print:max-h-[210mm]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setIsLightboxOpen(true)}
                          className="no-print absolute top-1.5 right-1.5 p-1 bg-neutral-900/75 hover:bg-neutral-900 text-white rounded cursor-pointer backdrop-blur-xs transition-colors opacity-0 group-hover:opacity-100"
                          title="확대 보기"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                        {!isGenerated && (
                          <div className="no-print absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                            <button
                              type="button"
                              onClick={() => setIsLightboxOpen(true)}
                              className="px-2.5 py-1.5 text-xs font-medium bg-white text-neutral-900 rounded shadow hover:bg-neutral-100 cursor-pointer flex items-center space-x-1"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                              <span>확대</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 text-xs font-medium bg-white text-neutral-900 rounded shadow hover:bg-neutral-100 cursor-pointer"
                            >
                              이미지 변경
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setImageUrl('');
                                setImageName('');
                              }}
                              className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded shadow hover:bg-red-700 cursor-pointer"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  ) : imageAspectMode === '16:9' ? (
                    /* Image Dropzone in 16:9 Widescreen Aspect (Responsive) */
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleImageFile(e.dataTransfer.files[0]);
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      className="w-full aspect-[16/9] border-2 border-dashed border-neutral-300 hover:border-neutral-900 rounded-md bg-neutral-50/50 hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center cursor-pointer p-3 sm:p-6 text-center group"
                    >
                      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-neutral-100 group-hover:bg-neutral-200 flex items-center justify-center text-neutral-700 mb-1.5 sm:mb-2 transition-colors">
                        <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" />
                      </div>
                      <span className="px-1.5 sm:px-2 py-0.5 bg-neutral-200/80 text-neutral-700 text-[9px] sm:text-[10px] font-mono rounded mb-1 font-semibold">
                        가로 16:9 화면 (Aspect 16:9)
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-neutral-900 mb-0.5 sm:mb-1">
                        작품 이미지 업로드 <span className="text-red-500">*</span>
                      </p>
                      <p className="text-[10px] sm:text-xs text-neutral-500 max-w-xs line-clamp-1 sm:line-clamp-none">
                        클릭 또는 드래그하여 업로드 (16:9 가로 화면)
                      </p>
                    </div>
                  ) : (
                    /* Image Dropzone in Adaptive A4 Aspect */
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleImageFile(e.dataTransfer.files[0]);
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      className={`w-full border-2 border-dashed border-neutral-300 hover:border-neutral-900 rounded-md bg-neutral-50/50 hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center cursor-pointer p-4 sm:p-6 text-center group ${
                        isLandscape
                          ? 'h-52 sm:h-64 md:h-72'
                          : 'h-64 sm:h-80 md:h-[380px]'
                      }`}
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neutral-100 group-hover:bg-neutral-200 flex items-center justify-center text-neutral-700 mb-2 sm:mb-3 transition-colors">
                        <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-neutral-900 mb-1">
                        작품 이미지 업로드 <span className="text-red-500">*</span>
                      </p>
                      <p className="text-[10px] sm:text-xs text-neutral-500 max-w-xs">
                        클릭하거나 이미지를 이 영역에 드래그하여 놓으세요 (JPG, PNG, WEBP)
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Gallery Information Table (exact width of artwork) */}
                <div
                  id="artwork-info-table-container"
                  className="w-full mt-2 sm:mt-3 md:mt-4"
                >
                  <table className="w-full border-collapse border border-neutral-900 text-neutral-900 bg-white table-fixed">
                    <thead>
                      <tr className="border-b border-neutral-900 bg-neutral-50/70 text-[8px] xs:text-[9px] sm:text-[11px] md:text-xs font-semibold text-neutral-700 tracking-wider">
                        <th className="py-0.5 sm:py-1 px-0.5 sm:px-1 border-r border-neutral-900 text-center font-semibold w-[20%]">
                          작품번호
                        </th>
                        <th className="py-0.5 sm:py-1 px-0.5 sm:px-1 border-r border-neutral-900 text-center font-semibold w-[33%]">
                          Title
                        </th>
                        <th className="py-0.5 sm:py-1 px-0.5 sm:px-1 border-r border-neutral-900 text-center font-semibold w-[16%]">
                          Canvas Size
                        </th>
                        <th className="py-0.5 sm:py-1 px-0.5 sm:px-1 border-r border-neutral-900 text-center font-semibold w-[20%]">
                          Material
                        </th>
                        <th className="py-0.5 sm:py-1 px-0.5 sm:px-1 text-center font-semibold w-[11%]">
                          제작년도
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isGenerated ? (
                        /* PUBLISHED GALLERY ROW */
                        <tr className="text-[9px] xs:text-[10px] sm:text-xs md:text-[13px] text-neutral-900">
                          {/* 작품번호 */}
                          <td className="py-1 sm:py-1.5 md:py-2 px-0.5 sm:px-1 border-r border-neutral-900 text-center font-mono font-bold tracking-tight truncate">
                            {generatedArtworkNumber}
                          </td>

                          {/* Title */}
                          <td className="py-1 sm:py-1.5 md:py-2 px-0.5 sm:px-1 border-r border-neutral-900 text-center font-medium truncate">
                            {title}
                          </td>

                          {/* Canvas Size */}
                          <td className="py-1 sm:py-1.5 md:py-2 px-0.5 sm:px-1 border-r border-neutral-900 text-center font-mono font-semibold truncate">
                            {canvasSize}
                          </td>

                          {/* Material */}
                          <td className="py-1 sm:py-1.5 md:py-2 px-0.5 sm:px-1 border-r border-neutral-900 text-center text-[8px] xs:text-[9px] sm:text-xs truncate">
                            {selectedMaterialItem ? selectedMaterialItem.label : 'Acrylic on Canvas'}
                          </td>

                          {/* 제작년도 */}
                          <td className="py-1 sm:py-1.5 md:py-2 px-0.5 sm:px-1 text-center font-mono truncate">
                            {year}
                          </td>
                        </tr>
                      ) : (
                        /* LIVE INTERACTIVE INPUT ROW IN A4 */
                        <tr className="text-[9px] xs:text-[10px] sm:text-xs text-neutral-900">
                          {/* 작품번호 (자동 생성 미리보기) */}
                          <td className="py-1 px-0.5 sm:px-1 border-r border-neutral-900 text-center bg-neutral-50/50">
                            <span className="font-mono text-[8px] xs:text-[9px] sm:text-[11px] font-bold text-neutral-800 truncate block">
                              {previewArtworkNumber || '자동 생성'}
                            </span>
                          </td>

                          {/* Title Input */}
                          <td className="p-0 border-r border-neutral-900">
                            <input
                              type="text"
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="작품명 입력 *"
                              className="w-full h-full py-1 sm:py-1.5 px-1 text-[9px] xs:text-[10px] sm:text-xs md:text-sm text-center font-medium bg-transparent focus:outline-none focus:bg-neutral-50 placeholder:text-neutral-400 placeholder:font-normal"
                            />
                          </td>

                          {/* Canvas Size Dropdown */}
                          <td className="p-0 border-r border-neutral-900 relative" ref={sizeDropdownRef}>
                            <button
                              type="button"
                              onClick={() => setIsSizeDropdownOpen(!isSizeDropdownOpen)}
                              className="w-full h-full py-1 sm:py-1.5 px-0.5 sm:px-1 text-[9px] xs:text-[10px] sm:text-xs font-mono font-semibold text-center flex items-center justify-center space-x-0.5 sm:space-x-1 cursor-pointer hover:bg-neutral-50"
                            >
                              <span className="truncate">{canvasSize || '규격 선택 *'}</span>
                              <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-neutral-400 shrink-0" />
                            </button>

                            {isSizeDropdownOpen && (
                              <div className="absolute z-40 top-full left-0 mt-1 w-64 bg-white border border-neutral-300 rounded shadow-xl max-h-60 overflow-hidden flex flex-col text-left">
                                <div className="p-1.5 border-b border-neutral-100 bg-neutral-50">
                                  <div className="relative flex items-center">
                                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2 pointer-events-none" />
                                    <input
                                      type="text"
                                      value={sizeSearchQuery}
                                      onChange={(e) => setSizeSearchQuery(e.target.value)}
                                      placeholder="030P, 호수, 치수..."
                                      className="w-full pl-7 pr-2 py-1 text-xs border border-neutral-200 rounded focus:outline-none"
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                <div className="p-1.5 border-b border-neutral-100 flex flex-wrap gap-1 bg-neutral-50/60">
                                  {POPULAR_CANVAS_CODES.map((code) => (
                                    <button
                                      key={code}
                                      type="button"
                                      onClick={() => {
                                        setCanvasSize(code);
                                        setIsSizeDropdownOpen(false);
                                      }}
                                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${
                                        canvasSize === code
                                          ? 'bg-neutral-900 text-white border-neutral-900'
                                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                                      }`}
                                    >
                                      {code}
                                    </button>
                                  ))}
                                </div>
                                <div className="overflow-y-auto divide-y divide-neutral-100 flex-1">
                                  {filteredCanvasSizes.map((item) => (
                                    <button
                                      key={item.code}
                                      type="button"
                                      onClick={() => {
                                        setCanvasSize(item.code);
                                        setIsSizeDropdownOpen(false);
                                      }}
                                      className={`w-full px-2.5 py-1.5 text-left text-xs hover:bg-neutral-50 flex items-center justify-between cursor-pointer ${
                                        canvasSize === item.code ? 'bg-neutral-100 font-bold' : ''
                                      }`}
                                    >
                                      <span className="font-mono font-bold text-neutral-900">
                                        {item.code}
                                      </span>
                                      <span className="text-[11px] text-neutral-500">
                                        {item.dimensionText}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Material Select */}
                          <td className="p-0 border-r border-neutral-900">
                            <select
                              value={materialCode}
                              onChange={(e) => setMaterialCode(e.target.value as MaterialCode)}
                              className="w-full h-full py-1 sm:py-1.5 px-0.5 sm:px-1 text-[8px] xs:text-[9px] sm:text-xs text-center font-medium bg-transparent focus:outline-none focus:bg-neutral-50 cursor-pointer"
                            >
                              <option value="" disabled>
                                재료 선택 *
                              </option>
                              {MATERIALS.map((m) => (
                                <option key={m.code} value={m.code}>
                                  {m.fullName}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* 제작년도 Select */}
                          <td className="p-0">
                            <select
                              value={year === '' ? '' : year}
                              onChange={(e) => setYear(Number(e.target.value))}
                              className="w-full h-full py-1 sm:py-1.5 px-0.5 sm:px-1 text-[8px] xs:text-[9px] sm:text-xs text-center font-mono bg-transparent focus:outline-none focus:bg-neutral-50 cursor-pointer"
                            >
                              <option value="" disabled>
                                년도 *
                              </option>
                              {yearOptions.map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Core Single Action Button: 포트폴리오 생성 (Bottom of A4) */}
            {!isGenerated && (
              <div className="no-print w-full flex flex-col items-center pt-3 sm:pt-5">
                <button
                  type="button"
                  id="btn-create-portfolio"
                  onClick={handleGeneratePortfolio}
                  className="w-full max-w-sm py-2.5 sm:py-3 px-6 bg-neutral-900 text-white text-xs sm:text-sm font-semibold rounded-md hover:bg-neutral-800 active:bg-neutral-950 transition-colors shadow-md flex items-center justify-center space-x-2 cursor-pointer group"
                >
                  <span>포트폴리오 생성</span>
                </button>
                <span className="text-[10px] sm:text-[11px] text-neutral-400 mt-1">
                  * 위 A4 화면에서 정보 입력 및 이미지 업로드 후 버튼을 누르면 완성됩니다.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Google Sheets Continuous Save & Sync Manager (Hidden when printing) */}
      <div className="no-print w-full max-w-[1040px] mt-4 sm:mt-6">
        <GoogleSheetsSyncManager currentPortfolio={currentPortfolioData} />
      </div>

      {/* Guidance footnote */}
      <div className="no-print text-center text-xs text-neutral-400 mt-4">
        {isLandscape
          ? '가로형 A4 규격(297 × 210mm) · 상단 토글 버튼으로 세로형 A4와 자유롭게 전환할 수 있습니다'
          : '세로형 A4 규격(210 × 297mm) · 상단 토글 버튼으로 가로형 A4와 자유롭게 전환할 수 있습니다'}
      </div>

      {/* ============================================================ */}
      {/* RESPONSIVE FULLSCREEN LIGHTBOX MODAL                         */}
      {/* ============================================================ */}
      {isLightboxOpen && imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 select-none"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Modal Top Bar */}
          <div
            className="w-full max-w-5xl flex items-center justify-between text-white pb-3 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-white/20 text-white text-[11px] font-mono rounded tracking-wider uppercase">
                {imageAspectMode === '16:9' ? '16:9 Widescreen' : 'Original Ratio'}
              </span>
              <span className="text-xs sm:text-sm font-medium text-neutral-200 truncate max-w-xs sm:max-w-md">
                {title || '작품 이미지 전체화면'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {imageAspectMode === '16:9' && (
                <button
                  type="button"
                  onClick={() =>
                    setImageFitMode((prev) => (prev === 'cover' ? 'contain' : 'cover'))
                  }
                  className="px-2.5 py-1 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded transition-colors cursor-pointer"
                >
                  {imageFitMode === 'cover' ? '맞춤(Fit) 전환' : '채우기(Fill) 전환'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="닫기 (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Main Stage */}
          <div
            className="w-full max-w-5xl flex-1 flex items-center justify-center p-2 sm:p-4 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {imageAspectMode === '16:9' ? (
              <div className="w-full aspect-[16/9] max-h-[82vh] relative rounded overflow-hidden bg-neutral-900 border border-white/10 shadow-2xl flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt={title || '작품 이미지'}
                  className={`w-full h-full ${
                    imageFitMode === 'cover' ? 'object-cover' : 'object-contain'
                  }`}
                />
              </div>
            ) : (
              <div className="max-w-full max-h-[82vh] flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt={title || '작품 이미지'}
                  className="max-w-full max-h-[82vh] object-contain rounded shadow-2xl"
                />
              </div>
            )}
          </div>

          {/* Modal Footer Bar */}
          <div
            className="w-full max-w-5xl pt-3 text-center text-xs text-neutral-400 border-t border-white/10 flex items-center justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] text-neutral-400">
              {imageAspectMode === '16:9'
                ? `16:9 와이드스크린 · ${imageFitMode === 'cover' ? 'Fill (채움)' : 'Fit (비율 유지)'}`
                : '원본 비율 (Original)'}
            </span>
            <span className="text-[11px] text-neutral-400">
              ESC 키 또는 바깥 영역을 클릭하여 닫기
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
