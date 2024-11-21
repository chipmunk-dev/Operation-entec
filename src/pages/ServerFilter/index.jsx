import { useEffect, useState } from 'react';
import { IoIosArrowForward } from 'react-icons/io';
import { IoInformationCircleOutline } from 'react-icons/io5';
import clsx from 'clsx';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

import ServerArea from './ServerArea';
import Modal from '../../components/Modal';

function ServerFilter() {
  // data
  const [serverGroups, setServerGroups] = useState([]);
  const [checkServer, setCheckServer] = useState('');
  const [checkServerList, setCheckServerList] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // modal, visible
  const [expandedMenu, setExpandedMenu] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  // form data
  const [admin, setAdmin] = useState('');
  const [job, setJob] = useState('w');
  const [division, setDivision] = useState(`\n`);
  const [server, setServer] = useState('');
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(new Date());

  const handleArrowClick = () => {
    setExpandedMenu((prevState) => !prevState);
  };

  const handleConfirm = (e) => {
    e.preventDefault();

    const formatDate = `${endDateTime.getMonth() + 1}/${endDateTime.getDate()} ${endDateTime.getHours()}시${endDateTime.getMinutes() === 0 ? '' : endDateTime.getMinutes() + '분'}`;
    const message = `${job} ~ ${formatDate} ${admin} ${job === 'w' ? '작업' : '리부팅'}`;
    const serverList = server
      .trim()
      .split(division)
      .filter((server) => server !== '')
      .map((server) => server.trim());
    const serverMap = serverList.reduce((acc, cur) => {
      acc[cur] = message;
      return acc;
    }, {});

    const workingServerInfo = {
      id: Date.now(),
      admin,
      job,
      division,
      startDateTime: startDateTime.toLocaleString(),
      endDateTime: endDateTime.toLocaleString(),
      serverList,
      serverMap,
      message,
    };

    setServerGroups((prevState) => [...prevState, workingServerInfo]);
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    setAdmin('');
    setJob('w');
    setDivision(`\n`);
    setServer('');
    setStartDateTime(new Date());
    setEndDateTime(new Date());
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    setServerGroups((prevState) =>
      prevState.filter((server) => server.id !== id)
    );
  };

  const modalContents = () => {
    return (
      <>
        <form>
          <section className="flex">
            <div className="flex flex-col items-start gap-2 mb-6 mr-10">
              <h2 className="text-xl font-bold">작업자</h2>
              <input
                id="admin"
                name="admin"
                type="text"
                placeholder="ex) 홍길동 책임"
                required
                className="border border-gray-300 rounded p-2"
                value={admin}
                onChange={(e) => setAdmin(e.target.value)}
              />
            </div>
            <div className="flex flex-col items-start gap-2 mb-6">
              <h2 className="text-xl font-bold">작업 종류</h2>
              <select
                name="job"
                className="w-[200px] border border-gray-300 rounded p-2"
                value={job}
                onChange={(e) => setJob(e.target.value)}
              >
                <option value="w">w) 작업</option>
                <option value="r">r) 리부팅</option>
              </select>
            </div>
          </section>
          <section className="flex flex-col items-start gap-2 mb-6">
            <h2 className="text-xl font-bold">작업 기간</h2>
            <div className="flex items-center gap-2">
              <Flatpickr
                data-enable-time
                value={startDateTime}
                options={{
                  dateFormat: 'm/d H:i',
                  enableTime: true,
                  time_24hr: true,
                  noCalendar: false,
                }}
                onChange={(date) => setStartDateTime(date[0])}
                className="border border-gray-300 rounded p-2"
              />
              부터
              <Flatpickr
                data-enable-time
                value={endDateTime}
                options={{
                  dateFormat: 'm/d H:i',
                  enableTime: true,
                  time_24hr: true,
                  noCalendar: false,
                }}
                onChange={(date) => setEndDateTime(date[0])}
                className="border border-gray-300 rounded p-2"
              />
              까지
            </div>
          </section>
          <section className="flex flex-col items-start gap-2 mb-6">
            <h2 className="text-xl font-bold">작업 서버</h2>
            <div className="flex items-center gap-2 relative">
              <div className="flex items-center justify-start">
                <label htmlFor="division">구분자</label>
                <IoInformationCircleOutline
                  className="text-blue-500 cursor-pointer"
                  onMouseEnter={() => setIsTooltipVisible(true)}
                  onMouseLeave={() => setIsTooltipVisible(false)}
                />
              </div>
              {isTooltipVisible && (
                <div className="absolute left-0 top-full mt-1 bg-white text-black text-sm rounded p-4 shadow-lg w-80">
                  <p className="font-bold">[Enter(줄바꿈)]</p>
                  <p>
                    Enter(줄바꿈)는 각 서버들을 엔터를 눌러 줄을 바꿔 작성하는
                    방식입니다.
                  </p>
                  <p className="mt-2">ex)</p>
                  <p>LGEABC1</p>
                  <p>LGEABC2</p>
                  <p>LGEABC3</p>
                  <p className="font-bold mt-4">[Space(띄어쓰기)]</p>
                  <p>
                    Space(띄어쓰기)는 각 서버들을 스페이스를 눌러 공백으로
                    구분하는 방식입니다.
                  </p>
                  <p className="mt-2">ex)</p>
                  <p>LGEABC1 LGEABC2 LGEABC3</p>
                  <p className="font-bold mt-4">[콤마(,)]</p>
                  <p>
                    콤마(,)는 각 서버들을 콤마를 이용하여 구분하는 방식입니다.
                  </p>
                  <p className="mt-2">ex)</p>
                  <p>LGEABC1,LGEABC2,LGEABC3</p>
                </div>
              )}
              <div className="flex gap-4">
                <div className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="division"
                    id="enter"
                    value={`\n`}
                    checked={division === `\n`}
                    onChange={(e) => setDivision(e.target.value)}
                  />
                  <label htmlFor="enter">줄바꿈(Enter Key)</label>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="division"
                    id="space"
                    value=" "
                    checked={division === ' '}
                    onChange={(e) => setDivision(e.target.value)}
                  />
                  <label htmlFor="space">띄어쓰기(Space Key)</label>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="division"
                    id="comma"
                    value=","
                    checked={division === `,`}
                    onChange={(e) => setDivision(e.target.value)}
                  />
                  <label htmlFor="comma">콤마(, Key)</label>
                </div>
              </div>
            </div>
            <textarea
              name="server"
              className="w-full h-[300px] overflow-y-auto border border-gray-300 rounded p-2"
              value={server}
              onChange={(e) => setServer(e.target.value)}
            ></textarea>
          </section>
        </form>
      </>
    );
  };

  useEffect(() => {
    if (checkServer.trim() === '') {
      setCheckServerList([]);
    } else {
      const checkServerList = checkServer.split('\n').map((server, index) => {
        const trimmedServer = server.trim();

        if (trimmedServer === '') {
          return null;
        }

        const serverInfo = serverGroups.find(
          (group) => group.serverMap[trimmedServer]
        );

        if (serverInfo) {
          return (
            <li
              key={index}
              className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200"
            >
              <span className="font-medium text-blue-700">{server}</span>
              <span className="text-gray-500">→</span>
              <span className="text-gray-700">{serverInfo.message}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(serverInfo.message);
                }}
                className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                복사
              </button>
            </li>
          );
        }
        return (
          <li
            key={index}
            className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <span className="font-medium text-gray-700">{server}</span>
            <span className="text-rose-500">작업 미대상</span>
          </li>
        );
      });

      setCheckServerList(checkServerList);
    }
  }, [checkServer]);

  useEffect(() => {
    // 첫 로딩시 localStorage에서 serverGroups 데이터 불러오기
    if (isInitialLoad) {
      const savedServerGroups = localStorage.getItem('serverGroups');
      if (savedServerGroups) {
        setServerGroups(JSON.parse(savedServerGroups));
      }
      setIsInitialLoad(false);
    } else {
      localStorage.setItem('serverGroups', JSON.stringify(serverGroups));
    }
  }, [serverGroups]);

  return (
    <div className="p-4">
      <div className="flex flex-col gap-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-[150px] bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          작업서버 추가
        </button>
        <button onClick={handleArrowClick}>
          <div className="flex items-center gap-2">
            <IoIosArrowForward
              className={clsx(
                'transition-transform duration-300',
                expandedMenu ? 'rotate-90' : 'rotate-0'
              )}
            />
            <span className="text-sky-700">{`작업 서버 목록 ${expandedMenu ? '닫기' : '보기'}`}</span>
          </div>
        </button>
      </div>
      {isModalOpen && (
        <Modal
          handleConfirm={handleConfirm}
          handleCloseModal={handleCloseModal}
          contents={modalContents}
        />
      )}
      {expandedMenu && (
        <ServerArea serverGroups={serverGroups} handleDelete={handleDelete} />
      )}
      <section>
        <h3 className="text-xl font-bold mt-12">확인 서버</h3>
        <textarea
          name="checkServer"
          className="w-full h-[300px] overflow-y-auto border border-gray-300 rounded p-2"
          value={checkServer}
          onChange={(e) => setCheckServer(e.target.value)}
        ></textarea>
      </section>
      <section>
        <ul className="mt-4 space-y-2">{checkServerList}</ul>
      </section>
    </div>
  );
}

export default ServerFilter;
