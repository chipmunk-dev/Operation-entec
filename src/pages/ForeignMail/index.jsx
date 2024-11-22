import { useEffect, useState } from 'react';
import { IoMdCopy } from 'react-icons/io';
import { MdEmail } from 'react-icons/md';

function ForeignMail() {
  const [mails, setMails] = useState([]);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

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
    const makeMessages = mails.reduce((acc, mail) => {
      if (mail.trim() === '') return acc;

      const [host, message, date, ip] = mail.split('\t');
      const messages = `------------------------------------------------------------------------------------------
Date: ${date} (Base On Korea Time)
IP: ${ip}
Host: ${host}
Message: ${message} 
------------------------------------------------------------------------------------------
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
  }, [mails]);

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <MdEmail className="text-4xl text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-800">
          해외메일 포맷 변환기
        </h1>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          원본 데이터를 입력하세요
        </label>
        <textarea
          className="w-full h-48 p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
          onChange={handleChange}
          placeholder="여기에 데이터를 붙여넣으세요..."
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
