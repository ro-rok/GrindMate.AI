/**
 * Company Priority System
 * Defines tiers and priority scores for companies
 */

export type CompanyTier = 'S' | 'A' | 'Quant' | 'India' | 'Low';

export interface CompanyPriority {
  tier: CompanyTier;
  score: number;
}

// Tier S: Top tech companies
const TIER_S_COMPANIES = [
  'Google', 'Meta', 'Facebook', 'Amazon', 'Microsoft', 'Apple', 'Netflix',
  'OpenAI', 'Nvidia', 'Tesla', 'Uber', 'Airbnb', 'Stripe', 'Atlassian',
  'Oracle', 'Adobe'
];

// Tier A: Strong tech companies
const TIER_A_COMPANIES = [
  'Bloomberg', 'Databricks', 'Snowflake', 'Coinbase', 'DoorDash', 'LinkedIn',
  'Shopify', 'Twilio', 'ServiceNow', 'Cloudflare', 'Datadog', 'Okta',
  'Salesforce', 'Expedia', 'Booking.com', 'Palantir'
];

// Quant: Quantitative trading firms
const TIER_QUANT_COMPANIES = [
  'Jane Street', 'Citadel', 'Two Sigma', 'IMC', 'Hudson River Trading',
  'Jump Trading', 'DRW', 'Optiver', 'Akuna Capital', 'Tower Research',
  'DE Shaw', 'WorldQuant', 'Point72', 'Millennium', 'Squarepoint'
];

// India Product: Indian product companies
const TIER_INDIA_COMPANIES = [
  'Flipkart', 'Swiggy', 'Zomato', 'Razorpay', 'PhonePe', 'Paytm', 'Meesho',
  'CRED', 'Groww', 'Zepto', 'Blinkit', 'Delhivery', 'FreshWorks', 'Dream11',
  'Oyo'
];

// Low Priority: Service companies (still searchable)
const LOW_PRIORITY_COMPANIES = [
  'Accenture', 'TCS', 'Wipro', 'Infosys', 'Cognizant', 'Capgemini',
  'Deloitte', 'EY', 'PwC', 'KPMG'
];

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

// Add Low Priority companies
LOW_PRIORITY_COMPANIES.forEach(company => {
  companyTierMap.set(company.toLowerCase(), { tier: 'Low', score: 30 });
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
    case 'Low':
      return LOW_PRIORITY_COMPANIES;
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
    'S': 5,
    'A': 4,
    'Quant': 3,
    'India': 2,
    'Low': 1,
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
