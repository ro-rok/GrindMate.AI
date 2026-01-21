/**
 * Pattern mapping utilities
 * Helpers for working with problem-solving patterns
 */

/**
 * Pattern definitions with metadata
 */
export const PATTERNS = {
  'two-pointers': {
    name: 'Two Pointers',
    description: 'Use two pointers to traverse data structure',
    color: '#0ea5e9',
  },
  'sliding-window': {
    name: 'Sliding Window',
    description: 'Maintain a window of elements',
    color: '#10b981',
  },
  'dfs': {
    name: 'Depth-First Search',
    description: 'Explore as far as possible before backtracking',
    color: '#f59e0b',
  },
  'bfs': {
    name: 'Breadth-First Search',
    description: 'Explore level by level',
    color: '#8b5cf6',
  },
  'dynamic-programming': {
    name: 'Dynamic Programming',
    description: 'Break down into overlapping subproblems',
    color: '#ef4444',
  },
  'binary-search': {
    name: 'Binary Search',
    description: 'Divide and conquer on sorted data',
    color: '#06b6d4',
  },
  'monotonic-stack': {
    name: 'Monotonic Stack',
    description: 'Maintain monotonic order in stack',
    color: '#ec4899',
  },
  'union-find': {
    name: 'Union Find',
    description: 'Track connected components',
    color: '#14b8a6',
  },
  'backtracking': {
    name: 'Backtracking',
    description: 'Explore all possibilities with pruning',
    color: '#f97316',
  },
  'greedy': {
    name: 'Greedy',
    description: 'Make locally optimal choices',
    color: '#84cc16',
  },
  'hash-table': {
    name: 'Hash Table',
    description: 'Use hash map for O(1) lookups',
    color: '#6366f1',
  },
  'heap': {
    name: 'Heap',
    description: 'Priority queue for min/max operations',
    color: '#a855f7',
  },
  'trie': {
    name: 'Trie',
    description: 'Prefix tree for string operations',
    color: '#22d3ee',
  },
  'graph': {
    name: 'Graph',
    description: 'Model relationships between entities',
    color: '#fb923c',
  },
  'tree': {
    name: 'Tree',
    description: 'Hierarchical data structure',
    color: '#4ade80',
  },
};

/**
 * Get pattern metadata
 * @param {string} patternKey - Pattern key (e.g., 'two-pointers')
 * @returns {Object} Pattern metadata
 */
export function getPattern(patternKey) {
  return PATTERNS[patternKey] || {
    name: patternKey,
    description: '',
    color: '#737373',
  };
}

/**
 * Get all pattern keys
 * @returns {string[]} Array of pattern keys
 */
export function getAllPatternKeys() {
  return Object.keys(PATTERNS);
}

/**
 * Format pattern name for display
 * @param {string} patternKey - Pattern key
 * @returns {string} Formatted name
 */
export function formatPatternName(patternKey) {
  const pattern = getPattern(patternKey);
  return pattern.name;
}

/**
 * Parse topics string into array
 * @param {string} topics - Comma-separated topics
 * @returns {string[]} Array of topics
 */
export function parseTopics(topics) {
  if (!topics) return [];
  return topics.split(',').map((t) => t.trim()).filter(Boolean);
}

/**
 * Derive patterns from topics (client-side approximation)
 * Note: Server has authoritative mapping in patterns_v1.json
 * @param {string[]} topics - Array of topics
 * @returns {string[]} Array of pattern keys
 */
export function derivePatterns(topics) {
  if (!topics || topics.length === 0) return [];
  
  const patterns = new Set();
  
  // Simple keyword matching (server has more sophisticated mapping)
  topics.forEach((topic) => {
    const lower = topic.toLowerCase();
    
    if (lower.includes('two pointer') || lower.includes('two-pointer')) {
      patterns.add('two-pointers');
    }
    if (lower.includes('sliding window')) {
      patterns.add('sliding-window');
    }
    if (lower.includes('dfs') || lower.includes('depth-first')) {
      patterns.add('dfs');
    }
    if (lower.includes('bfs') || lower.includes('breadth-first')) {
      patterns.add('bfs');
    }
    if (lower.includes('dynamic programming') || lower.includes('dp')) {
      patterns.add('dynamic-programming');
    }
    if (lower.includes('binary search')) {
      patterns.add('binary-search');
    }
    if (lower.includes('stack') && lower.includes('monotonic')) {
      patterns.add('monotonic-stack');
    }
    if (lower.includes('union find') || lower.includes('disjoint set')) {
      patterns.add('union-find');
    }
    if (lower.includes('backtrack')) {
      patterns.add('backtracking');
    }
    if (lower.includes('greedy')) {
      patterns.add('greedy');
    }
    if (lower.includes('hash') || lower.includes('map')) {
      patterns.add('hash-table');
    }
    if (lower.includes('heap') || lower.includes('priority queue')) {
      patterns.add('heap');
    }
    if (lower.includes('trie')) {
      patterns.add('trie');
    }
    if (lower.includes('graph')) {
      patterns.add('graph');
    }
    if (lower.includes('tree') && !lower.includes('trie')) {
      patterns.add('tree');
    }
  });
  
  return Array.from(patterns);
}

/**
 * Group questions by pattern
 * @param {Object[]} questions - Array of questions
 * @returns {Object} Object with pattern keys as keys and question arrays as values
 */
export function groupByPattern(questions) {
  const grouped = {};
  
  questions.forEach((question) => {
    if (!question.patterns || question.patterns.length === 0) {
      if (!grouped['uncategorized']) {
        grouped['uncategorized'] = [];
      }
      grouped['uncategorized'].push(question);
      return;
    }
    
    question.patterns.forEach((pattern) => {
      if (!grouped[pattern]) {
        grouped[pattern] = [];
      }
      grouped[pattern].push(question);
    });
  });
  
  return grouped;
}

/**
 * Calculate pattern distribution for user
 * @param {Object[]} userQuestions - Array of user question records
 * @returns {Object} Pattern distribution with solved/total counts
 */
export function calculatePatternDistribution(userQuestions) {
  const distribution = {};
  
  userQuestions.forEach((uq) => {
    if (!uq.question || !uq.question.patterns) return;
    
    uq.question.patterns.forEach((pattern) => {
      if (!distribution[pattern]) {
        distribution[pattern] = { solved: 0, total: 0 };
      }
      distribution[pattern].total += 1;
      if (uq.solved) {
        distribution[pattern].solved += 1;
      }
    });
  });
  
  return distribution;
}
