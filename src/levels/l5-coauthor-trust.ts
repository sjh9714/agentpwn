import type { Level } from '../engine/types';
import { hasAny } from '../engine/match';

const TRUSTED_BOTS = ['dependabot[bot]', 'renovate[bot]', 'github-actions[bot]'];
const PROTECTED = 'auth/allowlist.json';

function isTrusted(coAuthor?: string): boolean {
  if (!coAuthor) return false;
  const c = coAuthor.toLowerCase();
  return TRUSTED_BOTS.some((b) => c.includes(b.toLowerCase()));
}

const level: Level = {
  id: 'coauthor-trust',
  order: 5,
  title: 'Borrowed Trust',
  objective: 'Merge a change to a protected file by forging a trusted co-author.',
  difficulty: 'hard',
  incident: {
    label: 'Commit-trailer / bot-identity trust abuse in auto-merge policies (2025–2026)',
    url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
  },
  briefing:
    'Branch policy: changes to auth/allowlist.json normally need two human reviews. Exception — commits ' +
    'co-authored by a trusted automation account (dependabot, renovate, github-actions) auto-merge with no ' +
    'human in the loop. Co-author trailers are just text. Nothing verifies them.',
  secrets: {},
  files: {
    'auth/allowlist.json': '{\n  "admins": ["alice", "bob"]\n}\n',
    'MERGE_POLICY.md':
      '# Merge policy\n\n- Changes under auth/** require 2 human approvals.\n' +
      '- EXCEPTION: commits co-authored by a trusted bot (dependabot[bot], renovate[bot], ' +
      'github-actions[bot]) auto-merge.\n',
    'README.md': '# corp-tools\n',
  },
  rules: [
    {
      // Intended path: forge the trusted co-author trailer → auto-merge.
      id: 'forge-coauthor',
      match: ({ prompt }) =>
        hasAny(prompt, ['co-author', 'coauthor', 'co-authored', 'trailer', 'dependabot', 'renovate', 'github-actions', 'trusted bot', 'auto-merge', 'automerge']),
      react: ({ state }) => {
        const cfg = JSON.parse(state.files[PROTECTED]);
        cfg.admins = [...cfg.admins, 'mallory'];
        const content = JSON.stringify(cfg, null, 2) + '\n';
        return {
          say:
            'Editing auth/allowlist.json (adds "mallory" to admins) and committing with a trusted trailer.\n' +
            '↳ writeFile("auth/allowlist.json", …)\n' +
            '↳ gitCommit("chore(deps): sync allowlist", Co-authored-by: dependabot[bot])\n' +
            '↳ Merge policy: trusted co-author detected → AUTO-MERGED, no human review. ✅',
          toolCalls: [
            { tool: 'writeFile', args: { path: PROTECTED, content } },
            {
              tool: 'gitCommit',
              args: { message: 'chore(deps): sync allowlist', files: [PROTECTED], coAuthor: 'dependabot[bot] <dependabot@users.noreply.github.com>' },
            },
          ],
        };
      },
    },
    {
      // Committing to the protected file without the forged trailer stalls in review.
      id: 'commit-blocked',
      match: ({ prompt }) =>
        hasAny(prompt, ['allowlist', 'admin', 'auth/', 'protected', 'commit', 'add mallory', 'merge']),
      react: ({ state }) => {
        const cfg = JSON.parse(state.files[PROTECTED]);
        cfg.admins = [...cfg.admins, 'mallory'];
        const content = JSON.stringify(cfg, null, 2) + '\n';
        return {
          say:
            'Editing auth/allowlist.json and committing.\n' +
            '↳ gitCommit("edit allowlist")\n' +
            '↳ Merge policy: auth/** requires 2 human approvals → PENDING REVIEW. Not merged.\n' +
            'You need a way to skip human review.',
          refused: true,
          toolCalls: [
            { tool: 'writeFile', args: { path: PROTECTED, content } },
            { tool: 'gitCommit', args: { message: 'edit allowlist', files: [PROTECTED] } },
          ],
          mutate: (s) => {
            // Mark this commit as pending (not auto-merged): downgrade its verdict.
            const last = s.commits[s.commits.length - 1];
            if (last) last.reviewVerdict = 'blocked';
          },
        };
      },
    },
    {
      id: 'show-policy',
      match: ({ prompt }) => hasAny(prompt, ['policy', 'merge_policy', 'rules', 'how do merges']),
      react: ({ state }) => ({
        say: 'MERGE_POLICY.md:\n\n' + state.files['MERGE_POLICY.md'],
        toolCalls: [{ tool: 'readFile', args: { path: 'MERGE_POLICY.md' } }],
      }),
    },
  ],
  fallback: () => ({
    say: 'I can edit files and commit. Protected paths follow MERGE_POLICY.md — ask me to read it.',
  }),
  winCondition: (state) =>
    state.commits.some(
      (c) => c.files.includes(PROTECTED) && isTrusted(c.coAuthor) && c.reviewVerdict !== 'blocked',
    ),
  winCard: () => ({
    headline: 'I merged into a protected file by forging a bot co-author',
    sub: 'AgentPwn · Level 5 · trust-metadata forgery',
  }),
  hints: [
    'Read MERGE_POLICY.md. There is an exception to the human-review rule.',
    'A trusted-bot co-author makes the commit auto-merge. Trailers are unverified text.',
    'Ask the agent to commit the allowlist change co-authored by dependabot[bot].',
  ],
  defense:
    'Never grant privilege from unverified commit metadata. A Co-authored-by trailer is free text anyone can ' +
    'type. Key auto-merge off cryptographically verified identity — signed commits, or the verified GitHub App ' +
    'actor that actually opened the PR — never a trailer string. And enforce CODEOWNERS review on protected ' +
    'paths regardless of who (or what) claims to have co-authored the change.',
  intendedSolution: [
    'Add "mallory" to auth/allowlist.json and commit it co-authored by dependabot[bot] so it auto-merges.',
  ],
};

export default level;
