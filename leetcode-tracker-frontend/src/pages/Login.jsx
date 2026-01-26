import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { SECURITY_QUESTIONS } from '../constants/securityQuestions';

/**
 * Login/Register page
 * Full-page authentication with tab switching between login and signup
 */
function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useUIStore();
  
  const { login, register, isAuthenticated, isLoading, error: authError } = useAuthStore();
  
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestionId, setSecurityQuestionId] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [error, setError] = useState(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Update error from authStore
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    try {
      if (mode === 'login') {
        await login(email, password);
        showToast('Welcome back!', 'success');
      } else {
        // Get user's timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Security question is optional but recommended
        const questionId = securityQuestionId ? parseInt(securityQuestionId) : null;
        const answer = securityAnswer.trim() || null;
        await register(email, password, timezone, questionId, answer);
        showToast('Account created successfully!', 'success');
      }
    } catch (err) {
      setError(err.message || `${mode === 'login' ? 'Login' : 'Signup'} failed`);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setConfirmPassword('');
    setSecurityQuestionId('');
    setSecurityAnswer('');
  };

  return (
    <div className="min-h-screen bg-black-base flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-bold text-text-primary mb-2">
              GrindMate<span className="text-accent-primary">.AI</span>
            </h1>
          </Link>
          <p className="text-text-secondary">
            Your premium LeetCode study companion
          </p>
        </div>

        <Card className="p-8">
          {/* Mode tabs */}
          <div className="flex gap-4 mb-6" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              aria-controls="auth-panel"
              onClick={() => setMode('login')}
              className={`flex-1 pb-2 text-center font-semibold transition-all border-b-2 ${
                mode === 'login'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              aria-controls="auth-panel"
              onClick={() => setMode('signup')}
              className={`flex-1 pb-2 text-center font-semibold transition-all border-b-2 ${
                mode === 'signup'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-accent-danger/10 border border-accent-danger/30 rounded-lg text-accent-danger text-sm"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" id="auth-panel" role="tabpanel">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2 bg-black-elevated border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                placeholder="you@example.com"
                disabled={isLoading}
                aria-required="true"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-2 bg-black-elevated border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                placeholder="••••••••"
                disabled={isLoading}
                aria-required="true"
              />
            </div>

            {mode === 'signup' && (
              <>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-2 bg-black-elevated border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                    placeholder="••••••••"
                    disabled={isLoading}
                    aria-required="true"
                  />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label htmlFor="securityQuestion" className="block text-sm font-medium text-text-secondary mb-1">
                    Security Question (Optional but recommended for password recovery)
                  </label>
                  <select
                    id="securityQuestion"
                    value={securityQuestionId}
                    onChange={(e) => setSecurityQuestionId(e.target.value)}
                    className="w-full px-4 py-2 bg-black-elevated border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                    disabled={isLoading}
                  >
                    <option value="">Select a security question...</option>
                    {SECURITY_QUESTIONS.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.question}
                      </option>
                    ))}
                  </select>
                  
                  {securityQuestionId && (
                    <div>
                      <label htmlFor="securityAnswer" className="block text-sm font-medium text-text-secondary mb-1">
                        Security Answer
                      </label>
                      <input
                        id="securityAnswer"
                        type="text"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        className="w-full px-4 py-2 bg-black-elevated border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                        placeholder="Your answer"
                        disabled={isLoading}
                      />
                    </div>
                  )}
                </motion.div>
              </>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin" aria-hidden="true">⏳</span>
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </Button>
            
            {mode === 'login' && (
              <div className="text-center">
                <Link
                  to="/forget-password"
                  className="text-sm text-accent-primary hover:text-accent-primary-hover font-medium transition-colors focus:outline-none focus:underline"
                >
                  Forgot Password?
                </Link>
              </div>
            )}
          </form>

          {/* Switch mode */}
          <div className="mt-6 text-center text-sm text-text-secondary">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-accent-primary hover:text-accent-primary-hover font-medium transition-colors focus:outline-none focus:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-accent-primary hover:text-accent-primary-hover font-medium transition-colors focus:outline-none focus:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </Card>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus:underline"
          >
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
