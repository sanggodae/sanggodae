import React from 'react';
import { MaterialCode } from '../types';
import { MATERIALS } from '../data/materials';
import { Check } from 'lucide-react';

interface Props {
  value: MaterialCode | '';
  onChange: (val: MaterialCode) => void;
  hasError?: boolean;
}

export const MaterialSelector: React.FC<Props> = ({ value, onChange, hasError }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-neutral-900">
          Material <span className="text-red-500">*</span>
        </label>
        <span className="text-xs text-neutral-400">3가지 공식 재료 규격 중 선택</span>
      </div>

      <div
        className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 ${
          hasError ? 'p-1 border border-red-500 rounded-md bg-red-50/20' : ''
        }`}
      >
        {MATERIALS.map((mat) => {
          const isSelected = value === mat.code;
          return (
            <button
              key={mat.code}
              type="button"
              id={`material-option-${mat.code}`}
              onClick={() => onChange(mat.code)}
              className={`flex items-center justify-between p-3 rounded-md border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                  : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/60'
              }`}
            >
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    코드 {mat.code}
                  </span>
                </div>
                <span className="text-xs font-medium mt-1 leading-snug">
                  {mat.label}
                </span>
              </div>
              {isSelected && (
                <div className="w-4 h-4 rounded-full bg-white text-neutral-900 flex items-center justify-center shrink-0 ml-1.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
