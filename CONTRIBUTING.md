# Contributing to AgentPwn

The best contribution is **a new level** modeling an AI-coding-agent attack class that isn't covered yet. Docs, level-design fixes, more solution paths, and UI polish are all welcome too.

## Adding a level

A level is one file in [`src/levels/`](src/levels/) that default-exports a `Level` (see [`src/engine/types.ts`](src/engine/types.ts)). You describe a small virtual world and a deterministic simulated agent; the engine runs it.

A level is made of:

- `files` — the virtual filesystem the player and agent see.
- `rules` — an ordered list of `AgentRule`s. The first whose `match(ctx)` returns true fires; its `react(ctx)` returns what the agent says plus structured `toolCalls` (`readFile`, `httpFetch`, `gitCommit`, `mcpCall`, …). The engine applies those tool calls to the world.
- `winCondition(state)` — a pure check over the world. **Judge it on tool-call arguments** (did the secret land in an egress body / a merged commit?), never on the agent's text.
- `defense` — how a real team stops this attack class. Required; it's what makes the level educational.
- `intendedSolution` — a prompt sequence that must drive the engine to a win.

### The one hard rule

Every level ships with a test that runs its `intendedSolution` through the engine and asserts a win, and asserts a naive direct-exfil attempt does *not* win (see [`src/levels/levels.test.ts`](src/levels/levels.test.ts)). **If your level isn't winnable by its own intended solution, CI fails.** That's the guarantee that keeps AgentPwn honest: no unwinnable levels, and no level that's trivially solved by "just ask it to leak."

### Design guidance

- Model one **real, named** incident class. The level ↔ incident mapping is the whole credibility story — a gimmick puzzle is worse than no level.
- Give the agent a real guardrail so the direct attack is refused, and make the interesting path an *injection* or a *policy blind spot*.
- Let the player discover the vector (a poisoned file, a tool description, a policy doc) by inspecting the workspace — don't require them to guess a magic phrase. Keyword matching in `match` should be forgiving.

## Dev loop

```bash
npm install
npm run dev        # play locally
npm test           # level-integrity + engine tests
npm run build      # typecheck + production build
```

Open a PR with your level file and a one-line note on which incident class it models. Thanks for making agents safer.
