import { CanvasSizeItem } from '../types';

export const padNumber = (num: number): string => {
  return num.toString().padStart(3, '0');
};

export const formatCanvasSizeCode = (num: number, type: 'F' | 'P' | 'M' | 'S'): string => {
  return `${padNumber(num)}${type}`;
};

// 한국 표준 캔버스 규격 (호수별 F/P/M 치수 cm 단위)
const RAW_CANVAS_DATA: Array<{
  number: number;
  F?: [number, number];
  P?: [number, number];
  M?: [number, number];
  S?: [number, number];
}> = [
  { number: 0, F: [18.0, 14.0], P: [18.0, 12.0], M: [18.0, 10.0], S: [18.0, 18.0] },
  { number: 1, F: [22.7, 15.8], P: [22.7, 14.0], M: [22.7, 12.0], S: [22.7, 22.7] },
  { number: 2, F: [25.8, 17.9], P: [25.8, 16.0], M: [25.8, 14.0] },
  { number: 3, F: [27.3, 22.0], P: [27.3, 19.0], M: [27.3, 16.0] },
  { number: 4, F: [33.4, 24.2], P: [33.4, 21.2], M: [33.4, 19.0] },
  { number: 5, F: [35.0, 27.3] },
  { number: 6, F: [40.9, 31.8], P: [40.9, 27.3], M: [40.9, 24.2] },
  { number: 8, F: [45.5, 37.9], P: [45.5, 33.4], M: [45.5, 27.3] },
  { number: 10, F: [53.0, 45.5], P: [53.0, 40.9], M: [53.0, 33.4] },
  { number: 12, F: [60.6, 50.0], P: [60.6, 45.5], M: [60.6, 40.9] },
  { number: 15, F: [65.1, 53.0], P: [65.1, 50.0], M: [65.1, 45.5] },
  { number: 20, F: [72.7, 60.6], P: [72.7, 53.0], M: [72.7, 50.0] },
  { number: 25, F: [80.3, 65.1], P: [80.3, 60.6], M: [80.3, 53.0] },
  { number: 30, F: [90.9, 72.7], P: [90.9, 65.1], M: [90.9, 60.6] },
  { number: 40, F: [100.0, 80.3], P: [100.0, 72.7], M: [100.0, 65.1] },
  { number: 50, F: [116.8, 91.0], P: [116.8, 80.3], M: [116.8, 72.7] },
  { number: 60, F: [130.3, 97.0], P: [130.3, 89.4], M: [130.3, 80.3] },
  { number: 80, F: [145.5, 112.1], P: [145.5, 97.0], M: [145.5, 89.4] },
  { number: 100, F: [162.2, 130.3], P: [162.2, 112.1], M: [162.2, 97.0] },
  { number: 120, F: [194.0, 130.3], P: [194.0, 112.1], M: [194.0, 97.0] },
  { number: 150, F: [227.3, 181.8], P: [227.3, 162.2], M: [227.3, 145.5] },
  { number: 200, F: [259.0, 194.0], P: [259.0, 181.8], M: [259.0, 162.2] },
];

const TYPE_LABELS: Record<'F' | 'P' | 'M' | 'S', string> = {
  F: 'F (인물형 Figure)',
  P: 'P (풍경형 Paysage)',
  M: 'M (해경형 Marine)',
  S: 'S (정방형 Square)',
};

export const CANVAS_SIZE_LIST: CanvasSizeItem[] = [];

RAW_CANVAS_DATA.forEach((item) => {
  const types: Array<'F' | 'P' | 'M' | 'S'> = ['F', 'P', 'M', 'S'];
  types.forEach((type) => {
    const dims = item[type];
    if (dims) {
      CANVAS_SIZE_LIST.push({
        code: formatCanvasSizeCode(item.number, type),
        number: item.number,
        type,
        widthCm: dims[0],
        heightCm: dims[1],
        dimensionText: `${dims[0]} × ${dims[1]} cm`,
        categoryLabel: TYPE_LABELS[type],
      });
    }
  });
});

// 자주 쓰이는 인기 캔버스 규격 (빠른 선택용 칩)
export const POPULAR_CANVAS_CODES = [
  '010F',
  '020F',
  '030F',
  '030P',
  '030M',
  '040F',
  '050F',
  '100F',
];
