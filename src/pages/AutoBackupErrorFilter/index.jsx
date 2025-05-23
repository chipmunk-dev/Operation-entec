import React, { useState, useEffect } from 'react';
import { IoMdCopy } from 'react-icons/io';

// 날짜 형식을 YYYY-MM-DD HH:MM (24시간)으로 변환하는 헬퍼 함수
const formatBackupTime = (timeStr) => {
  if (!timeStr) return 'Unknown Time';

  let year, month, day, hour, minute;

  // 'YYYY. M. D 오후/오전 H:MM:SS' 형식 처리
  const koreanFormatMatch = timeStr.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\s*(오전|오후)\s*(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (koreanFormatMatch) {
    year = koreanFormatMatch[1];
    month = parseInt(koreanFormatMatch[2], 10);
    day = parseInt(koreanFormatMatch[3], 10);
    hour = parseInt(koreanFormatMatch[5], 10);
    minute = parseInt(koreanFormatMatch[6], 10);
    const ampm = koreanFormatMatch[4];

    if (ampm === '오후' && hour !== 12) {
      hour += 12;
    } else if (ampm === '오전' && hour === 12) {
      hour = 0; // 자정 (12 AM)은 0시
    }

  } else {
    // 'Month Day, YYYY H:MM:SS AM/PM' 형식 처리
    const englishFormatMatch = timeStr.match(/(\w{3})\s*(\d{1,2}),\s*(\d{4})\s*(\d{1,2}):(\d{1,2}):(\d{1,2})\s*(AM|PM)/);
    if (englishFormatMatch) {
      const monthNames = {
        Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
        Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
      };
      year = englishFormatMatch[3];
      month = monthNames[englishFormatMatch[1]];
      day = parseInt(englishFormatMatch[2], 10);
      hour = parseInt(englishFormatMatch[4], 10);
      minute = parseInt(englishFormatMatch[5], 10);
      const ampm = englishFormatMatch[7];

      if (ampm === 'PM' && hour !== 12) {
        hour += 12;
      } else if (ampm === 'AM' && hour === 12) {
        hour = 0; // 자정 (12 AM)은 0시
      }
    } else {
      // 예상치 못한 다른 형식일 경우 원본 반환 또는 오류 표시
      console.warn("Unexpected date format:", timeStr);
      return timeStr; // 또는 'Invalid Time Format'
    }
  }

  // Date 객체를 사용하여 형식을 맞춤 (월은 0-based이므로 1을 빼줌)
  // 주의: 이 Date 생성자는 시간대 문제를 일으킬 수 있으나, 현재 문자열 파싱 기반이므로 큰 문제는 없을 것으로 예상
  // 시, 분 정보만 필요하므로 초는 사용하지 않음
  const dateObj = new Date(year, month - 1, day, hour, minute);

  const pad = (num) => num.toString().padStart(2, '0');

  // YYYY-MM-DD HH:MM 형식으로 반환
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
};

function AutoBackupErrorFilter() {
  const [inputText1, setInputText1] = useState('');
  const [filteredText1, setFilteredText1] = useState([]);
  const [inputText2, setInputText2] = useState('');
  const [filteredText2, setFilteredText2] = useState([]);
  const [inputText3, setInputText3] = useState('');
  const [filteredText3, setFilteredText3] = useState([]);

  const filterErrorPolicies = (text) => {
    if (!text || text.trim() === '') {
      return [];
    }

    const lines = text.split('\n');
    const errorPolicies = lines.filter(line => {
      // 헤더 라인 또는 빈 라인 스킵
      if (line.trim() === '' || line.startsWith('[')) return false;
      const columns = line.split('\t');
      // 세 번째 열(인덱스 2)의 값이 '0' 또는 '1'이 아닌 경우 에러로 간주
      // 최소한 필요한 컬럼 개수 확인 (예: 에러 코드, 정책 이름, 시작 시간 컬럼까지)
      // 정책 이름 인덱스 6, 시작 시간 인덱스 8이므로 최소 9개 컬럼 필요
      return columns.length > 8 && columns[2] !== '0' && columns[2] !== '1';
    }).map(line => {
      const columns = line.split('\t');
      // 세 번째 열(인덱스 2)은 에러 코드, 일곱 번째 열(인덱스 6)은 정책 이름, 아홉 번째 열(인덱스 8)은 백업 시작 시간
      const errorCode = columns.length > 2 ? columns[2] : 'Unknown Error Code';
      const policyName = columns.length > 6 ? columns[6] : 'Unknown Policy';
      const startTime = columns.length > 8 ? columns[8] : 'Unknown Time';

      // 시작 시간을 원하는 형식으로 변환
      const formattedStartTime = formatBackupTime(startTime);

      // 객체 형태로 반환
      return { errorCode, policyName, startTime: formattedStartTime };
    });

    return errorPolicies;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // 복사 성공 시 사용자에게 알림 (선택 사항)
        console.log('Copied to clipboard:', text);
        // 예: 작은 팝업 메시지를 띄우거나, 버튼 텍스트를 '복사됨!'으로 변경
      })
      .catch(err => {
        // 복사 실패 시 오류 처리 (선택 사항)
        console.error('Failed to copy:', err);
      });
  };

  useEffect(() => {
    setFilteredText1(filterErrorPolicies(inputText1));
  }, [inputText1]);

  useEffect(() => {
    setFilteredText2(filterErrorPolicies(inputText2));
  }, [inputText2]);

  useEffect(() => {
    setFilteredText3(filterErrorPolicies(inputText3));
  }, [inputText3]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">자동 백업 에러 필터</h1>

      <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-md text-yellow-800 mb-8">
        <p className="font-bold text-lg">※ 중요: 데이터 입력 전 확인해주세요!</p>
        <p className="mt-2">백업존에서 데이터를 그대로 복사하여 붙여넣어주세요.</p>
        <p className="mt-2">정상종료된 백업과 에러가 발생한 백업 다 넣어도 상관없습니다.(Status코드 2이상 발생한 백업 데이터만 필터링 됩니다.)</p>
        <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded-md text-red-800 mb-8"> {/* 배경색과 테두리를 빨간색 계열로 변경하여 경고 느낌 강조 */}
          <p className="font-bold text-xl mb-2">🚨 매우 중요: 데이터 컬럼 순서를 반드시 확인하세요! 🚨</p> {/* 제목을 더 크고 강조되게 변경 */}
          <p className="mt-2">입력하시는 백업 리스트 데이터의 <strong className="text-red-900">컬럼 순서가 정확히 일치해야만</strong> 정상적으로 필터링됩니다.</p> {/* 핵심 내용을 더 강하게 표현 */}
          <p className="mt-2">필요한 컬럼 순서는 다음과 같습니다 (최소한 백업 시작 시간까지의 9번째 컬럼까지 데이터가 있어야 합니다):</p>
          <p className="ml-4 font-mono text-base bg-red-200 p-3 rounded border border-red-300">[ID], [작업 종류], [상태 코드], [상태], [미확인1], [미확인2], [정책 이름], [소스/클라이언트], [백업 시작 시간], ...</p> {/* 컬럼 목록 배경색 변경 및 패딩 증가 */}
          <p className="mt-3 font-bold text-xl text-red-900">☝️ 위 순서대로 컬럼을 정렬하신 후 데이터를 복사/붙여넣기 해주세요. (절대 필수!)</p> {/* 최종 지시사항을 더 크고 강하게 강조 */}
        </div>
      </div>

      {/* 입력창 섹션들 */}
      <div className="mb-8">
        {/* 첫 번째 백업 존 입력 */}
        <div className="w-full px-4 mb-4 mx-auto max-w-screen-lg">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">[P-EUBKMST]</h2>
          <textarea
            id="inputText1"
            className="w-full h-32 p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-border-blue-500 resize-none transition-all"
            onChange={(e) => setInputText1(e.target.value)}
            placeholder="여기에 백업 정책 리스트를 붙여넣으세요... (P-EUBKMST)"
            value={inputText1}
          />
        </div>

        {/* 두 번째 백업 존 입력 */}
        <div className="w-full px-4 mb-4 mx-auto max-w-screen-lg">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">[NBUMASTER]</h2>
          <textarea
            id="inputText2"
            className="w-full h-32 p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
            onChange={(e) => setInputText2(e.target.value)}
            placeholder="여기에 백업 정책 리스트를 붙여넣으세요... (NBUMASTER)"
            value={inputText2}
          />
        </div>

        {/* 세 번째 백업 존 입력 */}
        <div className="w-full px-4 mb-4 mx-auto max-w-screen-lg">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">[EXTMASTER]</h2>
          <textarea
            id="inputText3"
            className="w-full h-32 p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
            onChange={(e) => setInputText3(e.target.value)}
            placeholder="여기에 백업 정책 리스트를 붙여넣으세요... (EXTMASTER)"
            value={inputText3}
          />
        </div>
      </div>

      {/* 결과창 섹션들을 가로로 정렬 */}
      <div className="flex space-x-4">
        {/* 첫 번째 백업 존 결과 */}
        {filteredText1.length > 0 && (
          <div className="w-1/3 p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">에러 필터 결과 [P-EUBKMST]</h3>
            {/* 결과 목록들을 가로로 정렬 */}
            <div className="flex justify-between space-x-4">
              {/* 정책 이름 목록 */}
              <div className="w-1/3 flex flex-col">
                <h4 className="font-semibold mb-2 text-center">정책 이름</h4>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto mb-2 flex-grow">
                  {filteredText1.map(policy => policy.policyName).join('\n')}
                </div>
                <button
                  onClick={() => copyToClipboard(filteredText1.map(p => p.policyName).join('\n'))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm w-full"
                >
                  복사
                </button>
              </div>

              {/* 백업 시작 시간 목록 */}
              <div className="w-1/3 flex flex-col">
                <h4 className="font-semibold mb-2 text-center">백업 시작 시간</h4>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto mb-2 flex-grow">
                  {filteredText1.map(policy => policy.startTime).join('\n')}
                </div>
                <button
                  onClick={() => copyToClipboard(filteredText1.map(p => p.startTime).join('\n'))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm w-full"
                >
                  복사
                </button>
              </div>

              {/* 에러 코드 목록 */}
              <div className="w-1/3 flex flex-col">
                <h4 className="font-semibold mb-2 text-center">에러 코드</h4>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto mb-2 flex-grow">
                  {filteredText1.map(policy => policy.errorCode).join('\n')}
                </div>
                <button
                  onClick={() => copyToClipboard(filteredText1.map(p => p.errorCode).join('\n'))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm w-full"
                >
                  복사
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 두 번째 백업 존 결과 */}
        {filteredText2.length > 0 && (
          <div className="w-1/3 p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">에러 필터 결과 [NBUMASTER]</h3>
            {/* 결과 목록들을 가로로 정렬 */}
            <div className="flex justify-between space-x-4">
              {/* 정책 이름 목록 */}
              <div className="w-1/3 flex flex-col">
                <h4 className="font-semibold mb-2 text-center">정책 이름</h4>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto mb-2 flex-grow">
                  {filteredText2.map(policy => policy.policyName).join('\n')}
                </div>
                <button
                  onClick={() => copyToClipboard(filteredText2.map(p => p.policyName).join('\n'))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm w-full"
                >
                  복사
                </button>
              </div>

              {/* 백업 시작 시간 목록 */}
              <div className="w-1/3 flex flex-col">
                <h4 className="font-semibold mb-2 text-center">백업 시작 시간</h4>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto mb-2 flex-grow">
                  {filteredText2.map(policy => policy.startTime).join('\n')}
                </div>
                <button
                  onClick={() => copyToClipboard(filteredText2.map(p => p.startTime).join('\n'))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm w-full"
                >
                  복사
                </button>
              </div>

              {/* 에러 코드 목록 */}
              <div className="w-1/3 flex flex-col">
                <h4 className="font-semibold mb-2 text-center">에러 코드</h4>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto mb-2 flex-grow">
                  {filteredText2.map(policy => policy.errorCode).join('\n')}
                </div>
                <button
                  onClick={() => copyToClipboard(filteredText2.map(p => p.errorCode).join('\n'))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm w-full"
                >
                  복사
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 세 번째 백업 존 결과 */}
        {filteredText3.length > 0 && (
          <div className="w-1/3 p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">에러 필터 결과 [EXTMASTER]</h3>
            {/* 결과 목록들을 가로로 정렬 */}
            <div className="flex justify-between space-x-4">
              {/* 정책 이름 목록 */}
              <div className="w-1/3 flex flex-col">
                <h4 className="font-semibold mb-2 text-center">정책 이름</h4>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto mb-2 flex-grow">
                  {filteredText3.map(policy => policy.policyName).join('\n')}
                </div>
                <button
                  onClick={() => copyToClipboard(filteredText3.map(p => p.policyName).join('\n'))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm w-full"
                >
                  복사
                </button>
              </div>

              {/* 백업 시작 시간 목록 */}
              <div className="w-1/3 flex flex-col">
                <h4 className="font-semibold mb-2 text-center">백업 시작 시간</h4>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto mb-2 flex-grow">
                  {filteredText3.map(policy => policy.startTime).join('\n')}
                </div>
                <button
                  onClick={() => copyToClipboard(filteredText3.map(p => p.startTime).join('\n'))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm w-full"
                >
                  복사
                </button>
              </div>

              {/* 에러 코드 목록 */}
              <div className="w-1/3 flex flex-col">
                <h4 className="font-semibold mb-2 text-center">에러 코드</h4>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto mb-2 flex-grow">
                  {filteredText3.map(policy => policy.errorCode).join('\n')}
                </div>
                <button
                  onClick={() => copyToClipboard(filteredText3.map(p => p.errorCode).join('\n'))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm w-full"
                >
                  복사
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AutoBackupErrorFilter; 