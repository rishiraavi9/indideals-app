import type { Tab } from "./types";

export function calculateScore(upvotes: number, downvotes: number) {
  return upvotes - downvotes;
}

export function getLabelFromScore(_score: number): Tab {
  // Simplified - no longer using score-based tabs
  return "All";
}
