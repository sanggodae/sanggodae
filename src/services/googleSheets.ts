import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GeneratedPortfolioData } from '../types';

// Scopes for Google Sheets and Google Drive (create files)
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
// In-memory token cache (Do NOT put access tokens in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If user is logged in but in-memory token expired/missing,
        // we can prompt for sign-in again when an operation is performed.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('구글 인증 토큰 획득에 실패했습니다.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export interface SpreadsheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

/**
 * Creates a brand new Google Spreadsheet in the user's Google Drive
 * titled "미술관 작품관리대장 (Artist Portfolio)"
 */
export const createPortfolioSpreadsheet = async (
  accessToken: string,
  customTitle?: string
): Promise<SpreadsheetInfo> => {
  const title = customTitle || '미술관 작품관리대장 (Artist Portfolio)';
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';

  const body = {
    properties: {
      title,
      locale: 'ko_KR',
    },
    sheets: [
      {
        properties: {
          title: '작품관리대장',
          gridProperties: {
            frozenRowCount: 1,
            rowCount: 100,
            columnCount: 10,
          },
        },
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || '새 구글 시트 생성에 실패했습니다.');
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl;

  // Set up header row and styling
  await initializeSpreadsheetHeaders(accessToken, spreadsheetId);

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
};

/**
 * Formats and inserts the initial headers for the newly created spreadsheet
 */
const initializeSpreadsheetHeaders = async (accessToken: string, spreadsheetId: string) => {
  const range = '작품관리대장!A1:G1';
  const headers = [
    [
      '작품이미지',
      '작품번호',
      'Title',
      'Canvas Size',
      'Material',
      '제작년도',
      '포트폴리오 생성일시',
    ],
  ];

  // 1. Insert header text
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}?valueInputOption=USER_ENTERED`;

  await fetch(appendUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: headers }),
  });

  // 2. Format header row & column widths via batchUpdate
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const formatBody = {
    requests: [
      // Header formatting (dark background, bold white text)
      {
        repeatCell: {
          range: {
            sheetId: 0,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: 7,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.12, green: 0.16, blue: 0.22 }, // Dark slate
              textFormat: {
                foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                bold: true,
                fontSize: 10,
              },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
            },
          },
          fields:
            'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
        },
      },
      // Set Column Widths (pixels)
      // A (Images): 150px
      {
        updateDimensionProperties: {
          range: {
            sheetId: 0,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 1,
          },
          properties: { pixelSize: 150 },
          fields: 'pixelSize',
        },
      },
      // B (작품번호): 130px
      {
        updateDimensionProperties: {
          range: {
            sheetId: 0,
            dimension: 'COLUMNS',
            startIndex: 1,
            endIndex: 2,
          },
          properties: { pixelSize: 130 },
          fields: 'pixelSize',
        },
      },
      // C (Title): 220px
      {
        updateDimensionProperties: {
          range: {
            sheetId: 0,
            dimension: 'COLUMNS',
            startIndex: 2,
            endIndex: 3,
          },
          properties: { pixelSize: 220 },
          fields: 'pixelSize',
        },
      },
      // D (Canvas Size): 110px
      {
        updateDimensionProperties: {
          range: {
            sheetId: 0,
            dimension: 'COLUMNS',
            startIndex: 3,
            endIndex: 4,
          },
          properties: { pixelSize: 110 },
          fields: 'pixelSize',
        },
      },
      // E (Material): 190px
      {
        updateDimensionProperties: {
          range: {
            sheetId: 0,
            dimension: 'COLUMNS',
            startIndex: 4,
            endIndex: 5,
          },
          properties: { pixelSize: 190 },
          fields: 'pixelSize',
        },
      },
      // F (제작년도): 100px
      {
        updateDimensionProperties: {
          range: {
            sheetId: 0,
            dimension: 'COLUMNS',
            startIndex: 5,
            endIndex: 6,
          },
          properties: { pixelSize: 100 },
          fields: 'pixelSize',
        },
      },
      // G (생성일시): 180px
      {
        updateDimensionProperties: {
          range: {
            sheetId: 0,
            dimension: 'COLUMNS',
            startIndex: 6,
            endIndex: 7,
          },
          properties: { pixelSize: 180 },
          fields: 'pixelSize',
        },
      },
    ],
  };

  await fetch(batchUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formatBody),
  });
};

/**
 * Appends a generated artwork record as a new row into the specified Google Spreadsheet
 */
export const appendArtworkToSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  artwork: GeneratedPortfolioData
): Promise<{ updatedRows: number; updatedRange: string }> => {
  const range = '작품관리대장!A1';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  // Format image formula or URL
  const imageCell = artwork.imageUrl?.startsWith('http')
    ? `=IMAGE("${artwork.imageUrl}")`
    : artwork.imageUrl || '';

  const dateString = new Date(artwork.createdAt || Date.now()).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const rowValues = [
    [
      imageCell,
      artwork.artworkNumber,
      artwork.title,
      artwork.canvasSize,
      artwork.materialLabel,
      artwork.year,
      dateString,
    ],
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: rowValues }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || '구글 시트에 작품 저장 실패');
  }

  const data = await res.json();
  return {
    updatedRows: data.updates?.updatedRows || 1,
    updatedRange: data.updates?.updatedRange || '',
  };
};
