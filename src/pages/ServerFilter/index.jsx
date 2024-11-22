import { useEffect, useState } from 'react';
import { IoIosArrowForward } from 'react-icons/io';
import { IoInformationCircleOutline } from 'react-icons/io5';
import { FaServer, FaUserCog, FaCalendarAlt } from 'react-icons/fa';
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
  const [editingId, setEditingId] = useState(null);

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

  const handleEdit = (serverGroup) => {
    setEditingId(serverGroup.id);
    setAdmin(serverGroup.admin);
    setJob(serverGroup.job);
    setDivision(serverGroup.division);
    setServer(serverGroup.serverList.join(serverGroup.division));
    setStartDateTime(new Date(serverGroup.startDateTime));
    setEndDateTime(new Date(serverGroup.endDateTime));
    setIsModalOpen(true);
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
      id: editingId || Date.now(),
      admin,
      job,
      division,
      startDateTime,
      endDateTime,
      serverList,
      serverMap,
      message,
    };

    if (editingId) {
      setServerGroups((prevState) =>
        prevState.map((group) =>
          group.id === editingId ? workingServerInfo : group
        )
      );
      setEditingId(null);
    } else {
      setServerGroups((prevState) => [...prevState, workingServerInfo]);
    }
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    setAdmin('');
    setJob('w');
    setDivision(`\n`);
    setServer('');
    setStartDateTime(new Date());
    setEndDateTime(new Date());
    setEditingId(null);
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
        <form className="bg-white p-6 rounded-lg">
          <section className="flex mb-8">
            <div className="flex flex-col items-start gap-3 mr-10">
              <div className="flex items-center gap-2">
                <FaUserCog className="text-indigo-600 text-xl" />
                <h2 className="text-xl font-bold text-gray-800">작업자</h2>
              </div>
              <input
                id="admin"
                name="admin"
                type="text"
                placeholder="ex) 홍길동 책임"
                required
                className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={admin}
                onChange={(e) => setAdmin(e.target.value)}
              />
            </div>
            <div className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-2">
                <FaServer className="text-indigo-600 text-xl" />
                <h2 className="text-xl font-bold text-gray-800">작업 종류</h2>
              </div>
              <select
                name="job"
                className="w-[200px] border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={job}
                onChange={(e) => setJob(e.target.value)}
              >
                <option value="w">w) 작업</option>
                <option value="r">r) 리부팅</option>
              </select>
            </div>
          </section>
          <section className="flex flex-col items-start gap-3 mb-8">
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-indigo-600 text-xl" />
              <h2 className="text-xl font-bold text-gray-800">작업 기간</h2>
            </div>
            <div className="flex items-center gap-4">
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
                className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
              <span className="text-gray-600">부터</span>
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
                className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
              <span className="text-gray-600">까지</span>
            </div>
          </section>
          <section className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-2">
              <FaServer className="text-indigo-600 text-xl" />
              <h2 className="text-xl font-bold text-gray-800">작업 서버</h2>
            </div>
            <div className="flex items-center gap-4 relative w-full">
              <div className="flex items-center gap-2">
                <label htmlFor="division" className="text-gray-700">
                  구분자
                </label>
                <IoInformationCircleOutline
                  className="text-indigo-500 cursor-pointer text-xl"
                  onMouseEnter={() => setIsTooltipVisible(true)}
                  onMouseLeave={() => setIsTooltipVisible(false)}
                />
              </div>
              {isTooltipVisible && (
                <div className="absolute left-0 top-full mt-2 bg-white text-black text-sm rounded-lg p-6 shadow-xl w-96 z-50 border border-gray-200">
                  <div className="space-y-4">
                    <div>
                      <p className="font-bold text-indigo-600 mb-2">
                        [Enter(줄바꿈)]
                      </p>
                      <p className="text-gray-600">
                        Enter(줄바꿈)는 각 서버들을 엔터를 눌러 줄을 바꿔
                        작성하는 방식입니다.
                      </p>
                      <p className="mt-2 font-medium">예시:</p>
                      <p className="text-gray-600">LGEABC1</p>
                      <p className="text-gray-600">LGEABC2</p>
                      <p className="text-gray-600">LGEABC3</p>
                    </div>
                    <div>
                      <p className="font-bold text-indigo-600 mb-2">
                        [Space(띄어쓰기)]
                      </p>
                      <p className="text-gray-600">
                        Space(띄어쓰기)는 각 서버들을 스페이스를 눌러 공백으로
                        구분하는 방식입니다.
                      </p>
                      <p className="mt-2 font-medium">예시:</p>
                      <p className="text-gray-600">LGEABC1 LGEABC2 LGEABC3</p>
                    </div>
                    <div>
                      <p className="font-bold text-indigo-600 mb-2">
                        [콤마(,)]
                      </p>
                      <p className="text-gray-600">
                        콤마(,)는 각 서버들을 콤마를 이용하여 구분하는
                        방식입니다.
                      </p>
                      <p className="mt-2 font-medium">예시:</p>
                      <p className="text-gray-600">LGEABC1,LGEABC2,LGEABC3</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="division"
                    id="enter"
                    value={`\n`}
                    checked={division === `\n`}
                    onChange={(e) => setDivision(e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="enter" className="text-gray-700">
                    줄바꿈(Enter Key)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="division"
                    id="space"
                    value=" "
                    checked={division === ' '}
                    onChange={(e) => setDivision(e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="space" className="text-gray-700">
                    띄어쓰기(Space Key)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="division"
                    id="comma"
                    value=","
                    checked={division === `,`}
                    onChange={(e) => setDivision(e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="comma" className="text-gray-700">
                    콤마(, Key)
                  </label>
                </div>
              </div>
            </div>
            <textarea
              name="server"
              className="w-full h-[300px] overflow-y-auto border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all mt-4"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              placeholder="서버 목록을 입력하세요..."
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
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-indigo-200 shadow-sm hover:shadow-md transition-all"
            >
              <span className="font-medium text-indigo-700">{server}</span>
              <span className="text-gray-400">→</span>
              <span className="text-gray-700">{serverInfo.message}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(serverInfo.message);
                }}
                className="px-3 py-1.5 ml-auto text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-md transition-all"
              >
                복사
              </button>
            </li>
          );
        }
        return (
          <li
            key={index}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm"
          >
            <span className="font-medium text-gray-700">{server}</span>
            <span className="text-rose-500 font-medium">작업 미대상</span>
          </li>
        );
      });

      setCheckServerList(checkServerList);
    }
  }, [checkServer]);

  useEffect(() => {
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
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex flex-col gap-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-[180px] bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-indigo-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
        >
          작업서버 추가
        </button>
        <button
          onClick={handleArrowClick}
          className="flex items-center gap-2 text-indigo-700 hover:text-indigo-900 transition-colors"
        >
          <IoIosArrowForward
            className={clsx(
              'transition-transform duration-300',
              expandedMenu ? 'rotate-90' : 'rotate-0'
            )}
          />
          <span>{`작업 서버 목록 ${expandedMenu ? '닫기' : '보기'}`}</span>
        </button>
      </div>
      {isModalOpen && (
        <Modal
          handleConfirm={handleConfirm}
          handleCloseModal={handleCloseModal}
          contents={modalContents}
          buttonText={editingId ? '수정' : '추가'}
        />
      )}
      {expandedMenu && (
        <ServerArea
          serverGroups={serverGroups}
          handleDelete={handleDelete}
          handleEdit={handleEdit}
        />
      )}
      <section className="mt-12">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">확인 서버</h3>
        <textarea
          name="checkServer"
          className="w-full h-[300px] overflow-y-auto border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          value={checkServer}
          onChange={(e) => setCheckServer(e.target.value)}
          placeholder="확인할 서버 목록을 입력하세요..."
        ></textarea>
      </section>
      <section>
        <ul className="mt-6 space-y-3">{checkServerList}</ul>
      </section>
    </div>
  );
}

export default ServerFilter;
