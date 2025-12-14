import type { Tab } from "./types";

export function calculateScore(upvotes: number, downvotes: number) {
  return upvotes - downvotes;
}

export function getLabelFromScore(score: number): Tab {
  if (score >= 120) return "Frontpage";
  if (score >= 50) return "Popular";
  return "New";
}
