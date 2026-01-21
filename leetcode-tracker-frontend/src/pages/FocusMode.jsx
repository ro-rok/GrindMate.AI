import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useUIStore from '../store/uiStore';
import useTutorStore from '../store/tutorStore';

/**
 * Focus mode page (modal-style route)
 * Full-screen problem view with AI tutor sidebar
 */
function FocusMode() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { openFocusMode, closeFocusMode } = useUIStore();
  const { setCurrentQuestion } = useTutorStore();

  useEffect(() => {
    openFocusMode(questionId);
    setCurrentQuestion(questionId);

    return () => {
      closeFocusMode();
    };
  }, [questionId, openFocusMode, closeFocusMode, setCurrentQuestion]);

  const handleClose = () => {
    // Navigate back to previous page
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 bg-black-base z-50">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <h1 className="text-xl font-semibold text-gray-50">
            Focus Mode - Question {questionId}
          </h1>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-400 hover:text-gray-50 transition-colors"
          >
            Close (Esc)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8">
          <p className="text-gray-400">To be implemented</p>
        </div>
      </div>
    </div>
  );
}

export default FocusMode;
