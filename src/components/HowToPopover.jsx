import { useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { MdHelpOutline, MdKeyboardArrowRight } from 'react-icons/md';

function HowToPopover({ title, summary, steps }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMouseLeave = () => {
    if (!containerRef.current?.contains(document.activeElement)) {
      setIsOpen(false);
    }
  };

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative z-30 shrink-0"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={() => setIsOpen(true)}
      onBlurCapture={handleBlur}
    >
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-describedby={isOpen ? tooltipId : undefined}
        className={`btn gap-1.5 border px-3 py-2 text-xs shadow-sm ${
          isOpen
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
        }`}
      >
        <MdHelpOutline size={18} aria-hidden="true" />
        사용방법
      </button>

      {isOpen && (
        <div
          id={tooltipId}
          role="tooltip"
          className="howto-popover absolute right-0 top-[calc(100%+0.6rem)] z-50 max-h-[calc(100vh-7rem)] w-[min(24rem,calc(100vw-6rem))] overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20"
        >
          <div className="border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-4 pb-4 pt-3.5">
            <div className="mb-3">
              <p className="text-sm font-bold text-slate-900">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{summary}</p>
            </div>

            <div className="flex items-center justify-between gap-1" aria-hidden="true">
              {steps.map((step, index) => (
                <div key={step.title} className="contents">
                  <div
                    className="howto-step-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-white text-lg text-blue-600 shadow-sm"
                    style={{ animationDelay: `${index * 180}ms` }}
                  >
                    {step.icon}
                  </div>
                  {index < steps.length - 1 && (
                    <MdKeyboardArrowRight className="howto-flow-arrow shrink-0 text-xl text-blue-300" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <ol className="space-y-2 p-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="group flex gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800">
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                    {step.description}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

HowToPopover.propTypes = {
  title: PropTypes.string.isRequired,
  summary: PropTypes.string.isRequired,
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      icon: PropTypes.node.isRequired,
    }),
  ).isRequired,
};

export default HowToPopover;
