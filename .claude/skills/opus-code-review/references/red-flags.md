# Red Flags

Treat these as review triggers. Confirm before reporting.

## Correctness

- State modified outside the owner manager.
- Resolver mutates input state.
- UI reads half-updated global state because event payload is incomplete.
- Default parameter calls a method that can throw.
- New state field missing from clone/save/normalize/event payload.
- New config exists but is not read by runtime code.
- Full backpack path drops ore, moves player, or clears terrain incorrectly.
- Oxygen cost is frame-rate dependent.

## Platform

- Direct `tt.*` outside platform implementation.
- Platform init marks success before success is known.
- Catch block swallows errors or returns success with fallback data.
- UI cannot observe save/platform failures.

## Random / Generation

- Probability branches can sum beyond `1`.
- Seeded generation depends on query order.
- Cache grows with every natural sample in an unbounded world.
- Buff-modified probability lacks cap or test.
- Depth curve has untested surface, mid, peak, and beyond-peak cases.

## Mobile Runtime

- Per-frame `clear()`, `destroy()`, `removeAllChildren()` in input/render hot path.
- High-resolution sampling silently ignores runtime width/height parameters.
- Sprite cap uses traversal order instead of priority.
- Resource loading happens repeatedly instead of caching.
- Generated image assets are large and uncompressed for a mini-game package.
- Preview-only performance claim is used as evidence for real phone performance.

## Tests

- Tests assert implementation details but not user-visible behavior.
- New feature lacks negative tests: full backpack, no run, surface, oxygen depleted, invalid platform result.
- Mock behavior diverges from real platform semantics.
- Test-only methods are added to production code.

## Documentation Drift

- Gameplay direction changed but `GDD.md`/`MAP_DESIGN.md` did not.
- Module boundary changed but `ARCHITECTURE.md`/`CODING_STANDARDS.md` did not.
- Engineering lesson learned but not added to `ENGINEERING_LESSONS.md`.
