import { useEffect, useRef, useState } from 'react';
import * as ReactWindow from 'react-window';
import { motion } from 'framer-motion';
import { FaRobot } from 'react-icons/fa';
import QuestionCard from './QuestionCard';
import Button from '../ui/Button';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const { FixedSizeGrid } = ReactWindow;

/**
 * QuestionList component
 * Implements virtual scrolling for 100+ items
 * Adds stagger animation on mount
 * Handles solve/unsolve actions
 * Supports chat button per question
 */
const QuestionList = ({
  questions = [],
  onSolve,
  onUnsolve,
  onChat,
  onQuestionClick,
  isLoading = false,
  className = ''
}) => {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Calculate responsive grid layout
  const getColumnCount = (width) => {
    if (width < 640) return 1; // Mobile
    if (width < 1024) return 2; // Tablet
    return 3; // Desktop
  };

  const columnCount = getColumnCount(containerWidth);
  const columnWidth = containerWidth / columnCount;
  const rowHeight = 280; // Approximate card height with padding

  // Update container width on resize
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Stagger animation on mount
  useEffect(() => {
    if (questions.length > 0 && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [questions.length, hasAnimated]);

  // Calculate grid dimensions
  const rowCount = Math.ceil(questions.length / columnCount);

  // Cell renderer for virtual grid
  const Cell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= questions.length) return null;

    const question = questions[index];
    const solved = question.solved || false;

    // Stagger animation delay
    const animationDelay = prefersReducedMotion ? 0 : index * 0.05;

    const MotionDiv = prefersReducedMotion ? 'div' : motion.div;

    const animationProps = prefersReducedMotion ? {} : {
      initial: hasAnimated ? false : { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.4, delay: animationDelay, ease: 'easeOut' }
    };

    return (
      <div style={style}>
        <MotionDiv
          {...animationProps}
          className="p-3"
        >
          <QuestionCard
            question={question}
            solved={solved}
            onClick={() => onQuestionClick && onQuestionClick(question)}
            layoutId={`question-${question.id}`}
          />

          {/* Action buttons */}
          <div className="flex gap-2 mt-3 px-3">
            {solved ? (
              <Button
                variant="danger"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnsolve && onUnsolve(question.id);
                }}
                className="flex-1"
              >
                Unsolve
              </Button>
            ) : (
              <Button
                variant="success"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSolve && onSolve(question);
                }}
                className="flex-1"
              >
                Solve
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onChat && onChat(question);
              }}
              className="flex items-center gap-1"
            >
              <FaRobot /> AI
            </Button>
          </div>
        </MotionDiv>
      </div>
    );
  };

  // Empty state
  if (!isLoading && questions.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-text-tertiary text-lg mb-2">
          No questions found
        </div>
        <div className="text-text-secondary text-sm">
          Try adjusting your filters or selecting a different company
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && questions.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-text-secondary">Loading questions...</div>
      </div>
    );
  }

  // Use virtual scrolling for 100+ items, regular grid for smaller lists
  const useVirtualScrolling = questions.length >= 100;

  if (useVirtualScrolling) {
    return (
      <div ref={containerRef} className={className}>
        <FixedSizeGrid
          columnCount={columnCount}
          columnWidth={columnWidth}
          height={800} // Fixed height for virtual scrolling
          rowCount={rowCount}
          rowHeight={rowHeight}
          width={containerWidth}
          overscanRowCount={2}
        >
          {Cell}
        </FixedSizeGrid>
      </div>
    );
  }

  // Regular grid for smaller lists
  return (
    <div ref={containerRef} className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {questions.map((question, index) => {
          const solved = question.solved || false;
          const animationDelay = prefersReducedMotion ? 0 : index * 0.05;

          const MotionDiv = prefersReducedMotion ? 'div' : motion.div;

          const animationProps = prefersReducedMotion ? {} : {
            initial: hasAnimated ? false : { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.4, delay: animationDelay, ease: 'easeOut' }
          };

          return (
            <MotionDiv key={question.id} {...animationProps}>
              <QuestionCard
                question={question}
                solved={solved}
                onClick={() => onQuestionClick && onQuestionClick(question)}
                layoutId={`question-${question.id}`}
              />

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                {solved ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnsolve && onUnsolve(question.id);
                    }}
                    className="flex-1"
                  >
                    Unsolve
                  </Button>
                ) : (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSolve && onSolve(question);
                    }}
                    className="flex-1"
                  >
                    Solve
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChat && onChat(question);
                  }}
                  className="flex items-center gap-1"
                >
                  <FaRobot /> AI
                </Button>
              </div>
            </MotionDiv>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionList;
