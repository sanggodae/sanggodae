import React, { useState } from 'react';
import { A4Portfolio } from './components/A4Portfolio';
import { GoogleSheetsGuideModal } from './components/GoogleSheetsGuideModal';
import { LayoutMode } from './types';
import { FileSpreadsheet } from 'lucide-react';

export default function App() {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('landscape');
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-neutral-100/90 text-neutral-900 flex flex-col selection:bg-neutral-900 selection:text-white">
      {/* Gallery Header (Hidden when printing) */}
      <header className="no-print bg-white border-b border-neutral-200 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-base font-bold tracking-tight font-serif text-neutral-950">
              ARTIST PORTFOLIO MAKER
            </h1>
            <span className="hidden sm:inline-block text-neutral-300">|</span>
            <span className="hidden sm:inline-block text-xs text-neutral-500 font-sans tracking-wide">
              미술 작가를 위한 표준 A4 포트폴리오
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              id="btn-open-sheets-guide"
              onClick={() => setIsSheetsModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-md text-xs font-medium transition-colors cursor-pointer shadow-2xs"
              title="Google Sheets 작품관리대장 자동화 가이드 및 Apps Script 코드"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>작품관리대장 (Google Sheets)</span>
            </button>

            <span className="hidden md:inline-block px-2.5 py-1 bg-neutral-100 rounded border border-neutral-200 font-medium text-xs font-mono text-neutral-700">
              {layoutMode === 'landscape'
                ? 'A4 Landscape (297 × 210mm)'
                : 'A4 Portrait (210 × 297mm)'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Center Stage: Adaptive A4 Portfolio */}
      <main className="flex-1 w-full max-w-[1160px] mx-auto flex flex-col items-center justify-center p-2 sm:p-6">
        <A4Portfolio
          layoutMode={layoutMode}
          onLayoutModeChange={(mode) => setLayoutMode(mode)}
        />
      </main>

      {/* Google Sheets Ledger Modal */}
      <GoogleSheetsGuideModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
      />

      {/* Minimalist Footer (Hidden when printing) */}
      <footer className="no-print border-t border-neutral-200 bg-white py-3 text-center text-xs text-neutral-400 flex items-center justify-center space-x-3">
        <span>Artist Portfolio Maker · Exhibition Catalog Layout</span>
        <span>·</span>
        <button
          type="button"
          onClick={() => setIsSheetsModalOpen(true)}
          className="text-emerald-700 hover:underline cursor-pointer"
        >
          Google Sheets 작품관리대장 연동 규격
        </button>
      </footer>
    </div>
  );
}


