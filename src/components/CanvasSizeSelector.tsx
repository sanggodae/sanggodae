import React, { useState, useRef, useEffect } from 'react';
import { CANVAS_SIZE_LIST, POPULAR_CANVAS_CODES } from '../data/canvasSizes';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  hasError?: boolean;
}

export const CanvasSizeSelector: React.FC<Props> = ({ value, onChange, hasError }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredList = CANVAS_SIZE_LIST.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.code.toLowerCase().includes(q) ||
      item.number.toString().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      item.dimensionText.toLowerCase().includes(q) ||
      item.categoryLabel.toLowerCase().includes(q)
    );
  });

  const selectedItem = CANVAS_SIZE_LIST.find((item) => item.code === value);

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-neutral-900">
          Canvas Size <span className="text-red-500">*</span>
        </label>
        {value && (
          <span className="text-xs font-mono text-neutral-500">
            선택된 규격: <strong className="text-neutral-900">{value}</strong>
            {selectedItem ? ` (${selectedItem.dimensionText})` : ''}
          </span>
        )}
      </div>

      {/* Quick Select Popular Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pb-1">
        <span className="text-[11px] font-medium text-neutral-400 mr-1">자주 쓰는 규격:</span>
        {POPULAR_CANVAS_CODES.map((code) => {
          const isSelected = value === code;
          return (
            <button
              key={code}
              type="button"
              id={`quick-canvas-${code}`}
              onClick={() => {
                onChange(code);
                setIsOpen(false);
              }}
              className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300'
              }`}
            >
              {code}
            </button>
          );
        })}
      </div>

      {/* Searchable Select Trigger */}
      <div className="relative">
        <button
          type="button"
          id="canvas-size-dropdown-trigger"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border text-left rounded-md transition-colors cursor-pointer ${
            hasError
              ? 'border-red-500 ring-1 ring-red-500'
              : isOpen
              ? 'border-neutral-900 ring-1 ring-neutral-900'
              : 'border-neutral-300 hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center space-x-2.5 truncate">
            {value ? (
              <span className="font-mono font-medium text-neutral-900 text-sm">
                {value}
                {selectedItem && (
                  <span className="ml-2 font-sans text-neutral-500 text-xs">
                    ({selectedItem.dimensionText} · {selectedItem.categoryLabel})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-neutral-400 text-sm">캔버스 규격을 선택하거나 검색하세요</span>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-neutral-500 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-lg max-h-72 overflow-hidden flex flex-col">
            {/* Search Input */}
            <div className="p-2 border-b border-neutral-100 bg-neutral-50/50 sticky top-0">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-neutral-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  id="canvas-size-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="규격 코드(030P), 호수(30), 치수, 유형 검색..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-neutral-200 rounded focus:outline-none focus:border-neutral-900"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto divide-y divide-neutral-100 flex-1">
              {filteredList.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-400">
                  일치하는 캔버스 규격이 없습니다.
                </div>
              ) : (
                filteredList.map((item) => {
                  const isSelected = value === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      id={`canvas-option-${item.code}`}
                      onClick={() => {
                        onChange(item.code);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-neutral-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-neutral-50 font-medium' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-sm font-semibold text-neutral-900 w-14">
                          {item.code}
                        </span>
                        <div className="text-xs text-neutral-600">
                          <span className="font-medium text-neutral-800">{item.dimensionText}</span>
                          <span className="ml-2 text-neutral-400 text-[11px]">
                            {item.categoryLabel}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-neutral-900" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
