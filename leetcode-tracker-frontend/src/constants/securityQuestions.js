/**
 * Predefined Security Questions
 * 
 * These questions are used for password recovery.
 * Users select one during registration and must answer it to reset their password.
 */

export const SECURITY_QUESTIONS = [
  { id: 1, question: "What city were you born in?" },
  { id: 2, question: "What was the name of your first pet?" },
  { id: 3, question: "What was your mother's maiden name?" },
  { id: 4, question: "What was the name of your elementary school?" },
  { id: 5, question: "What was your childhood nickname?" },
  { id: 6, question: "What street did you grow up on?" },
  { id: 7, question: "What was the make of your first car?" },
  { id: 8, question: "What is your favorite movie?" },
  { id: 9, question: "What was your favorite food as a child?" },
  { id: 10, question: "What is the name of your best friend from childhood?" },
];

/**
 * Get security question by ID
 */
export function getSecurityQuestionById(id) {
  return SECURITY_QUESTIONS.find(q => q.id === id);
}
