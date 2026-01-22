import Modal from './Modal';
import Button from './Button';

/**
 * ConfirmationModal Component
 * Reusable confirmation dialog for destructive actions
 * 
 * Features:
 * - Customizable title, message, and button labels
 * - Danger variant for destructive actions
 * - Loading state support
 * - Keyboard shortcuts (Enter to confirm, Escape to cancel)
 */
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  isLoading = false,
}) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!isLoading}
    >
      <div onKeyDown={handleKeyDown}>
        {/* Warning Icon */}
        <div 
          className="mb-4 flex justify-center"
        >
          <div 
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: variant === 'danger' 
                ? 'rgba(239, 68, 68, 0.1)' 
                : variant === 'warning'
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(14, 165, 233, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg
              className="w-8 h-8"
              style={{ 
                color: variant === 'danger' 
                  ? 'var(--accent-danger)' 
                  : variant === 'warning'
                  ? 'var(--accent-warning)'
                  : 'var(--accent-primary)'
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Message */}
        <p 
          className="text-center mb-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            loading={isLoading}
            disabled={isLoading}
            autoFocus
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
