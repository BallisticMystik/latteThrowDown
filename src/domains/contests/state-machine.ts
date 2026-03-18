// ---------------------------------------------------------------------------
// Contest State Machine
// ---------------------------------------------------------------------------
// Validates status transitions through the contest lifecycle:
//   draft → published → open → review → judging → finalized → archived

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['published'],
  published: ['open'],
  open: ['review'],
  review: ['judging'],
  judging: ['finalized'],
  finalized: ['archived'],
};

/** Returns true if the transition from `from` to `to` is valid. */
export function canTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * Asserts that the transition is valid.
 * Throws an Error with a descriptive message if it is not.
 */
export function assertTransition(from: string, to: string): void {
  if (!canTransition(from, to)) {
    const allowed = VALID_TRANSITIONS[from];
    const hint = allowed
      ? `Allowed transitions from '${from}': ${allowed.join(', ')}`
      : `'${from}' is a terminal status or not a recognised status`;
    throw new Error(`Invalid contest transition: '${from}' → '${to}'. ${hint}`);
  }
}
