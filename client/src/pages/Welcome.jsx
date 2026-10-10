import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Flower from '../components/Flower.jsx';

export default function Welcome() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return (
    <main className="welcome">
      <div className="welcome-art"><Flower size={260} center="#fff" mark="#141414" /></div>
      <h1>Plan your day, gently.</h1>
      <p>Tasks and notes in one calm place.</p>
      <Link className="btn btn-light" to="/signup">Get started</Link>
      <Link className="link-light" to="/login">I already have an account</Link>
    </main>
  );
}
