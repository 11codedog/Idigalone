# Review Playbook

## Intake

Use read-only commands first:

```powershell
git status --short
git diff --stat
git diff -- <paths>
rg -n "TODO|FIXME|throw new Error|console\.warn|tt\." assets scripts docs tests
```

Adapt paths for non-Windows environments.

Do not use destructive commands. Do not format, stage, commit, or fix code during review unless the user changes the task.

## Diff Reading Order

1. Public interfaces and config.
2. State owners: managers, reducers, stores, save/load code.
3. Pure resolvers/calculators.
4. UI consumers and presenters.
5. Tests.
6. Docs.
7. Assets and generated files.

Prefer reading full surrounding files for changed logic. Diffs alone often hide broken contracts.

## Trace Patterns

### Gameplay

Trace:

```text
input/event
  -> controller
  -> manager
  -> resolver/calculator
  -> state mutation
  -> emitted event / returned result
  -> UI/log/reward/save consumer
```

Questions:

- Does the resolver mutate state or only return delta?
- Does the manager own every mutation it performs?
- Are inventory, oxygen, depth, rewards, and coin preview updated in the correct order?
- Does a new result field reach all consumers that need it?
- Are blocked actions, full backpack, depleted oxygen, and surface boundary handled?

### UI / Runtime Rendering

Trace:

```text
state/model
  -> layout
  -> view render
  -> node creation / graphics draw / resource load
  -> refresh cadence
```

Questions:

- Does high-frequency input trigger full-screen `clear()`, `destroy()`, or `removeAllChildren()`?
- Are sprite/node counts capped with a meaningful priority?
- Does visual state come from real gameplay state, not a temporary mask?
- Are mobile dimensions, text overflow, touch input, and screen adaptation considered?

### Platform

Trace:

```text
business code
  -> PlatformManager
  -> MockPlatform or DouyinPlatform
  -> PlatformResult
  -> UI/log/save fallback
```

Questions:

- Is `tt.*` isolated to `DouyinPlatform`?
- Does initialization cache only success?
- Does fallback data preserve `ok: false` when a real error occurred?
- Can failed platform operations be observed by UI logs or later reporting?

### Random / Generation

Questions:

- Is output deterministic for the same seed and coordinate?
- Does query order change generation?
- Do probabilities sum to `<= 1`?
- Are depth curves, caps, and buffs tested at edge values?
- Does cache growth have a bound?

## Verification Selection

For this project:

```powershell
npm.cmd run typecheck
npm.cmd test
rg -n "tt\." assets\scripts --glob "!platform/DouyinPlatform.ts"
```

Extra hot-path checks:

```powershell
rg -n "clear\(|destroy\(|removeAllChildren|graphicsLayer|sample\(" assets\scripts\ui assets\scripts\gameplay
rg -n "Math.max\(.*DEFAULT|RUNTIME_SAMPLE|sampleOreLayer|width:|height:" assets\scripts\ui tests
```

Do not claim phone performance is verified unless a Douyin developer-tool build and real-device run were actually performed.
