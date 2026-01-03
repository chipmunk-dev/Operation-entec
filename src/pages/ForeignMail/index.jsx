import { useEffect, useState } from 'react';
import { IoMdCopy } from 'react-icons/io';
import { MdEmail } from 'react-icons/md';

function ForeignMail() {
  const [mails, setMails] = useState([]);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  // 입력 컬럼의 데이터 타입 순서를 저장하는 상태: [컬럼1 데이터타입, 컬럼2 데이터타입, ...]
  const [inputColumnOrder, setInputColumnOrder] = useState(['host', 'message', 'date', 'ip']); // 기본 순서
  // 설정 영역 보이기/숨기기 상태
  const [showSettings, setShowSettings] = useState(false);

  const handleChange = (e) => {
    const value = e.target.value;
    setMails(value.split('\n'));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const makeMessages = mails.reduce((acc, mail, mailIdx) => {
      if (mail.trim() === '') return acc;

      const columns = mail.split('\t');
      const parsedData = {};

      // inputColumnOrder 배열의 순서에 따라 columns 배열의 데이터를 매핑
      inputColumnOrder.forEach((dataType, index) => {
        // index가 유효한지, columns 배열 범위 내에 있는지 확인
        parsedData[dataType] = (columns.length > index && index >= 0) ? columns[index] : '';
      });

      // message는 순서 상관없이 클리닝 및 undefined/null 체크
      const cleanedMessage = (parsedData.message || '').replace(/\[202.*/g, '');

      const messages = mailIdx === 0 ? `-----------------------------------------------------------
Date: ${parsedData.date} (Base On Korea Time)
IP: ${parsedData.ip}
Host: ${parsedData.host}
Message: ${cleanedMessage}
-----------------------------------------------------------
` : `Date: ${parsedData.date} (Base On Korea Time)
IP: ${parsedData.ip}
Host: ${parsedData.host}
Message: ${cleanedMessage}
-----------------------------------------------------------
`;
      acc += messages;
      return acc;
    }, '');

    const result = `Dear!
This is KIC Control office in Korea.
Monitoring System detected warning message(s) from your server.
Please check following message(s).

${makeMessages}

Thank you.`;

    setResult(result);
  }, [mails, inputColumnOrder]); // inputColumnOrder 변경 시 useEffect 실행

  // 컬럼 선택 드롭다운 변경 핸들러 (인덱스 스와핑 로직)
  const handleColumnSelectChange = (currentIndex) => (e) => {
    const selectedDataType = e.target.value; // 사용자가 선택한 데이터 타입 (예: 'ip')
    const currentDataType = inputColumnOrder[currentIndex]; // 현재 드롭다운에 표시된 데이터 타입 (예: 'message')

    // 선택한 데이터 타입이 현재 위치와 동일하면 변경 없음
    if (selectedDataType === currentDataType) {
      return;
    }

    // 선택한 데이터 타입이 현재 inputColumnOrder 배열에서 어디에 있는지 찾음
    const targetIndex = inputColumnOrder.findIndex(type => type === selectedDataType);

    if (targetIndex === -1) {
      // 선택한 데이터 타입을 찾을 수 없는 경우 (발생해서는 안됨)
      console.error(`Selected data type ${selectedDataType} not found in current order.`);
      return;
    }

    // 새로운 순서 배열 생성
    const newInputColumnOrder = [...inputColumnOrder];

    // 현재 위치의 데이터 타입을, 선택한 데이터 타입이 있던 위치로 이동
    newInputColumnOrder[targetIndex] = currentDataType;
    // 현재 위치에 선택한 데이터 타입 설정
    newInputColumnOrder[currentIndex] = selectedDataType;

    // 상태 업데이트
    setInputColumnOrder(newInputColumnOrder);
  };

  // 데이터 타입 라벨을 보기 좋게 변환하는 함수
  const formatDataTypeLabel = (dataType) => {
    switch (dataType) {
      case 'host': return 'Host';
      case 'message': return 'Message';
      case 'date': return 'Date';
      case 'ip': return 'Ip';
      default: return dataType;
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-4">
        <MdEmail className="text-4xl text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-800">
          해외메일 포맷 변환기
        </h1>
      </div>

      {/* 설정 보이기/숨기기 토글 버튼 */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="mb-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm"
      >
        {showSettings ? '▲ 입력 순서 설정 숨기기' : '▼ 입력 순서 설정'}
      </button>

      {/* 입력 순서 설정 영역 (조건부 렌더링) */}
      {showSettings && (
        <div className="mt-2 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
          <p className="font-semibold text-blue-900 mb-4">※ 입력 데이터 컬럼 순서 설정:</p>
          <p className="mt-1 text-sm mb-4">붙여넣기 할 데이터에서 각 컬럼(열)에 해당하는 데이터 타입을 순서대로 선택해주세요.</p>

          {/* 컬럼 선택 드롭다운들을 가로로 정렬 */}
          <div className="flex justify-around gap-4">
            {inputColumnOrder.map((dataType, index) => (
              <div key={index} className="flex flex-col items-center">
                <select
                  id={`column${index}Select`}
                  value={dataType} // 드롭다운의 현재 값은 해당 인덱스의 데이터 타입
                  onChange={handleColumnSelectChange(index)} // 변경 핸들러에 현재 인덱스 전달
                  className="mt-1 block w-full px-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-gray-900 text-center"
                  style={{ minWidth: '100px' }} // 이미지에 맞춰 최소 너비 조정
                >
                  {/* 모든 데이터 타입 옵션 */}
                  {['host', 'message', 'date', 'ip'].map(optionType => (
                    <option key={optionType} value={optionType}>
                      {formatDataTypeLabel(optionType)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="rawDataInput" className="block text-sm font-medium text-gray-700 mb-2">
          원본 데이터를 입력하세요
        </label>
        <textarea
          id="rawDataInput" // id 추가
          className="w-full h-48 p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
          onChange={handleChange}
          placeholder="여기에 데이터를 붙여넣으세요... (탭으로 구분된 데이터)"
        />
      </div>

      {result && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 mb-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <IoMdCopy />
            {copied ? '복사완료!' : '결과 복사하기'}
          </button>
          <div
            className="bg-gray-50 p-4 rounded-lg border border-gray-200"
            style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
          >
            {result}
          </div>
        </div>
      )}
    </div>
  );
}

export default ForeignMail;