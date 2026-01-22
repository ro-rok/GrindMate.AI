import api from '../api';

/**
 * Admin API Client
 * Functions for all admin endpoints with CSRF token handling and consistent error handling
 * 
 * Requirements: 14.1-14.9
 */

/**
 * Helper function to handle API errors consistently
 * @param {Error} error - The error object from axios
 * @returns {Object} Formatted error object
 */
function handleError(error) {
  if (error.response) {
    // Server responded with error status
    return {
      status: error.response.status,
      message: error.response.data?.error || error.response.data?.detail || 'An error occurred',
      data: error.response.data,
    };
  } else if (error.request) {
    // Request made but no response received
    return {
      status: 0,
      message: 'No response from server',
      data: null,
    };
  } else {
    // Error setting up request
    return {
      status: 0,
      message: error.message || 'Request failed',
      data: null,
    };
  }
}

/**
 * Import Endpoints
 */

/**
 * Preview GraphQL dump import without database changes
 * @param {string} raw - Raw GraphQL dump text
 * @param {string} listName - Name of the list being imported
 * @param {string} source - Source identifier (e.g., "leetcode_favorites")
 * @returns {Promise<Object>} Preview response with counts, sample, duplicates, errors
 * 
 * Requirement: 14.1
 */
export async function previewGraphQLImport(raw, listName, source = 'leetcode_favorites') {
  try {
    const response = await api.post('/api/admin/import/graphql-dump/preview', {
      raw,
      list_name: listName,
      source,
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: handleError(error) };
  }
}

/**
 * Commit GraphQL dump import with database upserts
 * @param {string} raw - Raw GraphQL dump text
 * @param {string} listName - Name of the list being imported
 * @param {string} source - Source identifier (e.g., "leetcode_favorites")
 * @returns {Promise<Object>} Commit response with counts, import_id, errors
 * 
 * Requirement: 14.2
 */
export async function commitGraphQLImport(raw, listName, source = 'leetcode_favorites') {
  try {
    const response = await api.post('/api/admin/import/graphql-dump/commit', {
      raw,
      list_name: listName,
      source,
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: handleError(error) };
  }
}

/**
 * Company Endpoints
 */

/**
 * Trigger CSV refresh for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Refresh response with counts
 * 
 * Requirement: 14.3
 */
export async function refreshCompany(companyId) {
  try {
    const response = await api.post(`/api/admin/companies/${companyId}/refresh`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: handleError(error) };
  }
}

/**
 * Question Endpoints
 */

/**
 * Search and filter questions with pagination
 * @param {Object} params - Query parameters
 * @param {string} params.q - Search query (title/titleSlug/frontendId)
 * @param {string} params.difficulty - Difficulty filter (EASY|MEDIUM|HARD)
 * @param {boolean} params.paidOnly - Filter by paid only
 * @param {string} params.status - Status filter (SOLVED|TO_DO|ATTEMPTED)
 * @param {string} params.source - Source filter
 * @param {number} params.page - Page number (default 1)
 * @param {number} params.limit - Items per page (default 50)
 * @returns {Promise<Object>} Questions response with pagination
 * 
 * Requirement: 14.4
 */
export async function getQuestions(params = {}) {
  try {
    const response = await api.get('/api/admin/questions', { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: handleError(error) };
  }
}

/**
 * Update question fields
 * @param {string} questionId - Question ID
 * @param {Object} updates - Fields to update
 * @param {string} updates.difficulty - Difficulty (EASY|MEDIUM|HARD)
 * @param {Array} updates.topics - Topics array [{name, slug}]
 * @param {number} updates.frequency - Frequency value
 * @param {number} updates.acceptance_rate - Acceptance rate (0-1)
 * @returns {Promise<Object>} Updated question
 * 
 * Requirement: 14.5
 */
export async function updateQuestion(questionId, updates) {
  try {
    const response = await api.patch(`/api/admin/questions/${questionId}`, updates);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: handleError(error) };
  }
}

/**
 * Mark question as removed
 * @param {string} questionId - Question ID
 * @returns {Promise<Object>} Updated question
 * 
 * Requirement: 14.6
 */
export async function markQuestionRemoved(questionId) {
  try {
    const response = await api.post(`/api/admin/questions/${questionId}/mark-removed`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: handleError(error) };
  }
}

/**
 * Unmark question as removed
 * @param {string} questionId - Question ID
 * @returns {Promise<Object>} Updated question
 * 
 * Requirement: 14.7
 */
export async function unmarkQuestionRemoved(questionId) {
  try {
    const response = await api.post(`/api/admin/questions/${questionId}/unremove`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: handleError(error) };
  }
}

/**
 * Dashboard Endpoints
 */

/**
 * Get dashboard statistics
 * @returns {Promise<Object>} Dashboard stats (total questions, total imports, recent activity)
 * 
 * Requirement: 18.2
 */
export async function getDashboardStats() {
  try {
    // Fetch stats from multiple endpoints
    const [questionsRes, importsRes, logsRes] = await Promise.allSettled([
      api.get('/api/admin/questions', { params: { limit: 1 } }),
      api.get('/api/admin/audit-logs', { params: { limit: 1, action: 'import_commit' } }),
      api.get('/api/admin/audit-logs', { params: { limit: 10 } }),
    ]);

    const stats = {
      totalQuestions: questionsRes.status === 'fulfilled' 
        ? questionsRes.value.data.pagination?.total || 0 
        : 0,
      totalImports: importsRes.status === 'fulfilled'
        ? importsRes.value.data.pagination?.total || 0
        : 0,
      recentLogs: logsRes.status === 'fulfilled'
        ? logsRes.value.data.logs || []
        : [],
    };

    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: handleError(error) };
  }
}

/**
 * Audit Log Endpoints
 */

/**
 * Get audit logs with filters and pagination
 * @param {Object} params - Query parameters
 * @param {string} params.action - Action filter
 * @param {string} params.actor - Actor filter (user_id or email)
 * @param {string} params.start_date - Start date (ISO format)
 * @param {string} params.end_date - End date (ISO format)
 * @param {number} params.page - Page number (default 1)
 * @param {number} params.limit - Items per page (default 50)
 * @returns {Promise<Object>} Audit logs response with pagination
 * 
 * Requirement: 14.8
 */
export async function getAuditLogs(params = {}) {
  try {
    const response = await api.get('/api/admin/audit-logs', { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: handleError(error) };
  }
}

/**
 * Export all admin API functions
 */
const adminApi = {
  // Dashboard
  getDashboardStats,
  
  // Import
  previewGraphQLImport,
  commitGraphQLImport,
  
  // Companies
  refreshCompany,
  
  // Questions
  getQuestions,
  updateQuestion,
  markQuestionRemoved,
  unmarkQuestionRemoved,
  
  // Audit Logs
  getAuditLogs,
};

export default adminApi;
