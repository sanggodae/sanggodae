import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  X,
  Sparkles,
  Layers,
  ArrowRight,
  Download,
} from 'lucide-react';

export const APPS_SCRIPT_CODE = `/**
 * ==============================================================================
 * 미술 작가용 「작품관리대장」 자동 번호 생성 및 시트 자동화 Apps Script
 * ==============================================================================
 * 규칙: YY + Canvas Size + Material Code + "-" + 자동 일련번호
 * 예시: 2026년 / 030P / Acrylic on Canvas -> 26030PA-01
 * 
 * [특징]
 * 1. 행 순서 변경이나 삭제에도 기존 작품번호는 절대 변경되지 않음 (영구 보존)
 * 2. 동일한 [제작년도 + 규격 + 재료] 조합 내에서만 01, 02, 03... 순차 증가
 * 3. Title, Canvas Size, Material, 제작년도가 모두 입력된 순간 1회만 자동 생성
 * 4. 향후 Artist Portfolio Maker 웹앱과 연동 가능한 JSON Web API(doGet) 탑재
 * ==============================================================================
 */

// 재료별 코드 매핑 테이블
const MATERIAL_CODE_MAP = {
  'Acrylic on Canvas': 'A',
  'Oil on Canvas': 'O',
  'Mixed Material on Canvas': 'M',
  // 약칭 입력 대응
  'Acrylic': 'A',
  'Oil': 'O',
  'Mixed': 'M',
  'Mixed Material': 'M',
};

/**
 * 1. 스프레드시트 편집 시 자동 트리거 (작품번호 자동 생성)
 */
function onEdit(e) {
  if (!e) return;
  const range = e.range;
  const sheet = range.getSheet();
  
  // '작품관리대장' 시트가 아니면 실행 제외
  if (sheet.getName() !== '작품관리대장') return;
  
  const row = range.getRow();
  const col = range.getColumn();
  
  // 1행(헤더)이거나 데이터 행이 아니면 제외
  if (row <= 1) return;
  
  // C(Title:3), D(Canvas Size:4), E(Material:5), F(제작년도:6) 열이 수정될 때 검사
  if (col < 3 || col > 6) return;
  
  // 해당 행의 현재 B열(작품번호) 확인 - 이미 생성된 번호는 절대 덮어쓰지 않음
  const currentCode = sheet.getRange(row, 2).getValue().toString().trim();
  if (currentCode !== '') {
    return; // 이미 번호가 부여된 작품은 보호
  }
  
  // 해당 행의 입력값 가져오기 [A열, B열, C열, D열, E열, F열]
  const rowValues = sheet.getRange(row, 1, 1, 6).getValues()[0];
  const title = String(rowValues[2] || '').trim();
  const canvasSize = String(rowValues[3] || '').trim().toUpperCase();
  const material = String(rowValues[4] || '').trim();
  const yearVal = rowValues[5];
  
  // 4대 필수 조건 검사 (Title, Canvas Size, Material, 제작년도)
  if (!title || !canvasSize || !material || !yearVal) {
    return; // 아직 필수값이 모두 채워지지 않음
  }
  
  // 1) 제작년도 2자리 추출 (YY)
  let yearStr = String(yearVal).trim();
  if (yearStr.length >= 4) {
    yearStr = yearStr.slice(-2);
  } else if (yearStr.length === 2) {
    // 이미 2자리인 경우 그대로 사용
  } else {
    return;
  }
  
  // 2) 재료 코드 변환 (A, O, M)
  const matCode = MATERIAL_CODE_MAP[material] || 'A';
  
  // 3) 작품번호 접두사 생성 (예: 26030PA)
  const prefix = yearStr + canvasSize + matCode;
  
  // 4) 기존 전체 B열을 검색하여 동일 접두사의 최대 일련번호 산출
  const lastRow = sheet.getLastRow();
  let maxSeq = 0;
  
  if (lastRow >= 2) {
    const allCodes = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    const regex = new RegExp('^' + prefix + '-(\\\\d+)$', 'i');
    
    for (let i = 0; i < allCodes.length; i++) {
      const code = String(allCodes[i][0]).trim();
      if (!code) continue;
      const match = code.match(regex);
      if (match && match[1]) {
        const seqNum = parseInt(match[1], 10);
        if (seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    }
  }
  
  // 5) 다음 일련번호 부여 (01, 02, 03 ...)
  const nextSeq = maxSeq + 1;
  const seqPadded = nextSeq < 10 ? '0' + nextSeq : String(nextSeq);
  const finalArtworkNumber = prefix + '-' + seqPadded;
  
  // 6) B열에 작품번호 기록 & 서식 지정
  const cell = sheet.getRange(row, 2);
  cell.setValue(finalArtworkNumber);
  cell.setHorizontalAlignment('center');
  cell.setVerticalAlignment('middle');
  cell.setFontWeight('bold');
  cell.setFontFamily('Consolas');
}

/**
 * 2. 상단 메뉴 생성 (스프레드시트 열릴 때)
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎨 미술관 작품관리')
    .addItem('⚡ 1단계: 시트 자동 설정 (열너비/서식/드롭다운)', 'setupSheetsAutomatically')
    .addItem('🔍 2단계: 미부여 작품번호 일괄 생성', 'generateMissingArtworkNumbers')
    .addSeparator()
    .addItem('🌐 3단계: 포트폴리오 웹앱 연동 안내', 'showPortfolioIntegrationInfo')
    .addToUi();
}

/**
 * 3. [원클릭 자동 설정] 작품관리대장 및 설정 시트를 자동으로 완성
 */
function setupSheetsAutomatically() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // A. [설정] 시트 생성 또는 가져오기
  let configSheet = ss.getSheetByName('설정');
  if (!configSheet) {
    configSheet = ss.insertSheet('설정');
  }
  
  // 설정 시트 헤더 및 기본 데이터 세팅
  configSheet.getRange('A1:B1').setValues([['코드', 'Material']]);
  configSheet.getRange('A2:B4').setValues([
    ['A', 'Acrylic on Canvas'],
    ['O', 'Oil on Canvas'],
    ['M', 'Mixed Material on Canvas']
  ]);
  
  configSheet.getRange('D1').setValue('Canvas Size 목록');
  const standardSizes = [
    ['010F'], ['010P'], ['010M'],
    ['020F'], ['020P'], ['020M'],
    ['030F'], ['030P'], ['030M'],
    ['040F'], ['040P'], ['040M'],
    ['050F'], ['050P'], ['050M'],
    ['060F'], ['060P'], ['060M'],
    ['080F'], ['080P'], ['080M'],
    ['100F'], ['100P'], ['100M']
  ];
  configSheet.getRange(2, 4, standardSizes.length, 1).setValues(standardSizes);
  
  // 년도 목록 (2000 ~ 현재연도)
  configSheet.getRange('F1').setValue('제작년도 목록');
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 2000; y--) {
    years.push([y]);
  }
  configSheet.getRange(2, 6, years.length, 1).setValues(years);
  
  // B. [작품관리대장] 시트 설정
  let mainSheet = ss.getSheetByName('작품관리대장');
  if (!mainSheet) {
    mainSheet = ss.getSheets()[0];
    mainSheet.setName('작품관리대장');
  }
  
  // 1행 헤더 세팅
  const headers = [['작품이미지', '작품번호', 'Title', 'Canvas Size', 'Material', '제작년도']];
  mainSheet.getRange('A1:F1').setValues(headers);
  mainSheet.getRange('A1:F1')
    .setBackground('#1f2937')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setFontSize(10);
    
  // 1행 틀 고정 (Freeze)
  mainSheet.setFrozenRows(1);
  
  // 열 너비 조정 (작품 이미지가 잘 보이도록)
  mainSheet.setColumnWidth(1, 150); // A열: 작품이미지
  mainSheet.setColumnWidth(2, 130); // B열: 작품번호
  mainSheet.setColumnWidth(3, 220); // C열: Title
  mainSheet.setColumnWidth(4, 110); // D열: Canvas Size
  mainSheet.setColumnWidth(5, 190); // E열: Material
  mainSheet.setColumnWidth(6, 100); // F열: 제작년도
  
  // 행 높이 기본 80px로 설정 (작품 이미지가 여유있게 보이도록)
  mainSheet.setRowHeights(2, 50, 80);
  
  // 데이터 유효성 검사 (드롭다운) 설정
  // D열: Canvas Size
  const sizeRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(configSheet.getRange('D2:D25'), true)
    .setAllowInvalid(false)
    .build();
  mainSheet.getRange('D2:D1000').setDataValidation(sizeRule);
  
  // E열: Material
  const matRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(configSheet.getRange('B2:B4'), true)
    .setAllowInvalid(false)
    .build();
  mainSheet.getRange('E2:E1000').setDataValidation(matRule);
  
  // F열: 제작년도
  const yearRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(configSheet.getRange(2, 6, years.length, 1), true)
    .setAllowInvalid(false)
    .build();
  mainSheet.getRange('F2:F1000').setDataValidation(yearRule);
  
  // 정렬 스타일 적용
  mainSheet.getRange('A2:A1000').setHorizontalAlignment('center').setVerticalAlignment('middle');
  mainSheet.getRange('B2:B1000').setHorizontalAlignment('center').setVerticalAlignment('middle');
  mainSheet.getRange('C2:C1000').setHorizontalAlignment('left').setVerticalAlignment('middle');
  mainSheet.getRange('D2:D1000').setHorizontalAlignment('center').setVerticalAlignment('middle');
  mainSheet.getRange('E2:E1000').setHorizontalAlignment('center').setVerticalAlignment('middle');
  mainSheet.getRange('F2:F1000').setHorizontalAlignment('center').setVerticalAlignment('middle');
  
  SpreadsheetApp.getUi().alert('✅ 시트 자동 설정 완료!\\n\\n작품관리대장과 설정 시트의 헤더, 열 너비, 행 높이, 드롭다운이 완벽하게 구성되었습니다.');
}

/**
 * 4. [수동/일괄 실행] 미부여된 번호가 있을 때 일괄 채우기
 */
function generateMissingArtworkNumbers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('작품관리대장');
  if (!sheet) return;
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('작품 데이터가 없습니다.');
    return;
  }
  
  let createdCount = 0;
  for (let r = 2; r <= lastRow; r++) {
    const fakeEvent = {
      range: sheet.getRange(r, 3),
    };
    onEdit(fakeEvent);
  }
  
  SpreadsheetApp.getUi().alert('✅ 검증 완료!\\n필수 정보(Title, 규격, 재료, 년도)가 있는 행의 작품번호가 정상 등록되었습니다.');
}

/**
 * 5. Artist Portfolio Maker 웹앱 연동용 JSON Web API
 * (배포 -> 웹 앱으로 배포 시 활성화)
 */
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('작품관리대장');
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Sheet not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const lastRow = sheet.getLastRow();
  const data = [];
  if (lastRow >= 2) {
    const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row[1] && !row[2]) continue; // 번호와 제목 모두 없으면 제외
      data.push({
        imageUrl: String(row[0] || ''),
        artworkNumber: String(row[1] || ''),
        title: String(row[2] || ''),
        canvasSize: String(row[3] || ''),
        material: String(row[4] || ''),
        year: row[5] || ''
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    total: data.length,
    artworks: data,
    updatedAt: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function showPortfolioIntegrationInfo() {
  const msg = 'Artist Portfolio Maker 앱 연동 방법:\\n\\n' +
    '1. 상단 메뉴 [확장 프로그램] > [Apps Script] 창으로 이동합니다.\\n' +
    '2. 우측 상단 [배포] > [새 배포] 클릭\\n' +
    '3. 유형을 "웹 앱(Web App)"으로 선택 후 액세스 권한을 "모든 사용자(Anyone)"로 설정\\n' +
    '4. 발급된 웹앱 URL을 포트폴리오 앱에 입력하면 실시간으로 작품 데이터를 불러올 수 있습니다.';
  SpreadsheetApp.getUi().alert(msg);
}
`;

interface GoogleSheetsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsGuideModal: React.FC<GoogleSheetsGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'stepByStep' | 'script' | 'structure'>('stepByStep');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCSVTemplate = () => {
    const csvContent =
      '작품이미지,작품번호,Title,Canvas Size,Material,제작년도\n' +
      ',,새벽의 정원,030P,Acrylic on Canvas,2026\n' +
      ',,바다의 기억,050F,Oil on Canvas,2026\n' +
      ',,내면의 파동,030P,Mixed Material on Canvas,2025\n';

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '작품관리대장_초기템플릿.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl border border-neutral-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center space-x-2">
                <span>Google Sheets 작품관리대장 자동화 가이드</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded">
                  Apps Script 내장
                </span>
              </h2>
              <p className="text-xs text-neutral-500">
                작품번호 자동 생성(규칙: YY + 규격 + 재료코드 + "-01") 및 포트폴리오 연동 구조
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center px-5 pt-3 border-b border-neutral-200 bg-white space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('stepByStep')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'stepByStep'
                ? 'border-neutral-950 text-neutral-950'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            1. 초보자 11단계 구축 순서
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'script'
                ? 'border-neutral-950 text-neutral-950'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <span>2. Apps Script 전체 코드</span>
            <span className="px-1.5 py-0.2 bg-neutral-900 text-white text-[10px] rounded">
              복사 가능
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('structure')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'structure'
                ? 'border-neutral-950 text-neutral-950'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            3. 열 구조 및 자동번호 규칙
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-neutral-800 text-xs sm:text-sm">
          {activeTab === 'stepByStep' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3.5 flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 space-y-1">
                  <p className="font-bold">✨ 완전 자동화 안내</p>
                  <p className="text-emerald-800">
                    스크립트 안에 <strong>원클릭 자동 설정 기능(setupSheetsAutomatically)</strong>이 포함되어 있어,
                    스크립트를 붙여넣고 실행하면 <strong>헤더, 열 너비, 행 높이, 드롭다운</strong>이 1초 만에 자동 완성됩니다!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Step 1~6 */}
                <div className="space-y-3">
                  <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200">
                    <h4 className="font-bold text-neutral-900 mb-1 flex items-center space-x-1.5">
                      <span className="w-5 h-5 bg-neutral-900 text-white rounded-full text-[11px] flex items-center justify-center font-mono">
                        1
                      </span>
                      <span>Google Sheets 새로 만들기</span>
                    </h4>
                    <p className="text-xs text-neutral-600">
                      브라우저에서 <code className="bg-white px-1 border rounded">sheets.new</code>로 접속하여 새 스프레드시트를 생성합니다. (제목: <strong>미술관_작품관리대장</strong>)
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200">
                    <h4 className="font-bold text-neutral-900 mb-1 flex items-center space-x-1.5">
                      <span className="w-5 h-5 bg-neutral-900 text-white rounded-full text-[11px] flex items-center justify-center font-mono">
                        2
                      </span>
                      <span>첫 번째 시트 이름 변경</span>
                    </h4>
                    <p className="text-xs text-neutral-600">
                      하단 탭 '시트1'을 더블클릭하여 이름을 <strong>「작품관리대장」</strong>으로 변경합니다.
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200">
                    <h4 className="font-bold text-neutral-900 mb-1 flex items-center space-x-1.5">
                      <span className="w-5 h-5 bg-neutral-900 text-white rounded-full text-[11px] flex items-center justify-center font-mono">
                        3
                      </span>
                      <span>두 번째 시트 만들기</span>
                    </h4>
                    <p className="text-xs text-neutral-600">
                      하단 <code>+</code> 버튼을 눌러 시트를 추가하고 이름을 <strong>「설정」</strong>으로 입력합니다.
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200">
                    <h4 className="font-bold text-neutral-900 mb-1 flex items-center space-x-1.5">
                      <span className="w-5 h-5 bg-neutral-900 text-white rounded-full text-[11px] flex items-center justify-center font-mono">
                        4
                      </span>
                      <span>열 제목 설정하기</span>
                    </h4>
                    <p className="text-xs text-neutral-600">
                      '작품관리대장' 1행에 정확히 입력:<br />
                      <strong>A: 작품이미지 | B: 작품번호 | C: Title | D: Canvas Size | E: Material | F: 제작년도</strong>
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200">
                    <h4 className="font-bold text-neutral-900 mb-1 flex items-center space-x-1.5">
                      <span className="w-5 h-5 bg-neutral-900 text-white rounded-full text-[11px] flex items-center justify-center font-mono">
                        5~7
                      </span>
                      <span>드롭다운 만들기 (규격/재료/년도)</span>
                    </h4>
                    <p className="text-xs text-neutral-600">
                      '설정' 시트에 규격(010F~100M), 재료 3종(Acrylic, Oil, Mixed), 2000~2026 목록을 적고, [데이터] &gt; [데이터 확인]에서 드롭다운으로 연결합니다. (스크립트의 자동 설정을 쓰면 생략 가능)
                    </p>
                  </div>
                </div>

                {/* Step 8~11 */}
                <div className="space-y-3">
                  <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200">
                    <h4 className="font-bold text-neutral-900 mb-1 flex items-center space-x-1.5">
                      <span className="w-5 h-5 bg-neutral-900 text-white rounded-full text-[11px] flex items-center justify-center font-mono">
                        8
                      </span>
                      <span>Google Apps Script 열기</span>
                    </h4>
                    <p className="text-xs text-neutral-600">
                      상단 메뉴에서 <strong>[확장 프로그램] &gt; [Apps Script]</strong>를 클릭합니다. 새 편집기 탭이 열립니다.
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200">
                    <h4 className="font-bold text-neutral-900 mb-1 flex items-center space-x-1.5">
                      <span className="w-5 h-5 bg-neutral-900 text-white rounded-full text-[11px] flex items-center justify-center font-mono">
                        9
                      </span>
                      <span>전체 코드 붙여넣기</span>
                    </h4>
                    <p className="text-xs text-neutral-600">
                      <code>Code.gs</code> 기존 내용을 모두 지우고, 위 [2. Apps Script 전체 코드] 탭의 코드를 복사하여 그대로 붙여넣습니다.
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200">
                    <h4 className="font-bold text-neutral-900 mb-1 flex items-center space-x-1.5">
                      <span className="w-5 h-5 bg-neutral-900 text-white rounded-full text-[11px] flex items-center justify-center font-mono">
                        10
                      </span>
                      <span>저장 및 원클릭 자동 설정 실행</span>
                    </h4>
                    <p className="text-xs text-neutral-600">
                      상단 디스켓 아이콘(저장) 클릭 후, 시트로 돌아와 새로고침하면 상단에 <strong>[🎨 미술관 작품관리]</strong> 메뉴가 생깁니다. <br />
                      <strong>[1단계: 시트 자동 설정]</strong>을 클릭하고 Google 권한을 1회 승인합니다.
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200">
                    <h4 className="font-bold text-neutral-900 mb-1 flex items-center space-x-1.5">
                      <span className="w-5 h-5 bg-neutral-900 text-white rounded-full text-[11px] flex items-center justify-center font-mono">
                        11
                      </span>
                      <span>3개 작품 입력하여 자동번호 테스트</span>
                    </h4>
                    <div className="text-[11px] text-neutral-700 bg-white p-2 rounded border border-neutral-200 font-mono mt-1 space-y-0.5">
                      <div>1행: 2026 / 030P / Acrylic ➔ <strong>26030PA-01</strong></div>
                      <div>2행: 2026 / 030P / Acrylic ➔ <strong>26030PA-02</strong></div>
                      <div>3행: 2026 / 030P / Oil ➔ <strong>26030PO-01</strong></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap items-center justify-between pt-2 border-t border-neutral-200 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCSVTemplate}
                  className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-md font-medium text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>초기 CSV 템플릿 다운로드</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('script')}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <span>Apps Script 전체 코드 보러가기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500 font-medium">
                  Google Apps Script 편집기(Code.gs)에 그대로 붙여넣으세요:
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '전체 코드 복사 완료!' : '전체 코드 복사'}</span>
                </button>
              </div>

              <div className="relative rounded-md border border-neutral-800 bg-neutral-950 p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-[500px]">
                <pre>{APPS_SCRIPT_CODE}</pre>
              </div>
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-neutral-900 mb-2">1. 열 구성 및 기준</h4>
                <div className="overflow-x-auto border border-neutral-200 rounded">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-100 border-b border-neutral-200 font-semibold">
                        <th className="p-2 border-r">열</th>
                        <th className="p-2 border-r">항목명</th>
                        <th className="p-2 border-r">정렬</th>
                        <th className="p-2">역할 및 규칙</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      <tr>
                        <td className="p-2 font-mono font-bold border-r">A열</td>
                        <td className="p-2 font-semibold border-r">작품이미지</td>
                        <td className="p-2 border-r">가운데</td>
                        <td className="p-2">작품 이미지 등록 (셀 내 이미지 삽입 또는 URL 링크)</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono font-bold border-r">B열</td>
                        <td className="p-2 font-semibold border-r text-emerald-700">작품번호</td>
                        <td className="p-2 border-r font-mono">가운데</td>
                        <td className="p-2 font-medium">
                          <strong>자동 생성 (사용자 직접 입력 금지)</strong> — YY + 규격 + 재료코드 + "-01"
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono font-bold border-r">C열</td>
                        <td className="p-2 font-semibold border-r">Title</td>
                        <td className="p-2 border-r">왼쪽</td>
                        <td className="p-2">작품 제목 직접 입력 (필수)</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono font-bold border-r">D열</td>
                        <td className="p-2 font-semibold border-r">Canvas Size</td>
                        <td className="p-2 border-r font-mono">가운데</td>
                        <td className="p-2">설정 시트 드롭다운 연동 (010F ~ 100M)</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono font-bold border-r">E열</td>
                        <td className="p-2 font-semibold border-r">Material</td>
                        <td className="p-2 border-r">가운데</td>
                        <td className="p-2">Acrylic on Canvas(A), Oil on Canvas(O), Mixed Material(M)</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono font-bold border-r">F열</td>
                        <td className="p-2 font-semibold border-r">제작년도</td>
                        <td className="p-2 border-r font-mono">가운데</td>
                        <td className="p-2">2000년 ~ 현재 연도 선택 드롭다운</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-neutral-900 mb-2">2. 작품번호 생성 공식</h4>
                <div className="p-3 bg-neutral-50 rounded border border-neutral-200 font-mono text-xs space-y-1">
                  <div className="font-bold text-neutral-900 text-sm">
                    YY + Canvas Size + Material Code + "-" + 자동 일련번호(01, 02...)
                  </div>
                  <div className="text-neutral-600">
                    • 2026년 / 030P / Acrylic on Canvas ➔ <strong>26030PA-01</strong>
                  </div>
                  <div className="text-neutral-600">
                    • 2026년 / 030P / Oil on Canvas ➔ <strong>26030PO-01</strong>
                  </div>
                  <div className="text-neutral-600">
                    • 2025년 / 050F / Mixed Material on Canvas ➔ <strong>25050FM-01</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs text-neutral-500">
          <span>Artist Portfolio Maker · Google Sheets 작품관리대장 연동 규격</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 text-white rounded font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
