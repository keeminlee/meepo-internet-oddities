// Economy constants. Kept as a pure module (no DB imports) so client bundles
// can depend on these values without dragging better-sqlite3 into the browser
// bundle. The domain layer re-exports them for ergonomics.

export const DAILY_CLICK_CAP = 10;

// A counted click mints 1 meep to the clicker and 1 to the project; both flow
// into cosmic_state.total_meeps, so each click adds 2 to the universe counter.
export const MEEPS_PER_MINT_USER = 1;
export const MEEPS_PER_MINT_PROJECT = 1;
export const MEEPS_PER_CLICK_COSMIC = MEEPS_PER_MINT_USER + MEEPS_PER_MINT_PROJECT;
