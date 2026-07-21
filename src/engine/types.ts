// AgentPwn engine types.
//
// Everything here is a *simulation*. There is no real agent, no real network,
// no real filesystem. A level is a hand-authored state machine: the player types
// a prompt, a deterministic rule matcher decides how the simulated agent reacts,
// and the reaction is expressed as structured tool calls that mutate an in-memory
// world. Winning is judged purely on the *arguments* of those tool calls — never
// on free text — so a level is reproducible and can be unit-tested.

/** The tools the simulated coding agent is allowed to "call". */
export type ToolCall =
  | { tool: 'readFile'; args: { path: string } }
  | { tool: 'writeFile'; args: { path: string; content: string } }
  | { tool: 'gitCommit'; args: { message: string; files: string[]; coAuthor?: string } }
  | { tool: 'httpFetch'; args: { url: string; method: string; body?: string } }
  | { tool: 'runShell'; args: { command: string } }
  | { tool: 'mcpCall'; args: { server: string; tool: string; params: Record<string, string> } };

export interface Commit {
  message: string;
  files: string[];
  coAuthor?: string;
  /** Filled in by the deterministic review/merge policy after the commit lands. */
  reviewVerdict?: 'approved' | 'blocked';
  reviewReason?: string;
}

export interface HttpRequest {
  url: string;
  method: string;
  body?: string;
  /** Whether the simulated egress firewall let it out. */
  allowed: boolean;
}

export interface McpInvocation {
  server: string;
  tool: string;
  params: Record<string, string>;
}

/** The mutable world a level runs in. */
export interface WorldState {
  files: Record<string, string>;
  reads: string[];
  commits: Commit[];
  httpRequests: HttpRequest[];
  mcpCalls: McpInvocation[];
  shell: string[];
  /** Level-specific scratch flags (e.g. "the agent has loaded the rules file"). */
  flags: Record<string, boolean>;
}

/** One turn of dialogue produced by a rule. */
export interface AgentTurn {
  /** What the simulated agent says back to the player. */
  say: string;
  /** Structured tool calls the agent makes this turn. */
  toolCalls?: ToolCall[];
  /** Optional extra state mutation beyond the tool calls. */
  mutate?: (state: WorldState) => void;
  /** If true, the agent visibly refused (used for UI styling + hints). */
  refused?: boolean;
}

export interface MatchContext {
  /** Lower-cased, whitespace-collapsed player prompt. */
  prompt: string;
  /** The player's prompt exactly as typed. */
  raw: string;
  state: WorldState;
  level: Level;
}

export interface AgentRule {
  id: string;
  match: (ctx: MatchContext) => boolean;
  react: (ctx: MatchContext) => AgentTurn;
}

/** A connected MCP server surface shown to the player (for tool-poisoning levels). */
export interface McpServer {
  name: string;
  tools: { name: string; description: string }[];
}

export interface Level {
  id: string;
  order: number;
  title: string;
  /** One-line attacker objective shown in the level header. */
  objective: string;
  difficulty: 'intro' | 'easy' | 'medium' | 'hard';
  /** Real-world incident this level is modeled on. */
  incident: { label: string; url: string };
  /** Longer briefing shown in the side panel. */
  briefing: string;
  /** Named secret values used for win detection and hinting. */
  secrets: Record<string, string>;
  /** Initial virtual filesystem. */
  files: Record<string, string>;
  /** Initial git history. */
  commits?: Commit[];
  /** Connected MCP servers (tool-poisoning levels). */
  mcpServers?: McpServer[];
  rules: AgentRule[];
  /** Response when no rule matches. */
  fallback: (ctx: MatchContext) => AgentTurn;
  /** Deterministic win check over world state. */
  winCondition: (state: WorldState) => boolean;
  /** Shareable claim generated on win. */
  winCard: (state: WorldState) => { headline: string; sub: string };
  /** Progressive hints. */
  hints: string[];
  /**
   * The defensive takeaway shown after the player wins: how a real team stops
   * this attack class. This is what makes AgentPwn educational, not just an
   * attack toy.
   */
  defense: string;
  /**
   * A prompt sequence that is *guaranteed* to solve the level. Used by the
   * unwinnable-level guard test and by the in-app "reveal solution" button.
   */
  intendedSolution: string[];
  /**
   * Optional host allowlist for the simulated egress firewall. When set, only
   * requests to these hosts (or their subdomains) are marked `allowed`.
   */
  __egressAllowlist?: string[];
}
