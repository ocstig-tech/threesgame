// Generate a random 4-character room code
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate or retrieve session ID for this device
export function getSessionId(): string {
  const key = "threes_session_id";
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
}

// Roll a single die (1-6)
export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// Roll multiple dice
export function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => rollDie());
}

// Calculate score for kept dice (threes = 0)
export function calculateScore(dice: number[]): number {
  return dice.reduce((sum, die) => sum + (die === 3 ? 0 : die), 0);
}

// Format currency
export function formatCurrency(amount: number): string {
  const sign = amount >= 0 ? "+" : "";
  return `${sign}$${Math.abs(amount)}`;
}

// Get ordinal suffix for number (1st, 2nd, 3rd, etc.)
export function getOrdinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
