import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Sparkles,
  Save,
  Check,
  RefreshCw,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  createPortfolioSpreadsheet,
  appendArtworkToSpreadsheet,
  SpreadsheetInfo,
} from '../services/googleSheets';
import { GeneratedPortfolioData } from '../types';

interface GoogleSheetsSyncManagerProps {
  currentPortfolio: GeneratedPortfolioData | null;
  onSaveSuccess?: (spreadsheetUrl: string) => void;
}

export const GoogleSheetsSyncManager: React.FC<GoogleSheetsSyncManagerProps> = ({
  currentPortfolio,
  onSaveSuccess,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  // Spreadsheet state (ID cached in localStorage so user can keep saving to the same sheet)
  const [currentSheet, setCurrentSheet] = useState<SpreadsheetInfo | null>(() => {
    try {
      const saved = localStorage.getItem('artist_portfolio_sheet');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isCreatingSheet, setIsCreatingSheet] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirmation modal state (Mandatory per Google Workspace integration guidelines)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'create' | 'save';
    title: string;
    description: string;
  }>({
    isOpen: false,
    type: 'save',
    title: '',
    description: '',
  });

  // Track saved artworks in this session to prevent duplicate clicks
  const [savedArtworkNumbers, setSavedArtworkNumbers] = useState<Set<string>>(new Set());

  // Listen for auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, authToken) => {
        setUser(authUser);
        setToken(authToken);
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      setUser(res.user);
      setToken(res.accessToken);
    } catch (err: any) {
      setErrorMessage(err.message || '구글 로그인 중 오류가 발생했습니다.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  // 1. Request to create a new spreadsheet (triggers confirmation dialog)
  const requestCreateSheet = () => {
    if (!token) {
      handleSignIn();
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'create',
      title: '새 구글 시트 생성 확인',
      description:
        'Google Drive에 미술 작가용 새 스프레드시트 「미술관 작품관리대장」을 새로 만들고 헤더 서식을 자동 구성하시겠습니까?',
    });
  };

  // 2. Request to save current portfolio (triggers confirmation dialog)
  const requestSaveArtwork = () => {
    if (!currentPortfolio) return;
    if (!token) {
      handleSignIn();
      return;
    }

    if (!currentSheet) {
      setConfirmModal({
        isOpen: true,
        type: 'create',
        title: '새 구글 시트 생성 및 저장 확인',
        description:
          '저장할 구글 시트가 없습니다. Google Drive에 새 구글 시트 「미술관 작품관리대장」을 새로 생성한 후, 현재 작품(' +
          currentPortfolio.artworkNumber +
          ' · ' +
          currentPortfolio.title +
          ')을 첫 번째 행으로 저장하시겠습니까?',
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: 'save',
      title: '구글 시트 작품 저장 확인',
      description: `구글 시트 「${currentSheet.title}」에 현재 작품 [${currentPortfolio.artworkNumber}] "${currentPortfolio.title}"을 새로운 행으로 추가(Append)하시겠습니까?`,
    });
  };

  // Execute confirmed operation
  const executeConfirmedAction = async () => {
    const actionType = confirmModal.type;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    setErrorMessage(null);
    setSaveSuccessMsg(null);

    let activeToken = token;
    if (!activeToken) {
      try {
        const signRes = await googleSignIn();
        activeToken = signRes.accessToken;
        setUser(signRes.user);
        setToken(activeToken);
      } catch (err: any) {
        setErrorMessage(err.message || '인증이 필요합니다.');
        return;
      }
    }

    if (actionType === 'create') {
      setIsCreatingSheet(true);
      try {
        const newSheet = await createPortfolioSpreadsheet(activeToken);
        setCurrentSheet(newSheet);
        localStorage.setItem('artist_portfolio_sheet', JSON.stringify(newSheet));

        // If a portfolio was ready to be saved, append it right away
        if (currentPortfolio) {
          await appendArtworkToSpreadsheet(activeToken, newSheet.spreadsheetId, currentPortfolio);
          setSavedArtworkNumbers((prev) => new Set(prev).add(currentPortfolio.artworkNumber));
          setSaveSuccessMsg(
            `새 구글 시트가 생성되었으며, 작품 [${currentPortfolio.artworkNumber}]이 성공적으로 저장되었습니다!`
          );
        } else {
          setSaveSuccessMsg('새 구글 시트 「미술관 작품관리대장」이 생성되었습니다!');
        }

        if (onSaveSuccess) onSaveSuccess(newSheet.spreadsheetUrl);
      } catch (err: any) {
        setErrorMessage(err.message || '구글 시트 생성 실패');
      } finally {
        setIsCreatingSheet(false);
      }
    } else if (actionType === 'save') {
      if (!currentSheet || !currentPortfolio) return;
      setIsSaving(true);
      try {
        await appendArtworkToSpreadsheet(
          activeToken,
          currentSheet.spreadsheetId,
          currentPortfolio
        );
        setSavedArtworkNumbers((prev) => new Set(prev).add(currentPortfolio.artworkNumber));
        setSaveSuccessMsg(
          `구글 시트에 [${currentPortfolio.artworkNumber}] "${currentPortfolio.title}" 저장 완료!`
        );
        if (onSaveSuccess) onSaveSuccess(currentSheet.spreadsheetUrl);
      } catch (err: any) {
        setErrorMessage(err.message || '구글 시트 저장 실패');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const isAlreadySaved =
    currentPortfolio && savedArtworkNumbers.has(currentPortfolio.artworkNumber);

  return (
    <div className="no-print w-full bg-white rounded-lg border border-neutral-200 shadow-xs p-4 sm:p-5 text-neutral-900 transition-all">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-neutral-100 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-2xs shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 flex items-center space-x-1.5">
              <span>내 구글 시트(Google Sheets) 자동 저장</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded">
                실시간 연동
              </span>
            </h3>
            <p className="text-xs text-neutral-500">
              포트폴리오 생성 결과를 내 Google Drive의 새 스프레드시트에 지속적으로 누적 저장합니다.
            </p>
          </div>
        </div>

        {/* User Auth Section */}
        <div className="flex items-center space-x-2">
          {isAuthLoading ? (
            <div className="flex items-center space-x-1 text-xs text-neutral-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>확인 중...</span>
            </div>
          ) : user ? (
            <div className="flex items-center space-x-2 bg-neutral-50 border border-neutral-200 rounded-md px-2.5 py-1">
              <div className="w-5 h-5 rounded-full bg-neutral-800 text-white text-[10px] font-bold flex items-center justify-center">
                {user.displayName ? user.displayName[0] : 'U'}
              </div>
              <span className="text-xs font-medium text-neutral-800 truncate max-w-[120px] sm:max-w-[160px]">
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-neutral-400 hover:text-neutral-600 p-0.5 cursor-pointer"
                title="로그아웃"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            /* Official Google Sign-In Button */
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="flex items-center space-x-2 px-3 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 rounded-md text-xs font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isSigningIn ? '로그인 중...' : 'Google 계정 연결'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="pt-3.5 space-y-3">
        {/* Active Spreadsheet Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md bg-neutral-50 border border-neutral-200 gap-2">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-neutral-800">
                  {currentSheet ? currentSheet.title : '연결된 구글 시트 없음'}
                </span>
                {currentSheet && (
                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded">
                    활성
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500">
                {currentSheet
                  ? '작품번호 자동 생성 및 포트폴리오 정보가 이 시트에 지속적으로 추가됩니다.'
                  : '아래 버튼을 눌러 내 Google Drive에 새 구글 시트를 만들어 연결하세요.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {currentSheet ? (
              <>
                <a
                  href={currentSheet.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 rounded text-xs font-medium flex items-center space-x-1 transition-colors"
                >
                  <span>Google Sheets에서 열기</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={requestCreateSheet}
                  disabled={isCreatingSheet}
                  className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-medium transition-colors cursor-pointer"
                  title="다른 새 시트 만들기"
                >
                  {isCreatingSheet ? '생성 중...' : '+ 다른 새 시트 만들기'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={requestCreateSheet}
                disabled={isCreatingSheet}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isCreatingSheet ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>새 구글 시트 생성하기</span>
              </button>
            )}
          </div>
        </div>

        {/* Current Portfolio Action Bar */}
        {currentPortfolio && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-md bg-emerald-50/60 border border-emerald-200 gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-neutral-900">
                  현재 생성된 포트폴리오 작품:
                </span>
                <span className="font-mono text-xs font-bold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
                  {currentPortfolio.artworkNumber}
                </span>
                <span className="text-xs text-neutral-700 font-medium">
                  {currentPortfolio.title}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                {currentPortfolio.canvasSize} · {currentPortfolio.materialLabel} · {currentPortfolio.year}년작
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={requestSaveArtwork}
                disabled={isSaving || Boolean(isAlreadySaved)}
                className={`px-4 py-2 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer ${
                  isAlreadySaved
                    ? 'bg-neutral-200 text-neutral-600 cursor-not-allowed'
                    : 'bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-950 text-white'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>저장 중...</span>
                  </>
                ) : isAlreadySaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>구글 시트에 저장 완료됨</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>
                      {currentSheet ? '내 구글 시트에 저장하기' : '새 구글 시트 만들고 저장'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center space-x-2 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{saveSuccessMsg}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2 text-xs text-red-900">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MANDATORY USER CONFIRMATION DIALOG (Workspace Integration)  */}
      {/* ============================================================ */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="bg-white rounded-lg shadow-2xl border border-neutral-200 w-full max-w-md p-5 text-neutral-900 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900">{confirmModal.title}</h4>
                <p className="text-xs text-neutral-500">Google Sheets 연동 데이터 저장 확인</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-neutral-700 bg-neutral-50 p-3 rounded border border-neutral-200 leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>진행 및 저장 승인</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
