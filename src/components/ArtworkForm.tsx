import React, { useState } from 'react';
import { ArtworkData, MaterialCode } from '../types';
import { ImageUploader } from './ImageUploader';
import { CanvasSizeSelector } from './CanvasSizeSelector';
import { MaterialSelector } from './MaterialSelector';
import { YearSelector } from './YearSelector';
import { peekNextArtworkNumber } from '../utils/artworkNumber';
import { getMaterialByCode } from '../data/materials';
import { AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

interface Props {
  formData: ArtworkData;
  setFormData: React.Dispatch<React.SetStateAction<ArtworkData>>;
  onSubmit: () => void;
}

export const ArtworkForm: React.FC<Props> = ({
  formData,
  setFormData,
  onSubmit,
}) => {
  const [validationErrors, setValidationErrors] = useState<{
    image?: string;
    title?: string;
    canvasSize?: string;
    material?: string;
    year?: string;
  }>({});

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof validationErrors = {};

    if (!formData.imageUrl) {
      errors.image = '작품 이미지를 업로드해 주세요.';
    }
    if (!formData.title.trim()) {
      errors.title = 'Title을 입력해 주세요.';
    }
    if (!formData.canvasSize.trim()) {
      errors.canvasSize = 'Canvas Size를 선택해 주세요.';
    }
    if (!formData.materialCode) {
      errors.material = 'Material을 선택해 주세요.';
    }
    if (!formData.year) {
      errors.year = '제작년도를 선택해 주세요.';
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Focus or scroll to the first error if needed
      return;
    }

    onSubmit();
  };

  // Preview generated artwork number if prerequisites are present
  const previewNumber =
    formData.year && formData.canvasSize && formData.materialCode
      ? peekNextArtworkNumber(
          Number(formData.year),
          formData.canvasSize,
          formData.materialCode as MaterialCode
        ).fullCode
      : null;

  // Quick Demo Helper
  const loadDemoSample = () => {
    // Elegant geometric abstraction SVG as data URL
    const demoCanvas = document.createElement('canvas');
    demoCanvas.width = 1600;
    demoCanvas.height = 1140;
    const ctx = demoCanvas.getContext('2d');
    if (ctx) {
      // Minimalist gallery composition
      ctx.fillStyle = '#f4f3ef';
      ctx.fillRect(0, 0, 1600, 1140);

      // Deep prussian blue wash
      ctx.fillStyle = '#1c2833';
      ctx.beginPath();
      ctx.arc(800, 520, 360, 0, Math.PI * 2);
      ctx.fill();

      // Ochre crescent
      ctx.fillStyle = '#d4ac0d';
      ctx.beginPath();
      ctx.arc(940, 580, 240, 0, Math.PI * 2);
      ctx.fill();

      // Burnt sienna bar
      ctx.fillStyle = '#935116';
      ctx.fillRect(400, 760, 800, 28);

      // Subtle texture line
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(350, 300);
      ctx.lineTo(1250, 300);
      ctx.stroke();
    }
    const sampleDataUrl = demoCanvas.toDataURL('image/png');

    setFormData({
      imageUrl: sampleDataUrl,
      imageName: 'sample_artwork_blue_orbit.png',
      imageNaturalWidth: 1600,
      imageNaturalHeight: 1140,
      title: 'Untilted (Celestial Echo)',
      canvasSize: '030P',
      materialCode: 'A',
      year: 2026,
    });
    setValidationErrors({});
  };

  return (
    <form
      id="artwork-input-form"
      onSubmit={validateAndSubmit}
      className="space-y-6 max-w-2xl mx-auto"
    >
      {/* Demo sample loader for testing */}
      <div className="flex items-center justify-between py-1 px-3 bg-neutral-50 rounded border border-neutral-200/80">
        <span className="text-xs text-neutral-500">
          작품 정보 입력 후 하단의 <strong>「포트폴리오 생성」</strong> 버튼을 클릭하세요.
        </span>
        <button
          type="button"
          id="btn-load-demo"
          onClick={loadDemoSample}
          className="text-xs text-neutral-700 hover:text-neutral-950 font-medium inline-flex items-center space-x-1 underline underline-offset-2 cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          <span>샘플 작품 입력</span>
        </button>
      </div>

      {/* 1. 작품 이미지 업로드 */}
      <div>
        <ImageUploader
          imageUrl={formData.imageUrl}
          imageName={formData.imageName}
          imageNaturalWidth={formData.imageNaturalWidth}
          imageNaturalHeight={formData.imageNaturalHeight}
          onImageSelected={(info) => {
            setFormData((prev) => ({
              ...prev,
              imageUrl: info.imageUrl,
              imageName: info.imageName,
              imageNaturalWidth: info.naturalWidth,
              imageNaturalHeight: info.naturalHeight,
            }));
            if (validationErrors.image) {
              setValidationErrors((prev) => ({ ...prev, image: undefined }));
            }
          }}
          onImageRemoved={() => {
            setFormData((prev) => ({
              ...prev,
              imageUrl: '',
              imageName: '',
              imageNaturalWidth: 0,
              imageNaturalHeight: 0,
            }));
          }}
          hasError={Boolean(validationErrors.image)}
        />
        {validationErrors.image && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{validationErrors.image}</span>
          </p>
        )}
      </div>

      {/* 2. Title */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-neutral-900">
            Title <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-neutral-400">작품 명제</span>
        </div>
        <input
          type="text"
          id="artwork-title-input"
          value={formData.title}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, title: e.target.value }));
            if (validationErrors.title) {
              setValidationErrors((prev) => ({ ...prev, title: undefined }));
            }
          }}
          placeholder="예: 무제 (Untitled), Blue Horizon, 시간의 궤적 등"
          className={`w-full px-3.5 py-2.5 bg-white border text-sm text-neutral-900 rounded-md transition-colors focus:outline-none ${
            validationErrors.title
              ? 'border-red-500 ring-1 ring-red-500'
              : 'border-neutral-300 hover:border-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
          }`}
        />
        {validationErrors.title && (
          <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{validationErrors.title}</span>
          </p>
        )}
      </div>

      {/* 3. Canvas Size */}
      <div>
        <CanvasSizeSelector
          value={formData.canvasSize}
          onChange={(val) => {
            setFormData((prev) => ({ ...prev, canvasSize: val }));
            if (validationErrors.canvasSize) {
              setValidationErrors((prev) => ({ ...prev, canvasSize: undefined }));
            }
          }}
          hasError={Boolean(validationErrors.canvasSize)}
        />
        {validationErrors.canvasSize && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{validationErrors.canvasSize}</span>
          </p>
        )}
      </div>

      {/* 4. Material */}
      <div>
        <MaterialSelector
          value={formData.materialCode}
          onChange={(code) => {
            setFormData((prev) => ({ ...prev, materialCode: code }));
            if (validationErrors.material) {
              setValidationErrors((prev) => ({ ...prev, material: undefined }));
            }
          }}
          hasError={Boolean(validationErrors.material)}
        />
        {validationErrors.material && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{validationErrors.material}</span>
          </p>
        )}
      </div>

      {/* 5. 제작년도 */}
      <div>
        <YearSelector
          value={formData.year}
          onChange={(yr) => {
            setFormData((prev) => ({ ...prev, year: yr }));
            if (validationErrors.year) {
              setValidationErrors((prev) => ({ ...prev, year: undefined }));
            }
          }}
          hasError={Boolean(validationErrors.year)}
        />
        {validationErrors.year && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{validationErrors.year}</span>
          </p>
        )}
      </div>

      {/* Numbering Preview Card */}
      {previewNumber && (
        <div className="p-3.5 bg-neutral-50 rounded-md border border-neutral-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
              자동 생성 예정 작품번호
            </span>
            <div className="font-mono text-base font-bold text-neutral-900">
              {previewNumber}
            </div>
          </div>
          <span className="text-xs text-neutral-400 text-right">
            규칙: {formData.year?.toString().slice(-2)} + {formData.canvasSize} + {formData.materialCode} + 일련번호
          </span>
        </div>
      )}

      {/* Key Core Action Button: 포트폴리오 생성 */}
      <div className="pt-2">
        <button
          type="submit"
          id="btn-generate-portfolio"
          className="w-full py-4 px-6 bg-neutral-900 text-white font-medium text-base rounded-md hover:bg-neutral-800 active:bg-neutral-950 transition-colors shadow-sm flex items-center justify-center space-x-2 cursor-pointer group"
        >
          <span>포트폴리오 생성</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </form>
  );
};
