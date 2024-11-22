import PropsTypes from 'prop-types';

const ServerArea = ({ serverGroups, handleDelete, handleEdit }) => {
  return (
    <div className="p-6">
      <ul className="space-y-6">
        {serverGroups.length > 0 ? (
          serverGroups.map((server) => (
            <li
              key={server.id}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-bold text-indigo-600">
                      {server.admin}
                    </div>
                    <div className="px-3 py-1 bg-indigo-100 text-indigo-600 text-sm rounded-full">
                      {server.job === 'w' ? '작업' : '리부팅'}
                    </div>
                  </div>
                  <div className="flex items-center text-gray-600 text-sm">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    작업 시간: {new Date(server.startDateTime).toLocaleString()}{' '}
                    ~ {new Date(server.endDateTime).toLocaleString()}
                  </div>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center mb-2">
                      <svg
                        className="w-4 h-4 mr-2 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
                        />
                      </svg>
                      <span className="font-medium text-gray-700">
                        작업 서버 ({server.serverList.length}개)
                      </span>
                    </div>
                    <div className="text-gray-600 leading-relaxed">
                      {server.serverList.join(', ')}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(server)}
                    className="flex items-center gap-1 px-3 py-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    <span>수정</span>
                  </button>
                  <button
                    onClick={() => handleDelete(server.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </li>
          ))
        ) : (
          <p className="text-center text-gray-500 py-8">
            현재 작업(예정) 서버가 없습니다.
          </p>
        )}
      </ul>
    </div>
  );
};

ServerArea.propTypes = {
  serverGroups: PropsTypes.array.isRequired,
  handleDelete: PropsTypes.func.isRequired,
  handleEdit: PropsTypes.func.isRequired,
};

export default ServerArea;
