import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  value: number | '';
  onChange: (val: number) => void;
  hasError?: boolean;
}

export const YearSelector: React.FC<Props> = ({ value, onChange, hasError }) => {
  const currentYear = new Date().getFullYear();
  const startYear = 2000;
  const years: number[] = [];

  for (let y = currentYear; y >= startYear; y--) {
    years.push(y);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-neutral-900">
          제작년도 <span className="text-red-500">*</span>
        </label>
        <span className="text-xs text-neutral-400">2000 ~ {currentYear}년</span>
      </div>

      <div className="relative">
        <select
          id="year-select"
          value={value === '' ? '' : value}
          onChange={(e) => {
            const val = e.target.value;
            if (val) onChange(parseInt(val, 10));
          }}
          className={`w-full appearance-none px-3.5 py-2.5 bg-white border text-neutral-900 text-sm rounded-md cursor-pointer transition-colors focus:outline-none ${
            hasError
              ? 'border-red-500 ring-1 ring-red-500'
              : 'border-neutral-300 hover:border-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
          }`}
        >
          <option value="" disabled>
            제작년도를 선택하세요
          </option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-500">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
