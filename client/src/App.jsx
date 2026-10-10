import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Nav from './components/Nav.jsx';
import Welcome from './pages/Welcome.jsx';
import Auth from './pages/Auth.jsx';
import Today from './pages/Today.jsx';
import Upcoming from './pages/Upcoming.jsx';
import Projects from './pages/Projects.jsx';
import Notes from './pages/Notes.jsx';
import NoteEditor from './pages/NoteEditor.jsx';
import TaskForm from './pages/TaskForm.jsx';
import Profile from './pages/Profile.jsx';

// Only logged-in users get past this gate.
function Private() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading…</p>;
  return user ? <Outlet /> : <Navigate to="/welcome" replace />;
}
// Main tabs show the bottom navigation; editing screens do not.
const WithNav = () => (<><Outlet /><Nav /></>);

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/signup" element={<Auth mode="signup" />} />
      <Route element={<Private />}>
        <Route element={<WithNav />}>
          <Route path="/" element={<Today />} />
          <Route path="/upcoming" element={<Upcoming />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/notes" element={<Notes />} />
        </Route>
        <Route path="/notes/:id" element={<NoteEditor />} />
        <Route path="/tasks/:id" element={<TaskForm />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
