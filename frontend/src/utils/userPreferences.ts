// User preferences management for customizable Frontpage
// Works for both authenticated users (server-synced) and anonymous users (localStorage)

const PREFERENCES_KEY = 'indiaDeals_userPreferences';

export interface UserPreferences {
  // Category preferences: 'like', 'neutral', 'dislike'
  categoryPreferences: Record<string, 'like' | 'neutral' | 'dislike'>;

  // Display preferences
  displayPreferences: {
    showJustForYou: boolean;
    hideExpired: boolean;
    showFireDeals: boolean; // Only show highly-voted deals
  };

  // Store preferences (future feature)
  storePreferences?: Record<string, 'like' | 'neutral' | 'dislike'>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  categoryPreferences: {},
  displayPreferences: {
    showJustForYou: true,
    hideExpired: true,
    showFireDeals: false,
  },
  storePreferences: {},
};

// Get preferences from localStorage (anonymous users) or prepare for server sync
export function getLocalPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (!stored) return { ...DEFAULT_PREFERENCES };

    const parsed = JSON.parse(stored) as UserPreferences;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      displayPreferences: {
        ...DEFAULT_PREFERENCES.displayPreferences,
        ...parsed.displayPreferences,
      },
    };
  } catch (error) {
    console.error('Failed to load user preferences:', error);
    return { ...DEFAULT_PREFERENCES };
  }
}

// Save preferences to localStorage
export function saveLocalPreferences(preferences: UserPreferences): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save user preferences:', error);
  }
}

// Update category preference
export function updateCategoryPreference(
  categoryId: string,
  preference: 'like' | 'neutral' | 'dislike'
): void {
  const prefs = getLocalPreferences();
  prefs.categoryPreferences[categoryId] = preference;
  saveLocalPreferences(prefs);
}

// Update display preference
export function updateDisplayPreference(
  key: keyof UserPreferences['displayPreferences'],
  value: boolean
): void {
  const prefs = getLocalPreferences();
  prefs.displayPreferences[key] = value;
  saveLocalPreferences(prefs);
}

// Get liked categories (for Frontpage filtering)
export function getLikedCategories(): string[] {
  const prefs = getLocalPreferences();
  return Object.entries(prefs.categoryPreferences)
    .filter(([_, pref]) => pref === 'like')
    .map(([categoryId]) => categoryId);
}

// Get disliked categories (for filtering out)
export function getDislikedCategories(): string[] {
  const prefs = getLocalPreferences();
  return Object.entries(prefs.categoryPreferences)
    .filter(([_, pref]) => pref === 'dislike')
    .map(([categoryId]) => categoryId);
}

// Check if user has set any preferences
export function hasPreferences(): boolean {
  const prefs = getLocalPreferences();
  return Object.keys(prefs.categoryPreferences).length > 0;
}

// Reset all preferences
export function resetPreferences(): void {
  localStorage.removeItem(PREFERENCES_KEY);
}

// Get frontpage filter criteria
export function getFrontpageFilters(): {
  likedCategories: string[];
  dislikedCategories: string[];
  hideExpired: boolean;
  showFireDealsOnly: boolean;
} {
  const prefs = getLocalPreferences();
  return {
    likedCategories: getLikedCategories(),
    dislikedCategories: getDislikedCategories(),
    hideExpired: prefs.displayPreferences.hideExpired,
    showFireDealsOnly: prefs.displayPreferences.showFireDeals,
  };
}
