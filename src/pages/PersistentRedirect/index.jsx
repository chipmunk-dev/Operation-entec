import { useEffect, useState } from 'react';
import { IoMdCopy } from 'react-icons/io';
import { FaCheck, FaUndo, FaListUl, FaCheckDouble, FaPaperPlane, FaExclamationCircle, FaCommentDots, FaEnvelope, FaGlobe, FaInfoCircle } from 'react-icons/fa';
import PageHeader from '../../components/PageHeader';
import {
  DEFAULT_PERSISTENT_REDIRECT_ORDER,
  mergePersistentRedirectIds,
  parsePersistentRedirectMessages,
  toggleAllPersistentRedirectIds,
  togglePersistentRedirectId,
} from '../../utils/persistentRedirectParser';
import { formatForeignResendMail } from '../../utils/foreignMailFormatter';

const howToSteps = [
  {
    title: '근무자·열 설정',
    description: '근무자 정보와 원본 데이터의 Date·Host·Event·IP 순서를 맞춥니다.',
    icon: <FaInfoCircle />,
  },
  {
    title: '이벤트 입력·검토',
    description: '원본을 붙여넣고 확인 필요 메시지를 검토해 제외할 항목을 정리합니다.',
    icon: <FaListUl />,
  },
  {
    title: '전달 문구 복사',
    description: '국내·해외 메신저 또는 해외메일 형식을 선택해 전체 복사합니다.',
    icon: <FaEnvelope />,
  },
  {
    title: '메시지 상태 관리',
    description: '대기·확인 완료·전달 완료 상태를 업무 진행에 맞춰 변경합니다.',
    icon: <FaCheckDouble />,
  },
];

function PersistentRedirect() {
  const [rawInput, setRawInput] = useState('');
  const [processedMessages, setProcessedMessages] = useState([]); 
  const [formattedResult, setFormattedResult] = useState('');
  const [formattedCopied, setFormattedCopied] = useState(false);
  
  const [selectedMessages, setSelectedMessages] = useState([]); 
  const [confirmedIds, setConfirmedIds] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [selectedReviewMessageIds, setSelectedReviewMessageIds] = useState([]);
  const [isReviewFilterCollapsed, setIsReviewFilterCollapsed] = useState(false);

  const [activeTab, setActiveTab] = useState('pending');        
  const [outputMode, setOutputMode] = useState('messenger');
  
  const [copiedKey, setCopiedKey] = useState(null);

  const [sortOrder, setSortOrder] = useState('content');
  const [inputColumnOrder, setInputColumnOrder] = useState(
    DEFAULT_PERSISTENT_REDIRECT_ORDER,
  );
  
  const [workerTeam, setWorkerTeam] = useState('1조');
  const [workerName, setWorkerName] = useState('');
  const [workerPosition, setWorkerPosition] = useState('사원');

  const handleChange = (e) => {
    setRawInput(e.target.value);
  };

  const handleFormattedCopy = () => {
    if (!formattedResult) return;
    navigator.clipboard.writeText(formattedResult);
    setFormattedCopied(true);
    setTimeout(() => setFormattedCopied(false), 2000);
  };

  const handleCopyContent = (content, key) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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
    setConfirmedIds((current) => mergePersistentRedirectIds(current, [id]));
    setSelectedReviewMessageIds((current) =>
      current.filter((messageId) => messageId !== id),
    );
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
    setSortOrder(tab === 'confirmed' ? 'default' : 'content');
  };

  const getCurrentDateString = () => {
    const d = new Date();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    const minute = d.getMinutes();
    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    return `${month}/${day} ${formattedHour}:${formattedMinute}`;
  };

  // --- 데이터 파싱 로직 ---
  useEffect(() => {
    setConfirmedIds([]);
    setSelectedMessages([]);
    setCompletedIds([]);
    setSelectedReviewMessageIds([]);
    setIsReviewFilterCollapsed(false);

    const messages = parsePersistentRedirectMessages(
      rawInput,
      inputColumnOrder,
    );

    setProcessedMessages(messages);
  }, [rawInput, inputColumnOrder]);

  // --- 결과 텍스트 생성 ---
  useEffect(() => {
    const activeSelectedMessages = selectedMessages.filter(m => !confirmedIds.includes(m.id));

    if (activeSelectedMessages.length === 0 || !workerName.trim()) {
      setFormattedResult('');
      return;
    }

    let formatted = '';
    const sortedSelected = [...activeSelectedMessages].sort((a, b) => a.id - b.id);

    if (outputMode === 'messenger') {
        formatted = '안녕하세요.\n';
        formatted += `상암 상황실 ${workerName} ${workerPosition}입니다.\n`;
        formatted += '지속중인 메세지 재전달드리니 확인 부탁드립니다.\n\n';

        sortedSelected.forEach((message) => {
            formatted += `서버: ${message.data.host || ''}\n`;
            formatted += `내용: ${message.data.cleanEvent || ''}\n\n`; 
        });
        formatted += '감사합니다.';

    } else if (outputMode === 'email') {
        formatted = formatForeignResendMail(sortedSelected);

    } else if (outputMode === 'global') {
        formatted = '- Resend -\n\n';
        
        sortedSelected.forEach((message) => {
            formatted += `host: ${message.data.host || ''}\n`;
            formatted += `message: ${message.data.cleanEvent || ''}\n\n`;
        });
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

  const pendingMessages = processedMessages.filter(m => !confirmedIds.includes(m.id));
  const confirmedMessagesList = processedMessages.filter(m => confirmedIds.includes(m.id));
  const recoveredMessageCount = processedMessages.filter(
    (message) => message.wasRecovered,
  ).length;
  const allReviewMessages = processedMessages.filter(
    (message) => message.requiresReview,
  );
  const reviewMessages = allReviewMessages.filter(
    (message) =>
      !confirmedIds.includes(message.id),
  );
  const excludedReviewMessageCount =
    allReviewMessages.length - reviewMessages.length;
  const allReviewMessagesSelected =
    reviewMessages.length > 0 &&
    reviewMessages.every((message) =>
      selectedReviewMessageIds.includes(message.id),
    );

  const handleToggleReviewMessageSelection = (id) => {
    setSelectedReviewMessageIds((current) =>
      togglePersistentRedirectId(current, id),
    );
  };

  const handleToggleAllReviewMessages = () => {
    const currentMessageIds = reviewMessages.map(
      (message) => message.id,
    );
    setSelectedReviewMessageIds((current) =>
      toggleAllPersistentRedirectIds(current, currentMessageIds),
    );
  };

  const handleExcludeSelectedReviewMessages = () => {
    if (selectedReviewMessageIds.length === 0) return;
    setConfirmedIds((current) =>
      mergePersistentRedirectIds(current, selectedReviewMessageIds),
    );
    setSelectedReviewMessageIds([]);
  };
  
  let displayMessages = activeTab === 'pending' ? pendingMessages : confirmedMessagesList;
  const selectedPendingMessageCount = selectedMessages.filter(
    (message) => !confirmedIds.includes(message.id),
  ).length;
  const hasSelectedPendingMessages = selectedPendingMessageCount > 0;

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

  const generateRedirectText = (contentText) => {
      let methodText = "";
      if (contentText.includes('문자만')) {
          methodText = contentText.replace('문자만', '문자');
      } else if (contentText.includes('메일')) {
          methodText = contentText;
      } else {
          const cleanedName = contentText.replace(/[ \t]*(문자|유선|메신저|[/])+[ \t]*$/g, '');
          methodText = `${cleanedName} 메신저`;
      }
      return methodText;
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="지속 이벤트 재전달"
        description="지속 이벤트의 담당자별 전달 문구와 처리 상태를 한 화면에서 관리합니다."
        icon={<FaPaperPlane size={18} />}
        iconClassName="bg-emerald-50 text-emerald-600"
        helpTitle="지속 이벤트 재전달 사용방법"
        helpSummary="지속 이벤트를 검토하고 채널별 전달 문구와 상태를 관리합니다."
        helpSteps={howToSteps}
      />

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className={`panel overflow-hidden transition-colors ${!workerName.trim() ? 'border-rose-200 bg-rose-50/50' : ''}`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className={`text-sm font-bold ${!workerName.trim() ? 'text-rose-700' : 'text-slate-900'}`}>
              1. 근무자 정보
            </h2>
            {!workerName.trim() && (
              <span className="status-pill bg-rose-100 text-rose-700">이름 필수</span>
            )}
          </div>
          <div className="flex items-end gap-2 p-4">
            <div className="w-24 shrink-0">
              <label className="mb-1 block text-xs font-semibold text-slate-500">소속 조</label>
              <select
                value={workerTeam}
                onChange={(e) => setWorkerTeam(e.target.value)}
                className="field-select px-3 py-2"
              >
                <option value="1조">1조</option>
                <option value="2조">2조</option>
                <option value="3조">3조</option>
                <option value="4조">4조</option>
              </select>
            </div>
            <div className="flex-1">
              <label className={`mb-1 block text-xs font-semibold ${!workerName.trim() ? 'text-rose-600' : 'text-slate-500'}`}>이름</label>
              <input
                type="text"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                aria-invalid={!workerName.trim() || undefined}
                className={`field-input px-3 py-2 ${!workerName.trim() ? 'border-rose-300 bg-white placeholder:text-rose-300' : ''}`}
                placeholder="정지운"
              />
            </div>
            <div className="w-24 shrink-0">
              <label className="mb-1 block text-xs font-semibold text-slate-500">직급</label>
              <select
                value={workerPosition}
                onChange={(e) => setWorkerPosition(e.target.value)}
                className="field-select px-3 py-2"
              >
                <option value="사원">사원</option>
                <option value="선임">선임</option>
                <option value="책임">책임</option>
              </select>
            </div>
          </div>
        </section>

        <section className="panel overflow-hidden border-blue-100 bg-blue-50/60">
          <div className="border-b border-blue-100 px-5 py-3">
            <h2 className="text-sm font-bold text-blue-900">2. 입력 데이터 순서</h2>
          </div>
          <div className="flex justify-between gap-2 p-4">
            {inputColumnOrder.map((dataType, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <span className="text-xs text-blue-600 mb-1 font-medium">{index + 1}열</span>
                <select
                  value={dataType}
                  onChange={handleColumnSelectChange(index)}
                  className="field-select px-2 py-2 text-center"
                >
                  {['date', 'host', 'event', 'ip'].map(optionType => (
                    <option key={optionType} value={optionType}>{formatDataTypeLabel(optionType)}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel mb-6 overflow-hidden">
        <div className="panel-header">
          <h2 className="font-bold text-slate-900">3. 원본 데이터 입력</h2>
          <div className="flex flex-wrap gap-2 text-xs">
          <span className="status-pill bg-blue-50 text-blue-700">
            {processedMessages.length}개 입력 행
          </span>
          {allReviewMessages.length > 0 && (
            <span className="status-pill bg-amber-50 text-amber-700">
              확인 필요 {reviewMessages.length} /{' '}
              {allReviewMessages.length}건
            </span>
          )}
          {recoveredMessageCount > 0 && (
            <span className="status-pill bg-violet-50 text-violet-700">
              Event 탭·줄바꿈 제거 {recoveredMessageCount}건
            </span>
          )}
          </div>
        </div>
        <div className="panel-body">
          <textarea
            id="rawDataInput"
            value={rawInput}
            className="field-input source-input-compact"
            onChange={handleChange}
            placeholder="엑셀이나 로그파일의 데이터를 복사해서 붙여넣으세요."
            aria-label="원본 데이터"
          />
        </div>
      </section>

      {allReviewMessages.length > 0 && isReviewFilterCollapsed && (
        <section className="panel mb-6 border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <FaCheck />
              </span>
              <div>
                <p className="text-sm font-bold text-emerald-900">
                  확인 필요 메시지 검토 영역을 접었습니다.
                </p>
                <p className="mt-1 text-xs leading-5 text-emerald-800">
                  총 {allReviewMessages.length}건 중{' '}
                  {excludedReviewMessageCount}건을 제외했습니다. 제외한 메시지는 아래
                  재전달 대기 목록에서 제거되어 있습니다.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsReviewFilterCollapsed(false)}
              className="btn-secondary shrink-0 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
            >
              다시 열기
            </button>
          </div>
        </section>
      )}

      {allReviewMessages.length > 0 && !isReviewFilterCollapsed && (
        <section className="panel mb-6 overflow-hidden border-amber-200">
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-amber-950">
                  확인이 필요한 메시지
                </h3>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  확인내용이 독립된 s/S로 시작하거나 skip·스킵이 포함된 메시지를
                  모아 보여줍니다. skip·스킵 뒤에 공백 유무와 관계없이 x/X가
                  붙으면 스킵 아님으로 판독합니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="status-pill bg-amber-200 text-amber-900">
                  {selectedReviewMessageIds.length} / {reviewMessages.length}건 선택
                </span>
                <button
                  type="button"
                  onClick={handleToggleAllReviewMessages}
                  className="btn-secondary"
                >
                  {allReviewMessagesSelected
                    ? '전체 선택 해제'
                    : '메시지 전체 선택'}
                </button>
                <button
                  type="button"
                  onClick={handleExcludeSelectedReviewMessages}
                  disabled={selectedReviewMessageIds.length === 0}
                  className="btn bg-rose-600 text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  선택 메시지 일괄 제외
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-blue-100 bg-blue-50/70 px-5 py-3">
            <div className="flex items-start gap-2 text-xs leading-5 text-blue-800">
              <FaInfoCircle className="mt-0.5 shrink-0 text-blue-600" />
              <p>
                이 영역에서 메시지를 <strong>제외</strong>하면 아래의 재전달 대기
                목록에서도 제거되고 <strong>확인됨</strong> 탭으로 이동합니다.
                잘못 제외한 메시지는 확인됨 탭의 <strong>복구</strong> 버튼으로
                되돌릴 수 있습니다.
              </p>
            </div>
          </div>

          <div className="space-y-3 p-5">
            {reviewMessages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-6 text-center">
                <FaCheckDouble className="mx-auto text-2xl text-emerald-600" />
                <p className="mt-2 text-sm font-bold text-emerald-800">
                  모든 확인 필요 메시지를 제외 처리했습니다.
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  확인됨 탭에서 제외 결과를 확인하거나 복구할 수 있습니다.
                </p>
              </div>
            ) : reviewMessages.map((message) => {
              const isReviewMessageSelected =
                selectedReviewMessageIds.includes(message.id);

              return (
              <div
                key={message.id}
                role="button"
                tabIndex={0}
                aria-pressed={isReviewMessageSelected}
                title={
                  isReviewMessageSelected
                    ? '클릭하여 선택 해제'
                    : '클릭하여 메시지 선택'
                }
                onClick={() => handleToggleReviewMessageSelection(message.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleToggleReviewMessageSelection(message.id);
                  }
                }}
                className={`cursor-pointer select-none rounded-xl border p-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                  isReviewMessageSelected
                    ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-200'
                    : 'border-amber-200 bg-white hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50/50 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <input
                    type="checkbox"
                    checked={isReviewMessageSelected}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() =>
                      handleToggleReviewMessageSelection(message.id)
                    }
                    aria-label={`${message.data.host} 메시지 선택`}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="grid min-w-0 flex-1 gap-x-5 gap-y-1 text-sm md:grid-cols-2">
                    <p>
                      <span className="font-bold text-slate-500">서버:</span>{' '}
                      {message.data.host}
                    </p>
                    <p>
                      <span className="font-bold text-slate-500">일시:</span>{' '}
                      {message.data.date}
                    </p>
                    <p className="md:col-span-2">
                      <span className="font-bold text-slate-500">내용:</span>{' '}
                      {message.data.cleanEvent}
                    </p>
                    <p className="md:col-span-2 text-amber-800">
                      <span className="font-bold">확인내용:</span>{' '}
                      {message.data.processingContent}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleConfirmMessage(message.id);
                    }}
                    className="flex shrink-0 items-center gap-1 rounded bg-rose-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700"
                  >
                    <FaCheck />
                    제외
                  </button>
                </div>
              </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              제외할 메시지를 모두 처리했다면 영역을 접고 아래 재전달 목록을 계속
              확인하세요.
            </p>
            <button
              type="button"
              onClick={() => setIsReviewFilterCollapsed(true)}
              className="btn bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <FaCheck />
              제외 완료
            </button>
          </div>
        </section>
      )}

      <div className="flex flex-col">
        <section className="panel order-2 overflow-hidden">
        <div className="panel-header">
          <div>
            <h2 className="font-bold text-slate-900">재전달 메시지 선택</h2>
            <p className="mt-1 text-xs text-slate-500">
              대기 중 메시지를 전달 목록에 추가하거나 확인 완료로 이동하세요.
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="field-select min-w-48 flex-1 py-2 sm:w-56"
              aria-label="메시지 정렬 방식"
            >
              <option value="default">입력순</option>
              <option value="content">확인 내용 가나다순</option>
            </select>
            {selectedPendingMessageCount > 0 && (
              <a href="#persistent-redirect-output" className="btn-primary">
                선택 {selectedPendingMessageCount}건 결과 보기
              </a>
            )}
          </div>
        </div>

        <div className="flex overflow-x-auto border-b border-slate-200 px-5">
          <button type="button" onClick={() => handleTabChange('pending')} aria-pressed={activeTab === 'pending'} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium outline-none transition-colors border-b-2 ${activeTab === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <FaListUl /> 대기 중 ({pendingMessages.length})
          </button>
          <button type="button" onClick={() => handleTabChange('confirmed')} aria-pressed={activeTab === 'confirmed'} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium outline-none transition-colors border-b-2 ${activeTab === 'confirmed' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <FaCheckDouble /> 확인됨 ({confirmedMessagesList.length})
          </button>
        </div>

      <div className="space-y-3 p-5">
        {displayMessages.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            {activeTab === 'pending' ? '대기 중인 메시지가 없습니다.' : '확인된 메시지가 없습니다.'}
          </div>
        ) : (
          displayMessages.map((message) => {
            const isSelected = selectedMessages.find(m => m.id === message.id);
            const isConfirmedTab = activeTab === 'confirmed';
            const isCompleted = completedIds.includes(message.id);

            let itemClass = 'p-4 rounded-lg border transition-all ';
            if (isConfirmedTab) {
                if (isSelected) itemClass += 'bg-blue-50 border-blue-400 shadow-md';
                else itemClass += 'bg-emerald-50/50 border-emerald-200 shadow-sm';
            } else {
                if (isSelected) itemClass += 'bg-blue-50 border-blue-400 shadow-md';
                else itemClass += 'bg-white border-gray-200 hover:border-gray-300';
            }

            const originalContent = message.data.processingContent || message.data.processingLog;
            let displayContentFull = '';
            let displayContentClean = '';
            const hasParenthesis = originalContent && (originalContent.includes('(') || originalContent.includes(')'));

            if (isConfirmedTab && originalContent) {
                const dateStr = getCurrentDateString();
                const nameStr = workerName || '(이름)';
                const prefix = `${workerTeam} ${nameStr} ${workerPosition} ${dateStr}`;

                let rightSideFull = originalContent.replace('문자만', '문자');
                let textWithoutParens = originalContent.replace(/\([^)]*\)/g, '').trim();
                let rightSideClean = generateRedirectText(textWithoutParens);

                displayContentFull = `${originalContent} → ${prefix} ${rightSideFull} 재전달`;
                displayContentClean = `${originalContent} → ${prefix} ${rightSideClean} 재전달`;
            }

            return (
              <div key={message.id} className={itemClass}>
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex-1 text-sm whitespace-pre-wrap grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 ${isConfirmedTab ? 'text-gray-500' : 'text-gray-800'} ${isCompleted ? 'line-through opacity-50' : ''}`}>
                    <div><span className="font-bold text-gray-500">서버:</span> {message.data.host}</div>
                    <div><span className="font-bold text-gray-500">내용:</span> {message.data.cleanEvent}</div>
                    <div><span className="font-bold text-gray-500">일시:</span> {message.data.date}</div>
                    <div><span className="font-bold text-gray-500">IP:</span> {message.data.ip}</div>
                    
                    {!isConfirmedTab && originalContent && (
                        <div className="col-span-1 md:col-span-2 mt-2 pt-2 border-t border-indigo-100 text-xs p-2 rounded bg-indigo-50 text-indigo-700">
                             <span className="font-bold">└ 확인내용:</span> {originalContent}
                        </div>
                    )}

                    {isConfirmedTab && originalContent && (
                        <div className="col-span-1 md:col-span-2 mt-3 pt-3 border-t border-gray-200 flex flex-col gap-2">
                             {hasParenthesis ? (
                                <>
                                    <div className="flex items-center justify-between bg-gray-100 p-2 rounded text-xs text-gray-600">
                                        <span className="flex-1 mr-2"><span className="font-bold text-gray-500">[원본포함]</span> {displayContentFull}</span>
                                        <button onClick={() => handleCopyContent(displayContentFull, `${message.id}-full`)} className={`shrink-0 px-2 py-1 rounded border text-[10px] font-bold transition-colors flex items-center gap-1 ${copiedKey === `${message.id}-full` ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                                            {copiedKey === `${message.id}-full` ? <FaCheck /> : <IoMdCopy />}
                                            {copiedKey === `${message.id}-full` ? '복사됨' : '복사'}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between bg-indigo-50 p-2 rounded text-xs text-indigo-800">
                                        <span className="flex-1 mr-2"><span className="font-bold text-indigo-500">[괄호제외]</span> {displayContentClean}</span>
                                        <button onClick={() => handleCopyContent(displayContentClean, `${message.id}-clean`)} className={`shrink-0 px-2 py-1 rounded border text-[10px] font-bold transition-colors flex items-center gap-1 ${copiedKey === `${message.id}-clean` ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-100'}`}>
                                            {copiedKey === `${message.id}-clean` ? <FaCheck /> : <IoMdCopy />}
                                            {copiedKey === `${message.id}-clean` ? '복사됨' : '복사'}
                                        </button>
                                    </div>
                                </>
                             ) : (
                                <div className="flex items-center justify-between bg-gray-100 p-2 rounded text-xs text-gray-600">
                                    <span className="flex-1 mr-2"><span className="font-bold text-gray-500">[재전달]</span> {displayContentClean}</span>
                                    <button onClick={() => handleCopyContent(displayContentClean, `${message.id}-clean`)} className={`shrink-0 px-2 py-1 rounded border text-[10px] font-bold transition-colors flex items-center gap-1 ${copiedKey === `${message.id}-clean` ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                                        {copiedKey === `${message.id}-clean` ? <FaCheck /> : <IoMdCopy />}
                                        {copiedKey === `${message.id}-clean` ? '복사됨' : '복사'}
                                    </button>
                                </div>
                             )}
                        </div>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {!isConfirmedTab && (
                      <button onClick={() => handleToggleSelect(message)} className={`flex items-center gap-1 px-3 py-2 rounded text-xs font-bold transition-colors w-20 justify-center ${isSelected ? 'bg-white border border-red-400 text-red-500 hover:bg-red-50' : 'bg-white border border-blue-600 text-blue-600 hover:bg-blue-50'}`}>
                        {isSelected ? '추가 취소' : '전달 추가'}
                      </button>
                    )}
                    {!isConfirmedTab && (
                      <button onClick={() => handleConfirmMessage(message.id)} className="flex items-center gap-1 px-3 py-2 rounded text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors">
                        <FaCheck /> 확인 완료
                      </button>
                    )}
                    {isConfirmedTab && (
                      <button onClick={() => handleToggleComplete(message.id)} className={`flex items-center gap-1 px-3 py-2 rounded text-xs font-bold transition-colors border ${isCompleted ? 'bg-teal-600 border-teal-600 text-white shadow-inner' : 'bg-white border-teal-500 text-teal-600 hover:bg-teal-50'}`}>
                          <FaPaperPlane /> {isCompleted ? '완료 취소' : '전달 완료'}
                      </button>
                    )}
                    {isConfirmedTab && (
                      <button onClick={() => handleRestoreMessage(message.id)} className="flex items-center gap-1 px-3 py-2 rounded text-xs font-bold bg-gray-500 text-white hover:bg-gray-600 transition-colors">
                        <FaUndo /> 대기로 복구
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
        </section>

        <section id="persistent-redirect-output" className="panel order-1 mb-6 scroll-mt-6 overflow-hidden">
        <div className="panel-header">
          <div>
            <h2 className="font-bold text-slate-900">4. 전달 문구 확인·복사</h2>
            <p className="mt-1 text-xs text-slate-500">
              선택한 메시지를 전달 채널에 맞는 형식으로 확인한 뒤 복사하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFormattedCopy}
            disabled={!formattedResult}
            className={
              formattedCopied
                ? 'btn bg-emerald-600 text-white'
                : 'btn-primary'
            }
          >
            <IoMdCopy />
            {formattedCopied ? '복사 완료' : '전체 복사'}
          </button>
        </div>

        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <div
            className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-200/70 p-1"
            role="group"
            aria-label="전달 형식"
          >
            <button
              type="button"
              onClick={() => setOutputMode('messenger')}
              aria-pressed={outputMode === 'messenger'}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                outputMode === 'messenger'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FaCommentDots /> 국내 메신저
            </button>
            <button
              type="button"
              onClick={() => setOutputMode('global')}
              aria-pressed={outputMode === 'global'}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                outputMode === 'global'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FaGlobe /> 해외 메신저
            </button>
            <button
              type="button"
              onClick={() => setOutputMode('email')}
              aria-pressed={outputMode === 'email'}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                outputMode === 'email'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FaEnvelope /> 해외메일
            </button>
          </div>
          {outputMode === 'global' && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-violet-700">
              <FaInfoCircle /> cicop 또는 해외법인 담당자에게 메신저로 재전달할 때 사용합니다.
            </p>
          )}
        </div>

        <div className="p-5">
          <div
            className={`grid min-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border p-5 font-mono text-sm transition-colors ${
              !workerName.trim() && hasSelectedPendingMessages
                ? 'place-items-center border-rose-200 bg-rose-50 text-rose-600'
                : 'border-slate-200 bg-slate-950 text-slate-200'
            }`}
          >
            {hasSelectedPendingMessages && !workerName.trim() ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <FaExclamationCircle className="text-3xl" />
                <span className="font-bold">근무자 이름을 입력해 주세요.</span>
              </div>
            ) : (
              formattedResult || (
                <span className="select-none text-slate-500">
                  아래 목록에서 전달할 메시지를 추가하면 결과가 표시됩니다.
                </span>
              )
            )}
          </div>
        </div>
        </section>
      </div>
    </div>
  );
}

export default PersistentRedirect;
