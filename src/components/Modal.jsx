import PropsTypes from 'prop-types';

const Modal = ({ handleConfirm, handleCloseModal, contents }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-8 rounded shadow-lg relative max-w-[90%] max-h-[90%] min-w-[320px]">
        <span
          className="absolute top-4 right-4 text-xl cursor-pointer"
          onClick={() => handleCloseModal(false)}
        >
          &times;
        </span>
        {contents()}
        <section className="flex justify-center gap-4">
          <button
            type="submit"
            className="bg-blue-500 text-white font-bold px-6 py-2 rounded hover:bg-blue-600 transition-colors"
            onClick={handleConfirm}
          >
            추가
          </button>
          <button
            type="button"
            className="bg-rose-500 text-white font-bold px-6 py-2 rounded hover:bg-rose-600 transition-colors"
            onClick={() => handleCloseModal(false)}
          >
            취소
          </button>
        </section>
      </div>
    </div>
  );
};

Modal.propTypes = {
  handleConfirm: PropsTypes.func.isRequired,
  handleCloseModal: PropsTypes.func.isRequired,
  contents: PropsTypes.func.isRequired,
};

export default Modal;
