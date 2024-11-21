import { useEffect, useState } from 'react';

function Redirect() {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState('');

  const handleChange = (e) => {
    setMessage(e.target.value?.trim().split('\n'));
  };

  useEffect(() => {
    console.log(message);
  }, [message]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">재전달 페이지</h1>
      <textarea
        className="w-full h-48 p-2 border border-gray-300 rounded-md resize-none"
        onChange={handleChange}
      ></textarea>

      <div className="mt-4">{result}</div>
    </div>
  );
}

export default Redirect;
