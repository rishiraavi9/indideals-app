export type Tab = "All" | "Frontpage" | "Popular" | "New";

export type User = {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  reputation: number;
  createdAt?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  createdAt: string;
};

export type Deal = {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  originalPrice?: number | null;
  discountPercentage?: number | null;
  merchant: string;
  url?: string | null;
  imageUrl?: string | null;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  viewCount?: number;
  festiveTags?: string[] | null;
  seasonalTag?: string | null;
  isFeatured?: boolean;
  isExpired?: boolean;
  createdAt: string;
  userId: string;
  categoryId?: string | null;
  user?: {
    id: string;
    username: string;
    avatarUrl: string | null;
    reputation: number;
  };
  category?: Category | null;
  score?: number;
  userVote?: number; // -1, 0, 1
  festive?: boolean; // For demo mode
  trending?: boolean; // For demo mode
  verified?: boolean; // For demo mode
  merchantUrl?: string; // For demo mode
  productUrl?: string; // For demo mode
  categoryName?: string; // For demo mode
  username?: string; // For demo mode
  userReputation?: number; // For demo mode
  votes?: number; // For demo mode
  clickCount?: number; // For demo mode
  expiresAt?: string; // For demo mode
  updatedAt?: string; // For demo mode
};

export type DealWithDerived = Deal & {
  score: number;
  label: Tab;
};

export type Comment = {
  id: string;
  content: string;
  userId: string;
  dealId: string;
  parentId: string | null;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    reputation: number;
  };
  replies?: Comment[];
  userVote?: number; // -1, 0, 1
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};
