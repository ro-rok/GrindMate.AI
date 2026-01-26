import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

/**
 * Forget Password Page
 * Multi-step flow for password reset using security questions
 * 
 * Step 1: Enter email → fetch security question
 * Step 2: Answer security question and enter new password
 * Step 3: Success confirmation
 */
function ForgetPassword() {
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const { forgetPasswordInitiate, forgetPasswordVerify, isLoading } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(null);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);

  const handleStep1 = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Email is required');
      return;
    }

    try {
      const data = await forgetPasswordInitiate(email);
      setSecurityQuestion({
        id: data.security_question_id,
        question: data.security_question,
      });
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to initiate password reset');
    }
  };

  const handleStep2 = async (e) => {
    e.preventDefault();
    setError(null);

    if (!securityAnswer || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await forgetPasswordVerify(email, securityAnswer, newPassword);
      setStep(3);
      showToast('Password reset successfully!', 'success');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSecurityQuestion(null);
      setSecurityAnswer('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
    } else {
      navigate('/login');
    }
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
            Reset your password
          </p>
        </div>

        <Card className="p-8">
          {/* Step indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-accent-primary text-white' : 'bg-black-elevated text-text-secondary'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? 'bg-accent-primary' : 'bg-black-elevated'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-accent-primary text-white' : 'bg-black-elevated text-text-secondary'
              }`}>
                2
              </div>
              <div className={`w-16 h-1 ${step >= 3 ? 'bg-accent-primary' : 'bg-black-elevated'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3 ? 'bg-accent-primary text-white' : 'bg-black-elevated text-text-secondary'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-accent-danger/10 border border-accent-danger/30 rounded-lg text-accent-danger text-sm"
              role="alert"
            >
              {error}
            </motion.div>
          )}

          {/* Step 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                  Email Address
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
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBack}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Back to Login
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Continue'}
                </Button>
              </div>
            </form>
          )}

          {/* Step 2: Answer Security Question and Set New Password */}
          {step === 2 && securityQuestion && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Security Question
                </label>
                <div className="p-3 bg-black-elevated border border-border-subtle rounded-lg text-text-primary">
                  {securityQuestion.question}
                </div>
              </div>

              <div>
                <label htmlFor="securityAnswer" className="block text-sm font-medium text-text-secondary mb-1">
                  Your Answer
                </label>
                <input
                  id="securityAnswer"
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-black-elevated border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                  placeholder="Enter your answer"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-text-secondary mb-1">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-2 bg-black-elevated border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-1">
                  Confirm New Password
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
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBack}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-text-primary">
                Password Reset Successful!
              </h2>
              <p className="text-text-secondary">
                Your password has been reset. You can now log in with your new password.
              </p>
              <Button
                variant="primary"
                onClick={() => navigate('/login')}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          )}
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

export default ForgetPassword;
