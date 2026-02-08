import QuestionRow from './QuestionRow';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';

/**
 * QuestionListView component
 * Dense list view for questions (Linear-style)
 * Renders all questions normally to avoid nested scrolling issues
 */
function QuestionListView({
  questions,
  onQuestionClick,
  onStart,
  onAskAI,
  onMarkSolved,
  onStar,
  onOpenLeetCode,
  isLoading = false,
  itemHeight = 64, // Dense row height (for skeleton)
}) {
  // Calculate max frequency for percentage-based frequency bars
  const maxFrequency = questions.length > 0 
    ? Math.max(...questions.map(q => q.frequency || 0))
    : 100;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} variant="row" height={itemHeight} className="rounded-[var(--radius-md)]" />
        ))}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <EmptyState
        icon="🔍"
        title="No questions found"
        message="Try adjusting your filters or populating questions"
      />
    );
  }

  // Render all questions normally - no virtualization to avoid nested scroll
  return (
    <div className="w-full space-y-[var(--space-1_5)] overflow-x-hidden">
      {questions.map((question, index) => (
        <QuestionRow
          key={question.id || index}
          question={question}
          solved={question.solved || false}
          attempted={question.attempted || false}
          starred={question.starred || false}
          onStart={onQuestionClick || onStart}
          onAskAI={onAskAI}
          onMarkSolved={onMarkSolved}
          onStar={onStar}
          onOpenLeetCode={onOpenLeetCode}
          layoutId={`question-${question.id}`}
          maxFrequency={maxFrequency}
        />
      ))}
    </div>
  );
}

export default QuestionListView;
