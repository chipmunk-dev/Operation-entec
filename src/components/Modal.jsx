import PropsTypes from 'prop-types';

const Modal = ({ handleConfirm, handleCloseModal, contents }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="panel relative max-h-[90vh] min-w-[320px] max-w-[90vw] overflow-y-auto p-6 shadow-2xl">
        <button
          type="button"
          aria-label="닫기"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          onClick={() => handleCloseModal(false)}
        >
          &times;
        </button>
        {contents()}
        <section className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="submit"
            className="btn-primary"
            onClick={handleConfirm}
          >
            추가
          </button>
          <button
            type="button"
            className="btn-secondary"
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
