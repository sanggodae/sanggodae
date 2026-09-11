export type MaterialCode = 'A' | 'O' | 'M';
export type LayoutMode = 'landscape' | 'portrait';
export type ImageAspectRatio = '16:9' | 'original';
export type ImageFitMode = 'cover' | 'contain';

export interface CanvasSizeItem {
  code: string;        // e.g. "030P"
  number: number;      // e.g. 30
  type: 'F' | 'P' | 'M' | 'S';
  widthCm: number;
  heightCm: number;
  dimensionText: string; // e.g. "90.9 × 65.1 cm"
  categoryLabel: string; // e.g. "P (풍경형)"
}

export interface MaterialItem {
  code: MaterialCode;
  label: string;
  fullName: string;
}

export interface ArtworkData {
  imageUrl: string;
  imageName: string;
  imageNaturalWidth: number;
  imageNaturalHeight: number;
  title: string;
  canvasSize: string; // e.g. "030P"
  materialCode: MaterialCode | '';
  year: number | '';
}

export interface GeneratedPortfolioData {
  artworkNumber: string; // e.g. "26030PA-01"
  title: string;
  canvasSize: string;
  materialCode: MaterialCode;
  materialLabel: string;
  year: number;
  imageUrl: string;
  imageName?: string;
  imageNaturalWidth: number;
  imageNaturalHeight: number;
  createdAt: number;
}
