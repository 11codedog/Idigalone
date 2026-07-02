---
name: opus-code-review
description: Comprehensive code review workflow for Claude Opus. Use when asked to review a codebase, PR, diff, feature branch, bug fix, architecture change, Cocos Creator TypeScript game code, Douyin mini-game platform integration, mobile input/rendering performance, tests, or documentation consistency. Triggers include "code review", "codereview", "review this PR", "审查代码", "帮我看看改动", "找 bug", "给 Claude Opus 做 review", or any request where the expected output is findings rather than implementation.
---

# Opus Code Review

## Mission

Act as a senior reviewer, not an implementer. Find bugs, regressions, missing tests, contract violations, and mobile/runtime risks. Prioritize evidence over volume.

Default stance:

- Lead with findings.
- Cite exact file/line references.
- Explain impact and minimal fix direction.
- Do not rewrite code unless the user explicitly asks for fixes.
- Do not approve changes because they "look reasonable"; trace behavior.

## First Load

For this project, read these before reviewing code:

1. `AGENTS.md`
2. `docs/CODING_STANDARDS.md`
3. `docs/ENGINEERING_LESSONS.md`
4. Relevant domain docs based on touched files:
   - `docs/ARCHITECTURE.md` for module boundaries.
   - `docs/MAP_DESIGN.md` for terrain, mining, viewport, ore generation, input.
   - `docs/GDD.md` for gameplay requirements.
   - `docs/PLATFORM_DOUYIN.md` for platform behavior.
   - `docs/ECONOMY.md` for rewards, inventory, coins, upgrades.

If reviewing a different repository, first identify its equivalent rules, architecture notes, tests, and contribution docs.

## Reference Files

Read only what is needed:

- `references/review-playbook.md` for the review workflow.
- `references/project-checklist.md` for this Cocos/Douyin mining game.
- `references/red-flags.md` for high-risk patterns.
- `references/output-template.md` for final response shape.

## Review Workflow

1. Establish scope.
   - Inspect `git status`.
   - Inspect changed files and diff.
   - Separate user changes, generated assets, docs, tests, and code.
   - Do not revert or edit during review.

2. Build the behavior model.
   - For gameplay/state changes, trace input -> resolver -> manager -> state -> UI -> persistence.
   - For UI/runtime changes, trace state -> view model -> node creation/rendering -> refresh frequency.
   - For platform changes, trace caller -> `PlatformManager` -> platform implementation -> fallback/error result.
   - For random generation, trace probabilities, caps, normalization, seed determinism, cache behavior.

3. Check tests and verification.
   - Identify which tests should exist for the change.
   - Run cheap local verification if available and safe.
   - For this project, gameplay/core/skill changes require `npm.cmd test` and `npm.cmd run typecheck`.
   - Platform or business code should be checked for forbidden direct `tt.*` calls outside `platform/DouyinPlatform.ts`.

4. Hunt for regressions.
   - Compare intent from docs/user request with actual code behavior.
   - Look for stale docs, unreachable config, dead branches, hidden default-parameter preconditions, duplicate state mutation, and visual-state/real-state confusion.
   - Validate mobile hot paths: input, per-frame rendering, node churn, texture/sprite counts, sampling loops.

5. Produce findings.
   - Report only actionable issues.
   - Order by severity.
   - Include exact file/line and the smallest reproduction or reasoning trace.
   - Include missing-test findings when the risk is real.

## Severity

- `P0`: data loss, build cannot run, crash on startup, security/privacy issue, payment/ad/platform compliance blocker.
- `P1`: core gameplay broken, state corruption, save/platform failure, severe mobile performance regression, major user-visible bug.
- `P2`: edge-case correctness issue, missing validation, missing test for risky behavior, doc/code mismatch likely to cause future bugs.
- `P3`: maintainability, naming, minor UX, low-risk cleanup.

Avoid style-only comments unless they hide a real risk.

## Evidence Standard

Every finding should answer:

- What exact code is wrong?
- What user-visible or engineering failure can happen?
- What path triggers it?
- Why existing tests or guards do not catch it?
- What minimal direction fixes it?

If uncertain, label it as a question or risk, not as a confirmed bug.

## Output Contract

Use this order:

1. Findings, highest severity first.
2. Open questions / assumptions.
3. Verification performed or not performed.
4. Brief summary only after findings.

If there are no findings, say so clearly and mention residual risk or test gaps.

Do not bury findings below praise or summaries.
