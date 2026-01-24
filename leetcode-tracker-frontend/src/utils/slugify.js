/**
 * Utility functions for creating URL-friendly slugs
 */

/**
 * Convert company name to URL-friendly slug
 * @param {string} name - Company name
 * @returns {string} - URL-friendly slug
 */
export function slugifyCompany(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '').replace(/,/g, '');
}

/**
 * Convert question title to URL-friendly slug
 * @param {string} title - Question title
 * @returns {string} - URL-friendly slug
 */
export function slugifyQuestion(title) {
  if (!title) return '';
  // Remove special characters and convert to lowercase
  let slug = title.toLowerCase().replace(/[^\w\s-]/g, '');
  // Replace spaces with hyphens
  slug = slug.replace(/[-\s]+/g, '-');
  return slug.trim().replace(/^-+|-+$/g, '');
}

/**
 * Get question identifier for URL (prefer titleSlug, fallback to slugified title or ID)
 * @param {object} question - Question object
 * @returns {string} - Question identifier for URL
 */
export function getQuestionIdentifier(question) {
  if (!question) return '';
  return question.titleSlug || slugifyQuestion(question.title) || question.question_id || question.id;
}

/**
 * Get company identifier for URL (prefer slug, fallback to slugified name or ID)
 * @param {object} company - Company object
 * @returns {string} - Company identifier for URL
 */
export function getCompanyIdentifier(company) {
  if (!company) return '';
  return company.slug || slugifyCompany(company.name) || company.id || company._id;
}
