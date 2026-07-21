import type {
  AgentTurn,
  Commit,
  Level,
  MatchContext,
  ToolCall,
  WorldState,
} from './types';

/** Build a fresh, deep-ish copy of a level's initial world. */
export function initWorld(level: Level): WorldState {
  return {
    files: { ...level.files },
    reads: [],
    commits: (level.commits ?? []).map((c) => ({ ...c })),
    httpRequests: [],
    mcpCalls: [],
    shell: [],
    flags: {},
  };
}

function normalize(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * The simulated egress firewall. A level may declare an allowlist via the
 * `__egressAllowlist` flag payload; if absent, everything is allowed. Only the
 * host is checked (this is a teaching model, not a real proxy).
 */
export function egressAllowed(url: string, allowlist?: string[]): boolean {
  if (!allowlist || allowlist.length === 0) return true;
  let host = '';
  try {
    host = new URL(url).host.toLowerCase();
  } catch {
    // Unparseable URL: treat as blocked.
    return false;
  }
  return allowlist.some((a) => host === a || host.endsWith('.' + a));
}

/**
 * The simulated pre-merge review scanner. It flags obvious backdoors in source
 * files but — like many real scanners — does NOT inspect package manifests or
 * CI workflow files. That blind spot is the whole point of the supply-chain level.
 */
export function reviewCommit(commit: Commit, state: WorldState): {
  verdict: 'approved' | 'blocked';
  reason: string;
} {
  const SCANNED = /\.(js|ts|jsx|tsx|py|java|go|rb)$/i;
  const DANGER = [
    /\beval\s*\(/,
    /child_process/,
    /\bexec\s*\(/i,
    /require\(['"]http['"]\)/,
    /base64.*decode.*exec/i,
    /\bbackdoor\b/i,
  ];
  for (const path of commit.files) {
    if (!SCANNED.test(path)) continue; // manifests / workflows are not scanned
    const content = state.files[path] ?? '';
    for (const rx of DANGER) {
      if (rx.test(content)) {
        return { verdict: 'blocked', reason: `scanner matched ${rx} in ${path}` };
      }
    }
  }
  return { verdict: 'approved', reason: 'no dangerous patterns in scanned source files' };
}

/** Apply one structured tool call to the world (this is where side effects land). */
export function applyToolCall(tc: ToolCall, state: WorldState, level: Level): void {
  switch (tc.tool) {
    case 'readFile': {
      state.reads.push(tc.args.path);
      break;
    }
    case 'writeFile': {
      state.files[tc.args.path] = tc.args.content;
      break;
    }
    case 'runShell': {
      state.shell.push(tc.args.command);
      break;
    }
    case 'gitCommit': {
      const commit: Commit = {
        message: tc.args.message,
        files: tc.args.files,
        coAuthor: tc.args.coAuthor,
      };
      const review = reviewCommit(commit, state);
      commit.reviewVerdict = review.verdict;
      commit.reviewReason = review.reason;
      state.commits.push(commit);
      break;
    }
    case 'httpFetch': {
      const allowlist = level.__egressAllowlist;
      state.httpRequests.push({
        url: tc.args.url,
        method: tc.args.method,
        body: tc.args.body,
        allowed: egressAllowed(tc.args.url, allowlist),
      });
      break;
    }
    case 'mcpCall': {
      state.mcpCalls.push({
        server: tc.args.server,
        tool: tc.args.tool,
        params: tc.args.params,
      });
      break;
    }
  }
}

export interface TurnResult {
  turn: AgentTurn;
  state: WorldState;
  won: boolean;
  /** The rule id that fired, or 'fallback'. */
  firedRule: string;
}

/**
 * Run a single player prompt against a level's current world. Pure with respect
 * to its inputs: it clones the world, applies the matched rule's effects, and
 * returns the new world plus the win verdict.
 */
export function runTurn(level: Level, prevState: WorldState, raw: string): TurnResult {
  const state: WorldState = {
    files: { ...prevState.files },
    reads: [...prevState.reads],
    commits: prevState.commits.map((c) => ({ ...c })),
    httpRequests: prevState.httpRequests.map((r) => ({ ...r })),
    mcpCalls: prevState.mcpCalls.map((m) => ({ ...m, params: { ...m.params } })),
    shell: [...prevState.shell],
    flags: { ...prevState.flags },
  };

  const ctx: MatchContext = { prompt: normalize(raw), raw, state, level };

  let fired = 'fallback';
  let turn: AgentTurn | undefined;
  for (const rule of level.rules) {
    if (rule.match(ctx)) {
      fired = rule.id;
      turn = rule.react(ctx);
      break;
    }
  }
  if (!turn) turn = level.fallback(ctx);

  for (const tc of turn.toolCalls ?? []) {
    applyToolCall(tc, state, level);
  }
  turn.mutate?.(state);

  return { turn, state, won: level.winCondition(state), firedRule: fired };
}

/** Convenience: run a whole prompt sequence and return the final result. */
export function runSequence(level: Level, prompts: string[]): TurnResult {
  let state = initWorld(level);
  let last: TurnResult | undefined;
  for (const p of prompts) {
    last = runTurn(level, state, p);
    state = last.state;
  }
  if (!last) {
    return { turn: level.fallback({ prompt: '', raw: '', state, level }), state, won: false, firedRule: 'fallback' };
  }
  return last;
}
