import { List } from 'react-window';
import QuestionRow from './QuestionRow';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';

/**
 * QuestionListView component
 * Virtualized list view for questions (default view)
 */
function QuestionListView({
  questions,
  onQuestionClick,
  onStart,
  onAskAI,
  onMarkSolved,
  onStar,
  isLoading = false,
  itemHeight = 100,
}) {
  const Row = ({ index, style }) => {
    const question = questions[index];
    if (!question) return null;

    return (
      <div style={style} className="px-2">
        <QuestionRow
          question={question}
          solved={question.solved}
          attempted={question.attempted}
          onStart={onStart}
          onAskAI={onAskAI}
          onMarkSolved={onMarkSolved}
          onStar={onStar}
          onBookmark={() => {}}
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} variant="row" height={itemHeight} className="rounded-lg" />
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

  return (
    <div className="w-full">
      <List
        rowComponent={Row}
        rowCount={questions.length}
        rowHeight={itemHeight}
        rowProps={{}}
        style={{ height: 600, width: '100%' }}
        className="question-list"
      />
    </div>
  );
}

export default QuestionListView;
