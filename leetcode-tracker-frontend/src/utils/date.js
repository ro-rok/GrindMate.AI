/**
 * Timezone-aware date utilities
 * Handles date calculations respecting user's local timezone
 */

/**
 * Get user's timezone (IANA format)
 * @returns {string} Timezone string (e.g., 'America/Los_Angeles')
 */
export function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get current date in user's timezone
 * @returns {Date} Current date
 */
export function getCurrentDate() {
  return new Date();
}

/**
 * Get date string in YYYY-MM-DD format for user's timezone
 * @param {Date} date - Date object
 * @returns {string} Date string
 */
export function formatDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date string in user's timezone
 * @returns {string} Date string (YYYY-MM-DD)
 */
export function getTodayString() {
  return formatDateString(getCurrentDate());
}

/**
 * Parse date string to Date object
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {Date} Date object
 */
export function parseDateString(dateString) {
  return new Date(dateString + 'T00:00:00');
}

/**
 * Calculate days between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Number of days (can be negative)
 */
export function daysBetween(date1, date2) {
  const d1 = typeof date1 === 'string' ? parseDateString(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseDateString(date2) : date2;
  
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if two dates are consecutive days
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date (should be after date1)
 * @returns {boolean} True if dates are consecutive
 */
export function areConsecutiveDays(date1, date2) {
  return daysBetween(date1, date2) === 1;
}

/**
 * Check if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  const dateStr = typeof date === 'string' ? date : formatDateString(date);
  return dateStr === getTodayString();
}

/**
 * Check if date is yesterday
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is yesterday
 */
export function isYesterday(date) {
  const dateStr = typeof date === 'string' ? date : formatDateString(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === formatDateString(yesterday);
}

/**
 * Get date N days ago
 * @param {number} days - Number of days ago
 * @returns {Date} Date object
 */
export function getDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Format date for display (e.g., "Jan 22, 2025")
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDisplayDate(date) {
  const d = typeof date === 'string' ? parseDateString(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format relative time (e.g., "2 days ago", "just now")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  const d = typeof date === 'string' ? parseDateString(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/**
 * Generate calendar heatmap data for last N days
 * @param {Object[]} solveRecords - Array of solve records with date field
 * @param {number} days - Number of days to include (default: 30)
 * @returns {Object[]} Array of { date, count } objects
 */
export function generateHeatmapData(solveRecords, days = 30) {
  const heatmap = [];
  const today = new Date();
  
  // Initialize all days with 0 count
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    heatmap.push({
      date: formatDateString(date),
      count: 0,
    });
  }
  
  // Count solves per day
  solveRecords.forEach((record) => {
    const dateStr = typeof record.date === 'string' 
      ? record.date 
      : formatDateString(record.date);
    
    const entry = heatmap.find((h) => h.date === dateStr);
    if (entry) {
      entry.count += 1;
    }
  });
  
  return heatmap;
}

/**
 * Calculate streak from solve dates
 * @param {string[]} solveDates - Array of date strings (YYYY-MM-DD), sorted descending
 * @returns {Object} { currentStreak, longestStreak }
 */
export function calculateStreak(solveDates) {
  if (!solveDates || solveDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  const today = getTodayString();
  const yesterday = formatDateString(getDaysAgo(1));
  
  // Check if user solved today or yesterday (streak is still active)
  if (solveDates[0] === today || solveDates[0] === yesterday) {
    currentStreak = 1;
    tempStreak = 1;
    
    // Count consecutive days
    for (let i = 1; i < solveDates.length; i++) {
      const prevDate = solveDates[i - 1];
      const currDate = solveDates[i];
      
      if (areConsecutiveDays(currDate, prevDate)) {
        currentStreak += 1;
        tempStreak += 1;
      } else {
        break;
      }
    }
    
    longestStreak = currentStreak;
    
    // Continue checking for longest streak
    for (let i = currentStreak; i < solveDates.length; i++) {
      if (i === 0 || areConsecutiveDays(solveDates[i], solveDates[i - 1])) {
        tempStreak += 1;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
  } else {
    // Streak is broken, but calculate longest historical streak
    tempStreak = 1;
    longestStreak = 1;
    
    for (let i = 1; i < solveDates.length; i++) {
      if (areConsecutiveDays(solveDates[i], solveDates[i - 1])) {
        tempStreak += 1;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
  }
  
  return { currentStreak, longestStreak };
}

/**
 * Get midnight timestamp for user's timezone
 * @param {Date} date - Date to get midnight for (default: today)
 * @returns {Date} Midnight date
 */
export function getMidnight(date = new Date()) {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);
  return midnight;
}

/**
 * Get next midnight timestamp for user's timezone
 * @returns {Date} Next midnight date
 */
export function getNextMidnight() {
  const midnight = getMidnight();
  midnight.setDate(midnight.getDate() + 1);
  return midnight;
}

/**
 * Format duration in seconds to human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "2h 30m", "45m", "30s")
 */
export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}
