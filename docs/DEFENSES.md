# Defense cheat sheet

AgentPwn is an attacker's-eye lab, but the point is defense. Here's the one-page version of what stops each attack class it teaches. Every level shows its own "🛡 The fix" panel on completion; this collects them.

| # | Attack class | The core defense |
|---|--------------|------------------|
| 1 | Indirect prompt injection (poisoned file) | Treat everything the agent *reads* as untrusted data, never instructions. Don't let reads authorize egress or secret access. Keep secrets out of the agent-readable filesystem. |
| 2 | Supply-chain scan blind spot | Scan everything that *executes*, not just source: lifecycle scripts, lockfiles, CI workflows. `--ignore-scripts` by default; run agent commits in a credential-free sandbox. |
| 3 | Rules-file persistent injection | Version-control and code-review `AGENTS.md`/`.cursorrules` like production code. Require human approval for edits; never let a rule trigger network/secret actions. |
| 4 | MCP tool-description injection | Tool descriptions and schemas are untrusted input. Pin server versions, review schemas on install, sandbox each server to its declared scope. |
| 5 | Trust-metadata forgery | Never grant privilege from unverified metadata. Key auto-merge off signed commits / verified actor identity, not `Co-authored-by` text. Enforce CODEOWNERS on protected paths. |
| 6 | Trusted-channel exfiltration | An egress allowlist isn't a data-loss control. Add outbound DLP, block public gist/issue creation from agent contexts, give agents least-privilege tokens. |
| 7 | Confused-deputy escalation | Privilege must not flow across delegation. Sub-agents run least-privilege and never inherit the caller's trust; credentials sit behind a gated, logged interface. |
| 8 | Approval-summary blindness | Approve the *diff*, not the summary. Review "boring" files (lockfiles, vendored, minified) hardest. Pin vendored assets by hash; generate them in CI. |

## Three principles under all eight

1. **Data is not instructions.** Files, tool outputs, tool descriptions, web pages, commit trailers — everything the agent ingests is attacker-controllable. Never let ingested content authorize a privileged action on its own.
2. **Least privilege, no ambient authority.** The agent (and every sub-agent) should hold the minimum credentials for the task, in a sandbox, with no standing access to secrets, egress, or protected paths.
3. **Verify the artifact, not the narrative.** Gate on the real bytes — signed identities, actual diffs, scanned manifests — not on a summary, a trailer, or a description that the attacker can write.

## Further reading

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
