// src/utils/userColors.ts
// Centralized user color management for consistent highlighting across the application

/**
 * Enhanced color palette with high contrast and distinct colors for better user differentiation
 * These colors are optimized for:
 * - High visibility as background highlights (with 40% opacity)
 * - Good contrast against text
 * - Easy distinction between different users
 * - Accessibility considerations
 */
const HIGHLIGHT_COLORS = [
  '#FFFF00', // Bright Yellow (default - high visibility)
  '#FF69B4', // Hot Pink (distinct from other colors)
  '#00FA9A', // Medium Spring Green (bright and unique)
  '#FF6347', // Tomato Red (warm, easily distinguishable)
  '#9370DB', // Medium Purple (distinct purple shade)
  '#00BFFF', // Deep Sky Blue (cool blue)
  '#FFB347', // Peach Orange (warm, different from yellow)
  '#98FB98', // Pale Green (soft but visible)
  '#FF1493', // Deep Pink (vibrant contrast)
  '#40E0D0', // Turquoise (unique blue-green)
  '#FFD700', // Gold (different from yellow)
  '#BA55D3', // Medium Orchid (purple variation)
];

/**
 * Tailwind CSS border color classes corresponding to highlight colors
 * Used for user identification in participant panels and activity feeds
 */
const BORDER_COLORS = [
  'border-yellow-400',    // Maps to #FFFF00
  'border-pink-400',      // Maps to #FF69B4  
  'border-green-400',     // Maps to #00FA9A
  'border-red-400',       // Maps to #FF6347
  'border-purple-400',    // Maps to #9370DB
  'border-blue-400',      // Maps to #00BFFF
  'border-orange-400',    // Maps to #FFB347
  'border-green-300',     // Maps to #98FB98
  'border-pink-500',      // Maps to #FF1493
  'border-cyan-400',      // Maps to #40E0D0
  'border-yellow-500',    // Maps to #FFD700
  'border-purple-500',    // Maps to #BA55D3
];

/**
 * Enhanced hash function for consistent user color assignment
 * @param userId - The user's unique identifier
 * @returns A consistent hash value for the user
 */
function getUserHash(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a consistent highlight background color for a user
 * Used for PDF text highlighting overlays
 * @param userId - The user's unique identifier
 * @returns A hex color code for highlighting backgrounds
 */
export function getUserHighlightColor(userId: string): string {
  const colorIndex = getUserHash(userId) % HIGHLIGHT_COLORS.length;
  return HIGHLIGHT_COLORS[colorIndex];
}

/**
 * Get a consistent border color class for a user
 * Used for user identification in UI components (borders, badges, etc.)
 * @param userId - The user's unique identifier
 * @returns A Tailwind CSS border color class
 */
export function getUserBorderColor(userId: string): string {
  const colorIndex = getUserHash(userId) % BORDER_COLORS.length;
  return BORDER_COLORS[colorIndex];
}

/**
 * Get all available highlight colors
 * Useful for color previews or documentation
 * @returns Array of all available highlight colors
 */
export function getAllHighlightColors(): string[] {
  return [...HIGHLIGHT_COLORS];
}

/**
 * Get the total number of available colors
 * @returns The number of distinct colors available
 */
export function getColorCount(): number {
  return HIGHLIGHT_COLORS.length;
}
