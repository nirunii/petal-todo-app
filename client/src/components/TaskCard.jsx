import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

// One task: time on the left, a pastel card in the project's colour, a checkbox on the right.
export default function TaskCard({ task, onToggle, overdue = false }) {
  return (
    <div className="task-row">
      <span className="task-time">{task.dueTime || ''}</span>
      <div className="task" style={{ background: task.projectColor || 'var(--mist)' }}>
        <Link to={`/tasks/${task.id}`} className="task-body">
          <span className={'task-title' + (task.done ? ' struck' : '')}>{task.title}</span>
          <span className="task-meta">
            {(task.priority === 'high' || overdue) && <span className="dot" aria-hidden="true" />}
            {task.projectName || 'No project'}
            {task.priority === 'high' ? ' · High priority' : ''}
            {overdue ? ' · Overdue' : ''}
          </span>
        </Link>
        <button className="check" aria-label={task.done ? 'Mark as not done' : 'Mark as done'} onClick={() => onToggle(task)}>
          <span className={'box' + (task.done ? ' done' : '')}>{task.done && <Icon name="today" size={14} />}</span>
        </button>
      </div>
    </div>
  );
}
