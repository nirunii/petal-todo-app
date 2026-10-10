import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';

const ITEMS = [
  ['/', 'today', 'Today'],
  ['/notes', 'notes', 'Notes'],
  null, // the centre "+" button
  ['/upcoming', 'upcoming', 'Upcoming'],
  ['/projects', 'projects', 'Projects'],
];

export default function Nav() {
  const { pathname } = useLocation();
  const go = useNavigate();
  // The "+" adds a note on the Notes tab and a task everywhere else.
  const addTo = pathname.startsWith('/notes') ? '/notes/new' : '/tasks/new';
  return (
    <nav className="nav" aria-label="Main">
      {ITEMS.map((it) =>
        it ? (
          <NavLink key={it[0]} to={it[0]} end className={({ isActive }) => 'nav-item' + (isActive ? ' on' : '')}>
            <Icon name={it[1]} />
            <span>{it[2]}</span>
          </NavLink>
        ) : (
          <button key="add" className="fab" aria-label={addTo === '/notes/new' ? 'Add note' : 'Add task'} onClick={() => go(addTo)}>
            <Icon name="plus" size={28} />
          </button>
        )
      )}
    </nav>
  );
}
