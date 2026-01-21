/**
 * Priority score calculation utilities
 * Client-side implementation matching backend smart random algorithm
 */

/**
 * Calculate timeframe weight
 * @param {string} timeframe - '30_days' | '90_days' | 'more_than_six_months' | 'all_time'
 * @returns {number} Weight value (0-3)
 */
export function calculateTimeframeWeight(timeframe) {
  const weights = {
    '30_days': 3,
    '90_days': 2,
    'more_than_six_months': 1,
    'all_time': 0,
  };
  return weights[timeframe] || 0;
}

/**
 * Calculate weakness weight based on user's weak patterns
 * @param {string[]} questionPatterns - Patterns associated with the question
 * @param {string[]} weakPatterns - User's weak patterns
 * @returns {number} Weight value (0 or 2)
 */
export function calculateWeaknessWeight(questionPatterns, weakPatterns) {
  if (!questionPatterns || !weakPatterns) return 0;
  
  // If any question pattern matches a weak pattern, boost by 2
  const hasWeakPattern = questionPatterns.some((pattern) =>
    weakPatterns.includes(pattern)
  );
  
  return hasWeakPattern ? 2 : 0;
}

/**
 * Calculate difficulty weight based on recent solve rate
 * @param {number} recentSolveRate - Solve rate for last 10 questions (0-1)
 * @param {string} difficulty - 'EASY' | 'MEDIUM' | 'HARD'
 * @returns {number} Weight value (0-2)
 */
export function calculateDifficultyWeight(recentSolveRate, difficulty) {
  if (recentSolveRate > 0.7) {
    // User is doing well, challenge them
    const weights = { EASY: 0, MEDIUM: 1, HARD: 2 };
    return weights[difficulty] || 1;
  } else if (recentSolveRate < 0.4) {
    // User is struggling, ease up
    const weights = { EASY: 2, MEDIUM: 1, HARD: 0 };
    return weights[difficulty] || 1;
  } else {
    // Neutral
    return 1;
  }
}

/**
 * Calculate novelty weight to penalize recently selected questions
 * @param {string} questionId - Question ID
 * @param {string[]} recentSelections - Last 10 question IDs selected
 * @returns {number} Weight value (-2 to 0)
 */
export function calculateNoveltyWeight(questionId, recentSelections) {
  if (!recentSelections || recentSelections.length === 0) return 0;
  
  const index = recentSelections.indexOf(questionId);
  if (index === -1) return 0;
  
  // Penalize based on recency (more recent = higher penalty)
  // Position 0 (most recent) = -2, Position 9 (oldest) = -0.2
  const penalty = -2 * (1 - index / 10);
  return penalty;
}

/**
 * Calculate composite priority score for a question
 * @param {Object} question - Question object
 * @param {Object} userStats - User statistics
 * @param {string[]} recentSelections - Last 10 question IDs selected
 * @returns {number} Priority score
 */
export function calculatePriorityScore(question, userStats, recentSelections = []) {
  const timeframeWeight = calculateTimeframeWeight(question.timeframe);
  const weaknessWeight = calculateWeaknessWeight(
    question.patterns,
    userStats.weakPatterns || []
  );
  const difficultyWeight = calculateDifficultyWeight(
    userStats.recentSolveRate || 0.5,
    question.difficulty
  );
  const noveltyWeight = calculateNoveltyWeight(question.id, recentSelections);
  
  return timeframeWeight + weaknessWeight + difficultyWeight + noveltyWeight;
}

/**
 * Sort questions by priority score
 * @param {Object[]} questions - Array of questions
 * @param {Object} userStats - User statistics
 * @param {string[]} recentSelections - Last 10 question IDs selected
 * @returns {Object[]} Sorted questions with priority scores
 */
export function sortByPriority(questions, userStats, recentSelections = []) {
  return questions
    .map((question) => ({
      ...question,
      priorityScore: calculatePriorityScore(question, userStats, recentSelections),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Select a random question from top 20% by priority
 * @param {Object[]} questions - Array of questions with priority scores
 * @returns {Object|null} Selected question or null if no questions
 */
export function selectWeightedRandom(questions) {
  if (!questions || questions.length === 0) return null;
  
  // Get top 20% (minimum 1, maximum all)
  const topCount = Math.max(1, Math.ceil(questions.length * 0.2));
  const topQuestions = questions.slice(0, topCount);
  
  // Calculate total weight (use exponential to favor higher scores)
  const weights = topQuestions.map((q) => Math.exp(q.priorityScore));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  // Select random question weighted by score
  let random = Math.random() * totalWeight;
  for (let i = 0; i < topQuestions.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return topQuestions[i];
    }
  }
  
  // Fallback to first question
  return topQuestions[0];
}
