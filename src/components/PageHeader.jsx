import PropTypes from 'prop-types';
import HowToPopover from './HowToPopover';

function PageHeader({
  title,
  description,
  icon,
  iconClassName,
  helpTitle,
  helpSummary,
  helpSteps,
}) {
  const hasLongTitle = title.length >= 30;

  return (
    <header className="page-header">
      <div className="page-header-main">
        <span className={`page-header-icon ${iconClassName}`} aria-hidden="true">
          {icon}
        </span>
        <div
          className={`page-header-copy ${hasLongTitle ? 'page-header-copy-long' : ''}`}
        >
          <h1 className="page-title">{title}</h1>
          <p className="page-description">{description}</p>
        </div>
      </div>
      <HowToPopover
        title={helpTitle}
        summary={helpSummary}
        steps={helpSteps}
      />
    </header>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  iconClassName: PropTypes.string.isRequired,
  helpTitle: PropTypes.string.isRequired,
  helpSummary: PropTypes.string.isRequired,
  helpSteps: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      icon: PropTypes.node.isRequired,
    }),
  ).isRequired,
};

export default PageHeader;
