import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * Landing page
 * Redirects to dashboard if authenticated, otherwise shows landing content
 */
function Landing() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-black-base flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-50 mb-4">
          GrindMate.AI
        </h1>
        <p className="text-gray-400 mb-8">
          Your cinematic LeetCode study companion
        </p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover transition-colors"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

export default Landing;
