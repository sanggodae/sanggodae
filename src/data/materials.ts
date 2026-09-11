import { MaterialItem, MaterialCode } from '../types';

export const MATERIALS: MaterialItem[] = [
  {
    code: 'A',
    label: 'Acrylic on Canvas',
    fullName: 'A — Acrylic on Canvas',
  },
  {
    code: 'O',
    label: 'Oil on Canvas',
    fullName: 'O — Oil on Canvas',
  },
  {
    code: 'M',
    label: 'Mixed Material on Canvas',
    fullName: 'M — Mixed Material on Canvas',
  },
];

export const getMaterialByCode = (code: MaterialCode): MaterialItem | undefined => {
  return MATERIALS.find((m) => m.code === code);
};
