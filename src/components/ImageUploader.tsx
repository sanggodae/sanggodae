import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, X, RefreshCw } from 'lucide-react';

interface Props {
  imageUrl: string;
  imageName: string;
  imageNaturalWidth: number;
  imageNaturalHeight: number;
  onImageSelected: (data: {
    imageUrl: string;
    imageName: string;
    naturalWidth: number;
    naturalHeight: number;
  }) => void;
  onImageRemoved: () => void;
  hasError?: boolean;
}

export const ImageUploader: React.FC<Props> = ({
  imageUrl,
  imageName,
  imageNaturalWidth,
  imageNaturalHeight,
  onImageSelected,
  onImageRemoved,
  hasError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일(JPG, PNG, WEBP 등)만 업로드 가능합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        onImageSelected({
          imageUrl: result,
          imageName: file.name,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        });
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-neutral-900">
          작품 이미지 <span className="text-red-500">*</span>
        </label>
        {imageUrl && (
          <span className="text-xs text-neutral-500">
            원본 해상도: {imageNaturalWidth} × {imageNaturalHeight} px
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        id="artwork-image-file-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {!imageUrl ? (
        <div
          id="image-dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-lg p-7 text-center transition-all cursor-pointer group flex flex-col items-center justify-center ${
            hasError
              ? 'border-red-500 bg-red-50/20'
              : isDragging
              ? 'border-neutral-900 bg-neutral-100/60'
              : 'border-neutral-300 hover:border-neutral-900 hover:bg-neutral-50/70'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 mb-3 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-6 h-6 stroke-[1.5]" />
          </div>
          <p className="text-sm font-medium text-neutral-900 mb-1">
            작품 이미지를 드래그하여 놓거나 클릭하여 선택하세요
          </p>
          <p className="text-xs text-neutral-400">
            JPG, PNG, WEBP 등 고해상도 이미지 파일 지원
          </p>
        </div>
      ) : (
        <div className="relative border border-neutral-200 rounded-lg p-3 bg-neutral-50/60 flex items-center gap-4">
          <div className="w-20 h-20 shrink-0 bg-neutral-200 rounded border border-neutral-200 overflow-hidden flex items-center justify-center">
            <img
              src={imageUrl}
              alt="Artwork Thumbnail"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-neutral-500 shrink-0" />
              <p className="text-xs font-medium text-neutral-900 truncate">{imageName}</p>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              비율: {(imageNaturalWidth / imageNaturalHeight).toFixed(2)}:1 · {imageNaturalWidth} × {imageNaturalHeight} px
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <button
                type="button"
                id="btn-reupload-image"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center space-x-1 text-xs text-neutral-700 hover:text-neutral-900 font-medium cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>다른 이미지로 변경</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            id="btn-remove-image"
            onClick={onImageRemoved}
            className="p-1.5 text-neutral-400 hover:text-red-600 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
            title="이미지 삭제"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
