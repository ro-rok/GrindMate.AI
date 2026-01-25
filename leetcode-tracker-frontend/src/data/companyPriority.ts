/**
 * Company Priority System
 * Defines tiers and priority scores for companies
 */

export type CompanyTier = 'S' | 'A' | 'Quant' | 'India' | 'B' | 'C';

export interface CompanyPriority {
  tier: CompanyTier;
  score: number;
}

// Tier S: Top tech companies (10 companies)
const TIER_S_COMPANIES = [
  'Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix',
  'OpenAI', 'Uber', 'Stripe', 'Databricks', 'Snowflake'
];

// Tier A: Strong tech companies (10 companies)
const TIER_A_COMPANIES = [
  'Atlassian', 'Salesforce', 'Palantir', 'Coinbase', 'DoorDash', 'Airbnb',
  'LinkedIn', 'Nvidia', 'Oracle', 'Walmart Labs'
];

// Quant: Quantitative trading firms (9 companies)
const TIER_QUANT_COMPANIES = [
  'Jane Street', 'Citadel', 'Hudson River Trading', 'Two Sigma', 'Jump Trading',
  'DRW', 'IMC', 'Optiver', 'AQR'
];

// India Product: Indian product companies (10 companies)
const TIER_INDIA_COMPANIES = [
  'Flipkart', 'Swiggy', 'Zomato', 'Razorpay', 'PhonePe', 'Paytm', 'Meesho',
  'CRED', 'Zerodha', 'Myntra'
];

// Tier B: Strong but not "top" companies
const TIER_B_COMPANIES = [
  'Intuit', 'LinkedIn', 'Booking.com', 'Expedia', 'DoorDash', 'Walmart Labs',
  'SAP', 'ServiceNow', 'Workday', 'Okta', 'Visa', 'Mastercard', 'PayPal',
  'Bloomberg', 'Arista', 'Confluent', 'Datadog', 'CrowdStrike'
];

// Tier C: Everything else (default fallback)
// No explicit list - everything not in S/A/Quant/India/B falls into C

// Create a map for quick lookup
const companyTierMap = new Map<string, CompanyPriority>();

// Add Tier S companies
TIER_S_COMPANIES.forEach(company => {
  companyTierMap.set(company.toLowerCase(), { tier: 'S', score: 100 });
});

// Add Tier A companies
TIER_A_COMPANIES.forEach(company => {
  companyTierMap.set(company.toLowerCase(), { tier: 'A', score: 80 });
});

// Add Quant companies
TIER_QUANT_COMPANIES.forEach(company => {
  companyTierMap.set(company.toLowerCase(), { tier: 'Quant', score: 70 });
});

// Add India Product companies
TIER_INDIA_COMPANIES.forEach(company => {
  companyTierMap.set(company.toLowerCase(), { tier: 'India', score: 60 });
});

// Add Tier B companies
TIER_B_COMPANIES.forEach(company => {
  companyTierMap.set(company.toLowerCase(), { tier: 'B', score: 50 });
});

/**
 * Get company priority by name
 */
export function getCompanyPriority(companyName: string): CompanyPriority {
  const normalized = companyName.toLowerCase().trim();
  return companyTierMap.get(normalized) || { tier: 'Low', score: 20 };
}

/**
 * Get all companies in a tier
 */
export function getCompaniesByTier(tier: CompanyTier): string[] {
  switch (tier) {
    case 'S':
      return TIER_S_COMPANIES;
    case 'A':
      return TIER_A_COMPANIES;
    case 'Quant':
      return TIER_QUANT_COMPANIES;
    case 'India':
      return TIER_INDIA_COMPANIES;
    case 'B':
      return TIER_B_COMPANIES;
    case 'C':
      return []; // Tier C is everything else, no explicit list
    default:
      return [];
  }
}

/**
 * Check if company is in top tiers (S or A)
 */
export function isTopTierCompany(companyName: string): boolean {
  const priority = getCompanyPriority(companyName);
  return priority.tier === 'S' || priority.tier === 'A';
}

/**
 * Sort companies by priority
 */
export function sortCompaniesByPriority(companies: Array<{ name: string; [key: string]: any }>): Array<{ name: string; [key: string]: any }> {
  return [...companies].sort((a, b) => {
    const priorityA = getCompanyPriority(a.name);
    const priorityB = getCompanyPriority(b.name);
    
    // Sort by score (higher first)
    if (priorityA.score !== priorityB.score) {
      return priorityB.score - priorityA.score;
    }
    
    // If same score, sort alphabetically
    return a.name.localeCompare(b.name);
  });
}

/**
 * Filter companies by tier
 */
export function filterCompaniesByTier(
  companies: Array<{ name: string; [key: string]: any }>,
  tier: CompanyTier | 'All'
): Array<{ name: string; [key: string]: any }> {
  if (tier === 'All') {
    return companies;
  }
  
  return companies.filter(company => {
    const priority = getCompanyPriority(company.name);
    return priority.tier === tier;
  });
}

/**
 * Get company tier
 */
export function getCompanyTier(companyName: string): CompanyTier {
  return getCompanyPriority(companyName).tier;
}

/**
 * Get Tier S companies from list
 */
export function getTierSCompanies(companies: Array<{ name: string; [key: string]: any }>): Array<{ name: string; [key: string]: any }> {
  return companies.filter(c => getCompanyTier(c.name) === 'S');
}

/**
 * Get Tier A companies from list
 */
export function getTierACompanies(companies: Array<{ name: string; [key: string]: any }>): Array<{ name: string; [key: string]: any }> {
  return companies.filter(c => getCompanyTier(c.name) === 'A');
}

/**
 * Get Quant companies from list
 */
export function getQuantCompanies(companies: Array<{ name: string; [key: string]: any }>): Array<{ name: string; [key: string]: any }> {
  return companies.filter(c => getCompanyTier(c.name) === 'Quant');
}

/**
 * Get India Product companies from list
 */
export function getIndiaProductCompanies(companies: Array<{ name: string; [key: string]: any }>): Array<{ name: string; [key: string]: any }> {
  return companies.filter(c => getCompanyTier(c.name) === 'India');
}

/**
 * Sort companies by tier (S > A > Quant > India > Low)
 */
export function sortCompaniesByTier(companies: Array<{ name: string; [key: string]: any }>): Array<{ name: string; [key: string]: any }> {
  const tierOrder: Record<CompanyTier, number> = {
    'S': 6,
    'A': 5,
    'Quant': 4,
    'India': 3,
    'B': 2,
    'C': 1,
  };
  
  return [...companies].sort((a, b) => {
    const tierA = getCompanyTier(a.name);
    const tierB = getCompanyTier(b.name);
    
    // Sort by tier first
    if (tierOrder[tierA] !== tierOrder[tierB]) {
      return tierOrder[tierB] - tierOrder[tierA];
    }
    
    // Then by priority score
    const priorityA = getCompanyPriority(a.name);
    const priorityB = getCompanyPriority(b.name);
    if (priorityA.score !== priorityB.score) {
      return priorityB.score - priorityA.score;
    }
    
    // Finally alphabetically
    return a.name.localeCompare(b.name);
  });
}
