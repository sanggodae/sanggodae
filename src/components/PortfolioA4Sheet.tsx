import React, { useRef, useState, useEffect } from 'react';
import { GeneratedPortfolioData } from '../types';

interface Props {
  data: GeneratedPortfolioData;
}

export const PortfolioA4Sheet: React.FC<Props> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [artworkWidth, setArtworkWidth] = useState<number | null>(null);

  // Measure rendered width of the artwork image so the table has the EXACT same width
  const updateWidth = () => {
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        setArtworkWidth(Math.round(rect.width));
      }
    }
  };

  useEffect(() => {
    updateWidth();
    const handleResize = () => updateWidth();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [data.imageUrl, data.artworkNumber]);

  return (
    <div
      id="portfolio-a4-sheet"
      ref={containerRef}
      className="w-full bg-white shadow-2xl border border-neutral-200 overflow-hidden relative print:shadow-none print:border-0 print:m-0 print:p-0"
      style={{
        // A4 Portrait aspect ratio: 210 / 297 ≈ 0.707
        aspectRatio: '210 / 297',
      }}
    >
      {/* Gallery Margin Container */}
      <div className="w-full h-full p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col items-center justify-center box-border">
        {/* Centered Artwork + Exact-Width Info Table Block */}
        <div
          className="flex flex-col items-center justify-center max-w-full max-h-full"
          style={{
            width: artworkWidth ? `${artworkWidth}px` : 'auto',
          }}
        >
          {/* 1. Artwork Image */}
          <div className="flex items-center justify-center overflow-hidden">
            <img
              ref={imgRef}
              src={data.imageUrl}
              alt={data.title}
              onLoad={updateWidth}
              className="block object-contain max-h-[62vh] sm:max-h-[66vh] md:max-h-[70vh] max-w-full w-auto select-none print:max-h-[215mm]"
            />
          </div>

          {/* 2. Gallery Information Table (exact width of artwork) */}
          <div
            id="artwork-info-table-container"
            className="w-full mt-3 sm:mt-4 md:mt-5"
          >
            <table className="w-full border-collapse border border-neutral-900 text-neutral-900 bg-white table-fixed">
              <thead>
                <tr className="border-b border-neutral-900 bg-neutral-50/70 text-[10px] sm:text-xs font-semibold text-neutral-700 tracking-wider">
                  <th className="py-1 px-1.5 sm:px-2 border-r border-neutral-900 text-center font-semibold w-[20%]">
                    작품번호
                  </th>
                  <th className="py-1 px-1.5 sm:px-2 border-r border-neutral-900 text-center font-semibold w-[33%]">
                    Title
                  </th>
                  <th className="py-1 px-1.5 sm:px-2 border-r border-neutral-900 text-center font-semibold w-[16%]">
                    Canvas Size
                  </th>
                  <th className="py-1 px-1.5 sm:px-2 border-r border-neutral-900 text-center font-semibold w-[20%]">
                    Material
                  </th>
                  <th className="py-1 px-1.5 sm:px-2 text-center font-semibold w-[11%]">
                    제작년도
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-[11px] sm:text-xs md:text-[13px] text-neutral-900">
                  {/* 작품번호 */}
                  <td className="py-1.5 sm:py-2 px-1.5 sm:px-2 border-r border-neutral-900 text-center font-mono font-bold tracking-tight truncate">
                    {data.artworkNumber}
                  </td>

                  {/* Title */}
                  <td className="py-1.5 sm:py-2 px-1.5 sm:px-2 border-r border-neutral-900 text-center font-medium truncate">
                    {data.title}
                  </td>

                  {/* Canvas Size */}
                  <td className="py-1.5 sm:py-2 px-1.5 sm:px-2 border-r border-neutral-900 text-center font-mono font-semibold truncate">
                    {data.canvasSize}
                  </td>

                  {/* Material */}
                  <td className="py-1.5 sm:py-2 px-1.5 sm:px-2 border-r border-neutral-900 text-center text-[10px] sm:text-xs truncate">
                    {data.materialLabel}
                  </td>

                  {/* 제작년도 */}
                  <td className="py-1.5 sm:py-2 px-1.5 sm:px-2 text-center font-mono truncate">
                    {data.year}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
