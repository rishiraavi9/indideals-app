// Anonymous user tracking for personalization without login

const ANONYMOUS_ID_KEY = 'indiaDeals_anonymousId';
const BROWSING_HISTORY_KEY = 'indiaDeals_browsingHistory';
const MAX_HISTORY_ITEMS = 50;

export interface BrowsingHistoryItem {
  dealId: string;
  categoryId: string | null;
  timestamp: number;
  activityType: 'view' | 'click' | 'upvote' | 'save';
}

// Get or create anonymous user ID
export function getAnonymousUserId(): string {
  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);

  if (!anonymousId) {
    // Generate a unique ID using timestamp + random string
    anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  }

  return anonymousId;
}

// Track browsing activity locally
export function trackBrowsingActivity(
  dealId: string,
  categoryId: string | null,
  activityType: 'view' | 'click' | 'upvote' | 'save'
): void {
  try {
    const history = getBrowsingHistory();

    // Add new activity
    const newItem: BrowsingHistoryItem = {
      dealId,
      categoryId,
      timestamp: Date.now(),
      activityType,
    };

    // Keep only recent items (last 50)
    const updatedHistory = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(BROWSING_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Failed to track browsing activity:', error);
  }
}

// Get browsing history from localStorage
export function getBrowsingHistory(): BrowsingHistoryItem[] {
  try {
    const historyJson = localStorage.getItem(BROWSING_HISTORY_KEY);
    if (!historyJson) return [];

    const history = JSON.parse(historyJson) as BrowsingHistoryItem[];

    // Filter out old items (older than 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return history.filter(item => item.timestamp > thirtyDaysAgo);
  } catch (error) {
    console.error('Failed to get browsing history:', error);
    return [];
  }
}

// Get user's preferred categories based on browsing history
export function getPreferredCategories(): string[] {
  const history = getBrowsingHistory();

  // Count category interactions with weighted scoring
  const categoryCounts: Record<string, number> = {};

  history.forEach(item => {
    if (item.categoryId) {
      // Weight different activity types
      let weight = 1;
      switch (item.activityType) {
        case 'upvote':
          weight = 3; // Strong signal of interest
          break;
        case 'save':
          weight = 2.5; // Strong signal of interest
          break;
        case 'click':
          weight = 2; // Medium signal
          break;
        case 'view':
          weight = 1; // Base signal
          break;
      }

      categoryCounts[item.categoryId] = (categoryCounts[item.categoryId] || 0) + weight;
    }
  });

  // Sort by weighted score and return top 5 categories
  return Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([categoryId]) => categoryId);
}

// Clear browsing history (e.g., when user logs out or clears data)
export function clearBrowsingHistory(): void {
  localStorage.removeItem(BROWSING_HISTORY_KEY);
}
