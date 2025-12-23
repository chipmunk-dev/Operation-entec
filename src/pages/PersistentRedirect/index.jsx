import { useEffect, useState } from 'react';
import { IoMdCopy } from 'react-icons/io';
import { FaCheck, FaUndo, FaListUl, FaCheckDouble, FaEnvelope, FaCommentDots, FaPaperPlane, FaExclamationCircle } from 'react-icons/fa';

function PersistentRedirect() {
  const [inputs, setInputs] = useState([]);
  const [processedMessages, setProcessedMessages] = useState([]); 
  const [formattedResult, setFormattedResult] = useState('');
  const [formattedCopied, setFormattedCopied] = useState(false);
  
  const [selectedMessages, setSelectedMessages] = useState([]); 
  const [confirmedIds, setConfirmedIds] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);

  const [activeTab, setActiveTab] = useState('pending');        
  const [outputMode, setOutputMode] = useState('messenger');
  
  const [copiedItemId, setCopiedItemId] = useState(null);

  const [sortOrder, setSortOrder] = useState('content');
  const [inputColumnOrder, setInputColumnOrder] = useState(['host', 'event', 'date', 'ip']);
  
  // 근무자 정보 상태
  const [workerTeam, setWorkerTeam] = useState('1조');
  const [workerName, setWorkerName] = useState('');
  const [workerPosition, setWorkerPosition] = useState('사원');

  const handleChange = (e) => {
    const value = e.target.value;
    setInputs(value.split('\n'));
  };

  const handleFormattedCopy = () => {
    if (!formattedResult) return;
    navigator.clipboard.writeText(formattedResult);
    setFormattedCopied(true);
    setTimeout(() => setFormattedCopied(false), 2000);
  };

  const handleCopyContent = (content, id) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedItemId(id);
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  const handleToggleSelect = (message) => {
    const isSelected = selectedMessages.find(m => m.id === message.id);
    if (isSelected) {
      setSelectedMessages(selectedMessages.filter(m => m.id !== message.id));
    } else {
      setSelectedMessages([...selectedMessages, message]);
    }
  };

  const handleConfirmMessage = (id) => {
    if (!confirmedIds.includes(id)) {
      setConfirmedIds([...confirmedIds, id]);
    }
  };

  const handleRestoreMessage = (id) => {
    setConfirmedIds(confirmedIds.filter(cid => cid !== id));
    setCompletedIds(completedIds.filter(cid => cid !== id));
  };

  const handleToggleComplete = (id) => {
    if (completedIds.includes(id)) {
      setCompletedIds(completedIds.filter(cid => cid !== id));
    } else {
      setCompletedIds([...completedIds, id]);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'confirmed') {
        setSortOrder('default');
    } else {
        setSortOrder('content');
    }
  };

  const getCurrentDateString = () => {
    const d = new Date();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    const minute = d.getMinutes();

    return `${month}/${day} ${hour}:${minute}`;
  };

  // --- 데이터 파싱 로직 ---
  useEffect(() => {
    setConfirmedIds([]);
    setSelectedMessages([]);
    setCompletedIds([]);

    const messages = [];
    inputs.reduce((acc, input, index) => {
      if (input.trim() === '') return acc;
      const columns = input.split('\t');
      const parsedData = {};
      
      inputColumnOrder.forEach((dataType, colIndex) => {
        parsedData[dataType] = (columns.length > colIndex && colIndex >= 0) ? columns[colIndex] : '';
      });

      const rawEvent = parsedData['event'] || '';
      
      const logPattern = /(\[\d{4}-\d{2}-\d{2}.*\])$/;
      const match = rawEvent.match(logPattern);

      let cleanEvent = rawEvent;
      let processingLog = '';
      let processingContent = ''; 

      if (match) {
        processingLog = match[1];
        cleanEvent = rawEvent.replace(logPattern, '').trim();

        const contentMatch = processingLog.match(/\d{2}:\d{2}:\d{2}:\s*(.*?)\s*확인/);
        if (contentMatch) {
            processingContent = contentMatch[1].trim();
        } else {
            const parts = processingLog.split(':');
            if (parts.length > 3) { 
                const temp = processingLog.substring(processingLog.indexOf(':', 15) + 1); 
                const confirmIndex = temp.lastIndexOf('확인');
                if (confirmIndex !== -1) {
                    processingContent = temp.substring(0, confirmIndex).trim();
                }
            }
        }
      }

      parsedData['cleanEvent'] = cleanEvent;
      parsedData['processingLog'] = processingLog;
      parsedData['processingContent'] = processingContent; 

      messages.push({ id: index, data: parsedData });
      return acc;
    }, '');
    setProcessedMessages(messages);
  }, [inputs, inputColumnOrder]);

  // --- 결과 텍스트 생성 ---
  useEffect(() => {
    const activeSelectedMessages = selectedMessages.filter(m => !confirmedIds.includes(m.id));

    // 선택된 메시지가 없으면 결과 비우기
    if (activeSelectedMessages.length === 0) {
      setFormattedResult('');
      return;
    }

    // [수정] 선택된 메시지가 있지만, 이름이 입력되지 않은 경우 결과 비우기 (UI에서 경고 표시)
    if (!workerName.trim()) {
        setFormattedResult('');
        return;
    }

    let formatted = '';
    const sortedSelected = [...activeSelectedMessages].sort((a, b) => a.id - b.id);

    if (outputMode === 'messenger') {
        formatted = '안녕하세요.\n';
        formatted += `상암 상황실 ${workerTeam} ${workerName} ${workerPosition}입니다.\n`;
        formatted += '지속중인 메세지 재전달드리니 확인 부탁드립니다.\n\n';

        sortedSelected.forEach((message) => {
            formatted += `서버: ${message.data.host || ''}\n`;
            formatted += `내용: ${message.data.cleanEvent || ''}\n\n`; 
        });
        formatted += '감사합니다.';

    } else {
        formatted = 'Dear!\n';
        formatted += 'This is KIC Control office in Korea.\n';
        formatted += 'Monitoring System detected warning message(s) from your server.\n';
        formatted += 'Please check following message(s).\n\n';
        
        sortedSelected.forEach((message) => {
            formatted += '------------------------------------------------------------------------------------------\n';
            formatted += `Date: ${message.data.date || ''} (Base On Korea Time)\n`;
            formatted += `IP: ${message.data.ip || ''}\n`;
            formatted += `Host: ${message.data.host || ''}\n`;
            formatted += `Message: ${message.data.cleanEvent || ''}\n`;
            formatted += '------------------------------------------------------------------------------------------\n';
        });
        
        formatted += '\nThank you.';
    }

    setFormattedResult(formatted);
  }, [selectedMessages, confirmedIds, workerName, workerPosition, outputMode, workerTeam]);

  const handleColumnSelectChange = (currentIndex) => (e) => {
    const selectedDataType = e.target.value;
    const currentDataType = inputColumnOrder[currentIndex];
    if (selectedDataType === currentDataType) return;
    const targetIndex = inputColumnOrder.findIndex(type => type === selectedDataType);
    if (targetIndex === -1) return;
    const newInputColumnOrder = [...inputColumnOrder];
    newInputColumnOrder[targetIndex] = currentDataType;
    newInputColumnOrder[currentIndex] = selectedDataType;
    setInputColumnOrder(newInputColumnOrder);
  };

  const formatDataTypeLabel = (dataType) => {
    switch (dataType) {
      case 'date': return 'Date';
      case 'host': return 'Host';
      case 'event': return 'Event';
      case 'ip': return 'IP';
      default: return dataType;
    }
  };

  // --- 리스트 필터링 및 정렬 로직 ---
  const pendingMessages = processedMessages.filter(m => !confirmedIds.includes(m.id));
  const confirmedMessagesList = processedMessages.filter(m => confirmedIds.includes(m.id));
  
  let displayMessages = activeTab === 'pending' ? pendingMessages : confirmedMessagesList;

  // [추가] 렌더링용: 현재 선택된(대기중인) 메시지가 있는지 확인
  const hasSelectedPendingMessages = selectedMessages.some(m => !confirmedIds.includes(m.id));

  displayMessages = [...displayMessages].sort((a, b) => {
    if (sortOrder === 'content') {
      const contentA = a.data.processingContent || '';
      const contentB = b.data.processingContent || '';
      
      if (contentA === '' && contentB !== '') return 1;
      if (contentA !== '' && contentB === '') return -1;
      
      return contentA.localeCompare(contentB);
    }
    return a.id - b.id;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">지속 이벤트 재전달</h1>

      {/* --- 상단 설정 영역 --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className={`p-5 border rounded-lg shadow-sm h-full transition-colors ${!workerName.trim() ? 'bg-red-50 border-red-200 ring-2 ring-red-100' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className={`text-sm font-bold mb-4 border-b pb-2 ${!workerName.trim() ? 'text-red-600 border-red-200' : 'text-gray-700 border-gray-200'}`}>
            1. 근무자 정보 입력 { !workerName.trim() && <span className="text-xs font-normal text-red-500 ml-2">* 필수</span> }
          </h3>
          <div className="flex gap-2 items-end">
             <div className="w-24 shrink-0">
              <label className="block text-xs font-semibold text-gray-500 mb-1">소속 조</label>
              <select
                value={workerTeam}
                onChange={(e) => setWorkerTeam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1조">1조</option>
                <option value="2조">2조</option>
                <option value="3조">3조</option>
                <option value="4조">4조</option>
              </select>
            </div>
            <div className="flex-1">
              <label className={`block text-xs font-semibold mb-1 ${!workerName.trim() ? 'text-red-500' : 'text-gray-500'}`}>이름</label>
              <input
                type="text"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 ${!workerName.trim() ? 'border-red-300 bg-white placeholder-red-300' : 'border-gray-300'}`}
                placeholder="홍길동"
              />
            </div>
            <div className="w-24 shrink-0">
              <label className="block text-xs font-semibold text-gray-500 mb-1">직책</label>
              <select
                value={workerPosition}
                onChange={(e) => setWorkerPosition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="사원">사원</option>
                <option value="선임">선임</option>
                <option value="책임">책임</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-5 bg-blue-50 border border-blue-100 rounded-lg shadow-sm h-full">
          <h3 className="text-sm font-bold text-blue-800 mb-4 border-b pb-2 border-blue-200">2. 입력 데이터 순서 (원본 데이터 열 순서)</h3>
          <div className="flex justify-between gap-2">
            {inputColumnOrder.map((dataType, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <span className="text-xs text-blue-600 mb-1 font-medium">{index + 1}열</span>
                <select
                  value={dataType}
                  onChange={handleColumnSelectChange(index)}
                  className="w-full px-2 py-2 text-sm border-blue-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md text-gray-700 text-center shadow-sm"
                >
                  {['date', 'host', 'event', 'ip'].map(optionType => (
                    <option key={optionType} value={optionType}>{formatDataTypeLabel(optionType)}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="rawDataInput" className="block text-sm font-bold text-gray-700 mb-2">
          3. 원본 데이터 붙여넣기
        </label>
        <textarea
          id="rawDataInput"
          className="w-full h-32 p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all text-sm font-mono"
          onChange={handleChange}
          placeholder="엑셀이나 로그파일의 데이터를 복사해서 붙여넣으세요. (탭으로 구분된 데이터)"
        />
      </div>

      <div className="mb-8 bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="flex items-center gap-6">
                <h3 className="text-lg font-bold text-gray-800">4. 완성된 포맷 (전달용)</h3>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setOutputMode('messenger')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                            outputMode === 'messenger'
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <FaCommentDots /> 메신저
                    </button>
                    <button
                        onClick={() => setOutputMode('email')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                            outputMode === 'email'
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <FaEnvelope /> 해외메일
                    </button>
                </div>
            </div>

            <button
            onClick={handleFormattedCopy}
            disabled={!formattedResult}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm text-sm font-medium ${
                formattedResult 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-white cursor-not-allowed'
            }`}
            >
            <IoMdCopy />
            {formattedCopied ? '복사됨' : '전체 복사'}
            </button>
        </div>
        
        <div className={`p-4 rounded-lg border h-64 max-h-80 overflow-y-auto text-sm transition-colors ${
            !workerName.trim() && hasSelectedPendingMessages 
                ? 'bg-red-50 border-red-200' 
                : 'bg-gray-100 border-gray-300'
        }`}
             style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
          
          {hasSelectedPendingMessages && !workerName.trim() ? (
              <div className="flex flex-col items-center justify-center h-full text-red-500 gap-2">
                  <FaExclamationCircle className="text-3xl" />
                  <span className="font-bold">근무자 정보(이름)를 입력해주세요!</span>
                  <span className="text-xs text-red-400">이름을 입력해야 포맷이 생성됩니다.</span>
              </div>
          ) : (
              formattedResult || <span className="text-gray-400 select-none">아래 목록에서 [+ 추가] 버튼을 누르면 내용이 생성됩니다.</span>
          )}
        </div>
      </div>

      {/* --- 탭 및 정렬 영역 --- */}
      <div className="flex flex-col sm:flex-row justify-between items-end border-b border-gray-200 mb-4 gap-2">
        <div className="flex w-full sm:w-auto">
          <button
            onClick={() => handleTabChange('pending')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium outline-none transition-colors border-b-2 ${
              activeTab === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaListUl />
            대기 중 ({pendingMessages.length})
          </button>
          <button
            onClick={() => handleTabChange('confirmed')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium outline-none transition-colors border-b-2 ${
              activeTab === 'confirmed'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaCheckDouble />
            확인됨 ({confirmedMessagesList.length})
          </button>
        </div>

        <div className="w-full sm:w-auto pb-2">
            <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            >
                <option value="default">입력순</option>
                <option value="content">확인 내용 정렬순 (가나다)</option>
            </select>
        </div>
      </div>

      <div className="space-y-3 pb-12">
        {displayMessages.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            {activeTab === 'pending' ? '대기 중인 메시지가 없습니다.' : '확인된 메시지가 없습니다.'}
          </div>
        ) : (
          displayMessages.map((message) => {
            const isSelected = selectedMessages.find(m => m.id === message.id);
            const isConfirmedTab = activeTab === 'confirmed';
            const isCompleted = completedIds.includes(message.id);

            // 테두리 및 배경색 로직
            let itemClass = 'p-4 rounded-lg border transition-all ';
            if (isConfirmedTab) {
                if (isSelected) {
                    itemClass += 'bg-blue-50 border-blue-400 shadow-md';
                } else {
                    itemClass += 'bg-red-50 border-red-400 shadow-sm';
                }
            } else {
                if (isSelected) {
                    itemClass += 'bg-blue-50 border-blue-400 shadow-md';
                } else {
                    itemClass += 'bg-white border-gray-200 hover:border-gray-300';
                }
            }

            // --- 확인됨 탭에서의 텍스트 변환 로직 (재전달 포맷) ---
            const originalContent = message.data.processingContent || message.data.processingLog;
            let displayContent = originalContent;

            // 확인됨 탭일 때만 변환된 텍스트 생성
            if (isConfirmedTab) {
                const dateStr = getCurrentDateString();
                const nameStr = workerName || '(이름)';
                displayContent = `${originalContent} → ${workerTeam} ${nameStr} ${workerPosition} ${dateStr} ${originalContent} 재전달`;
            }

            return (
              <div
                key={message.id}
                className={itemClass}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex-1 text-sm whitespace-pre-wrap grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 ${
                      isConfirmedTab ? 'text-gray-500' : 'text-gray-800'
                  } ${isCompleted ? 'line-through opacity-50' : ''}`}>
                    <div><span className="font-bold text-gray-500">서버:</span> {message.data.host}</div>
                    <div><span className="font-bold text-gray-500">내용:</span> {message.data.cleanEvent}</div>
                    <div><span className="font-bold text-gray-500">일시:</span> {message.data.date}</div>
                    <div><span className="font-bold text-gray-500">IP:</span> {message.data.ip}</div>
                    
                    {originalContent && (
                        <div className={`col-span-1 md:col-span-2 mt-2 pt-2 border-t border-gray-200 text-xs p-2 rounded ${
                            isConfirmedTab ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                            <span className="font-bold">└ 처리내용:</span> {displayContent}
                        </div>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {!isConfirmedTab && (
                      <button
                        onClick={() => handleToggleSelect(message)}
                        className={`flex items-center gap-1 px-3 py-2 rounded text-xs font-bold transition-colors w-20 justify-center ${
                          isSelected
                            ? 'bg-white border border-red-400 text-red-500 hover:bg-red-50'
                            : 'bg-white border border-blue-600 text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        {isSelected ? '− 제외' : '+ 추가'}
                      </button>
                    )}

                    {!isConfirmedTab && (
                      <button
                        onClick={() => handleConfirmMessage(message.id)}
                        className="flex items-center gap-1 px-3 py-2 rounded text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        <FaCheck /> 확인
                      </button>
                    )}

                    {isConfirmedTab && (
                      <button
                        onClick={() => handleCopyContent(displayContent, message.id)}
                        className={`flex items-center gap-1 px-3 py-2 rounded text-xs font-bold transition-colors border ${
                            copiedItemId === message.id
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-600'
                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                          {copiedItemId === message.id ? <FaCheck /> : <IoMdCopy />}
                          {copiedItemId === message.id ? '복사됨' : '내용 복사'}
                      </button>
                    )}

                    {isConfirmedTab && (
                      <button
                        onClick={() => handleToggleComplete(message.id)}
                        className={`flex items-center gap-1 px-3 py-2 rounded text-xs font-bold transition-colors border ${
                            isCompleted
                                ? 'bg-teal-600 border-teal-600 text-white shadow-inner'
                                : 'bg-white border-teal-500 text-teal-600 hover:bg-teal-50'
                        }`}
                      >
                          <FaPaperPlane /> {isCompleted ? '전달 완료' : '전달 완료'}
                      </button>
                    )}

                    {isConfirmedTab && (
                      <button
                        onClick={() => handleRestoreMessage(message.id)}
                        className="flex items-center gap-1 px-3 py-2 rounded text-xs font-bold bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                      >
                        <FaUndo /> 복구
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PersistentRedirect;