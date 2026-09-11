import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GeneratedPortfolioData } from '../types';

// Scopes for Google Sheets and Google Drive (create files)
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

export interface GoogleAccountUser {
  email: string;
  displayName: string;
  photoURL?: string;
}

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
// In-memory token cache (Do NOT put access tokens in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: GoogleAccountUser | null = null;

export const initAuth = (
  onAuthSuccess?: (user: GoogleAccountUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      const user: GoogleAccountUser = {
        email: fbUser.email || '',
        displayName: fbUser.displayName || fbUser.email || 'User',
        photoURL: fbUser.photoURL || undefined,
      };
      cachedGoogleUser = user;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else if (cachedGoogleUser && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(cachedGoogleUser, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      cachedGoogleUser = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Robust Google Sign-In:
 * Prioritizes Google Identity Services (GSI - google.accounts.oauth2) to bypass
 * Firebase __/auth/handler third-party cookie issues and iframe popup flashing.
 * Falls back gracefully to Firebase Auth signInWithPopup if GSI is not loaded.
 */
export const googleSignIn = async (): Promise<{ user: GoogleAccountUser; accessToken: string }> => {
  if (cachedAccessToken && cachedGoogleUser) {
    return { user: cachedGoogleUser, accessToken: cachedAccessToken };
  }

  isSigningIn = true;

  try {
    // 1. Try Google Identity Services (GSI) Token Client first
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        const result = await new Promise<{ user: GoogleAccountUser; accessToken: string }>(
          (resolve, reject) => {
            const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
              client_id: firebaseConfig.oAuthClientId,
              scope: SCOPES.join(' '),
              prompt: 'select_account',
              callback: async (response: any) => {
                if (response.error) {
                  console.error('GSI OAuth error:', response);
                  reject(new Error(response.error_description || response.error || 'Google 인증에 실패했습니다.'));
                  return;
                }

                const accessToken = response.access_token;
                if (!accessToken) {
                  reject(new Error('Google Access Token을 받지 못했습니다.'));
                  return;
                }

                try {
                  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                  });
                  const profile = await userRes.json();
                  const gUser: GoogleAccountUser = {
                    email: profile.email || 'Google User',
                    displayName: profile.name || profile.email?.split('@')[0] || '사용자',
                    photoURL: profile.picture,
                  };

                  cachedAccessToken = accessToken;
                  cachedGoogleUser = gUser;
                  resolve({ user: gUser, accessToken });
                } catch {
                  const fallbackUser: GoogleAccountUser = {
                    email: 'Google Account',
                    displayName: 'Google User',
                  };
                  cachedAccessToken = accessToken;
                  cachedGoogleUser = fallbackUser;
                  resolve({ user: fallbackUser, accessToken });
                }
              },
              error_callback: (err: any) => {
                console.error('GSI Error Callback:', err);
                reject(
                  new Error(
                    'Google 로그인 창이 닫혔거나 취소되었습니다. 브라우저 팝업 허용 여부를 확인해 주세요.'
                  )
                );
              },
            });

            tokenClient.requestAccessToken({ prompt: 'select_account' });
          }
        );

        return result;
      } catch (gsiError: any) {
        console.warn('GSI failed or closed, checking Firebase fallback:', gsiError);
        // If user actively closed it, propagate message
        if (gsiError.message && gsiError.message.includes('취소')) {
          throw gsiError;
        }
      }
    }

    // 2. Fallback: Firebase Auth signInWithPopup
    const fbResult = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(fbResult);
    if (!credential?.accessToken) {
      throw new Error('Google OAuth 인증 토큰 획득에 실패했습니다.');
    }

    cachedAccessToken = credential.accessToken;
    const gUser: GoogleAccountUser = {
      email: fbResult.user.email || '',
      displayName: fbResult.user.displayName || fbResult.user.email || 'Google User',
      photoURL: fbResult.user.photoURL || undefined,
    };
    cachedGoogleUser = gUser;

    return { user: gUser, accessToken: cachedAccessToken };
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
  try {
    await signOut(auth);
  } catch (e) {
    console.error('Firebase signout error', e);
  }
  cachedAccessToken = null;
  cachedGoogleUser = null;
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
          sheetId: 0,
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

  try {
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
    const formatBody = {
      requests: [
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
                backgroundColor: { red: 0.12, green: 0.16, blue: 0.22 },
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
      ],
    };

    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    await fetch(batchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formatBody),
    });
  } catch (err) {
    console.warn('Could not apply custom header styling to new spreadsheet:', err);
  }
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

  // Format image formula or URL (Never put large base64 data URIs into Google Sheets cells - 50,000 char limit)
  let imageCell = '';
  if (artwork.imageUrl?.startsWith('http://') || artwork.imageUrl?.startsWith('https://')) {
    imageCell = `=IMAGE("${artwork.imageUrl}")`;
  } else if (artwork.imageName) {
    imageCell = `[첨부 파일: ${artwork.imageName}]`;
  } else {
    imageCell = '[업로드 이미지]';
  }

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

/**
 * Downloads artworks as a UTF-8 BOM CSV file that can be opened directly
 * in Google Sheets (File > Import) or Excel with Korean support.
 */
export const downloadArtworkAsCSV = (artworks: GeneratedPortfolioData[]) => {
  if (!artworks || artworks.length === 0) return;
  const headers = ['작품번호', 'Title', 'Canvas Size', 'Material', '제작년도', '첨부파일명', '생성일시'];
  const rows = artworks.map((art) => [
    `"${(art.artworkNumber || '').replace(/"/g, '""')}"`,
    `"${(art.title || '').replace(/"/g, '""')}"`,
    `"${(art.canvasSize || '').replace(/"/g, '""')}"`,
    `"${(art.materialLabel || '').replace(/"/g, '""')}"`,
    `"${art.year || ''}"`,
    `"${(art.imageName || '로컬 이미지').replace(/"/g, '""')}"`,
    `"${new Date(art.createdAt || Date.now()).toLocaleString('ko-KR')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = artworks.length === 1
    ? `작품관리대장_${artworks[0].artworkNumber}.csv`
    : `작품관리대장_${new Date().toISOString().slice(0, 10)}.csv`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

