import PropTypes from 'prop-types';

function WorkflowGuide({ steps }) {
  return (
    <nav className="workflow-guide" aria-label="작업 순서">
      <ol className="workflow-guide-list">
        {steps.map((step, index) => (
          <li key={step} className="workflow-guide-item">
            <span className="workflow-guide-number">{index + 1}</span>
            <span className="text-sm font-semibold text-slate-700">{step}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

WorkflowGuide.propTypes = {
  steps: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default WorkflowGuide;
