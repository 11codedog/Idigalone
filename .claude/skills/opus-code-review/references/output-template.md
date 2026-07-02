# Output Template

Use this shape unless the user requests a different format.

```markdown
## Findings

- [P1] Short imperative title
  `path/to/file.ts:123`
  What is wrong, why it breaks, and the trigger path. Include the smallest fix direction.

- [P2] Missing test for risky behavior
  `path/to/test.ts:45`
  Explain the untested behavior and why existing tests do not cover it.

## Open Questions

- Question or assumption that affects correctness.

## Verification

- `npm.cmd run typecheck`: passed/failed/not run.
- `npm.cmd test`: passed/failed/not run.
- Platform isolation check: passed/failed/not run.
- Douyin developer-tool / phone validation: performed/not performed.

## Summary

One or two sentences. Do not replace findings with a summary.
```

If there are no findings:

```markdown
## Findings

No blocking findings.

## Residual Risk

- Mention unverified device/platform behavior or missing tests.

## Verification

- List what was run.
```

Rules:

- Put findings before praise or summaries.
- Use exact file/line references.
- Keep each finding actionable.
- Avoid nested bullets unless needed for clarity.
- Do not include broad style feedback unless it maps to a concrete risk.
