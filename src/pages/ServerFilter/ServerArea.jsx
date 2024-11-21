import PropsTypes from 'prop-types';

const ServerArea = ({ serverGroups, handleDelete }) => {
  return (
    <div>
      <ul>
        {serverGroups.length > 0 ? (
          serverGroups.map((server) => (
            <li
              key={server.id}
              className="border border-gray-200 rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                  <div className="text-lg font-bold text-blue-600">
                    {server.admin}
                  </div>
                  <div className="text-gray-600 text-sm">
                    작업 시간: {server.startDateTime} ~ {server.endDateTime}
                  </div>
                  <div className="mt-2 p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-500">작업 서버:</span>
                    <div className="mt-1 text-gray-700">
                      {server.serverList.join(', ')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(server.id)}
                  className="text-red-500 hover:text-red-700 px-2 py-1 rounded"
                >
                  삭제
                </button>
              </div>
            </li>
          ))
        ) : (
          <p>현재 작업(예정) 서버가 없습니다.</p>
        )}
      </ul>
    </div>
  );
};

ServerArea.propTypes = {
  serverGroups: PropsTypes.array.isRequired,
  handleDelete: PropsTypes.func.isRequired,
};

export default ServerArea;
