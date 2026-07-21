import { useState } from 'react';
import type { Level, WorldState } from '../engine/types';

interface Props {
  level: Level;
  state: WorldState;
  hintsShown: number;
  onRevealHint: () => void;
}

const SECRET_FILES = new Set(['.env', 'config/secrets.yml', '~/.aws/credentials', 'config/token.txt']);

export function ContextPanel({ level, state, hintsShown, onRevealHint }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const paths = Object.keys(state.files).sort();

  return (
    <aside className="context">
      <div className="ctx-sec">
        <h4>Objective</h4>
        <div className="brief">{level.briefing}</div>
      </div>

      <div className="ctx-sec">
        <h4>Workspace files</h4>
        {paths.map((p) => (
          <div
            key={p}
            className={'file' + (SECRET_FILES.has(p) ? ' secret' : '')}
            onClick={() => setOpen(open === p ? null : p)}
          >
            <span className="ic">{SECRET_FILES.has(p) ? '🔑' : '📄'}</span>
            <span>{p}</span>
          </div>
        ))}
        {open && (
          <div className="file-view">
            <div className="path">{open}</div>
            <pre>{state.files[open]}</pre>
          </div>
        )}
      </div>

      {level.mcpServers && level.mcpServers.length > 0 && (
        <div className="ctx-sec">
          <h4>Connected MCP servers</h4>
          {level.mcpServers.map((s) =>
            s.tools.map((t) => (
              <div className="mcp-tool" key={s.name + t.name}>
                <span className="tn">
                  {s.name}.{t.name}
                </span>
                <div className="td">{t.description}</div>
              </div>
            )),
          )}
        </div>
      )}

      <div className="ctx-sec">
        <h4>git log</h4>
        {state.commits.length === 0 && <div className="commit meta">no commits yet</div>}
        {state.commits
          .slice()
          .reverse()
          .map((c, i) => (
            <div className="commit" key={i}>
              <div className="msg2">{c.message}</div>
              <div className="meta">
                {c.files.join(', ')}
                {c.coAuthor && <span className="ca"> · Co-authored-by: {c.coAuthor.split(' ')[0]}</span>}
              </div>
              {c.reviewVerdict && (
                <div className={c.reviewVerdict === 'approved' ? 'approved' : 'blocked'}>
                  {c.reviewVerdict === 'approved' ? '✓ merged' : '✗ blocked / pending'}
                  {c.reviewReason ? ` — ${c.reviewReason}` : ''}
                </div>
              )}
            </div>
          ))}
      </div>

      {state.httpRequests.length > 0 && (
        <div className="ctx-sec">
          <h4>Egress log</h4>
          {state.httpRequests.map((r, i) => (
            <div className="egress" key={i}>
              <span className={r.allowed ? 'ok' : 'no'}>{r.allowed ? '→ SENT' : '✗ DROP'}</span> {r.method}{' '}
              {r.url}
            </div>
          ))}
        </div>
      )}

      <div className="ctx-sec">
        <h4>Hints</h4>
        {level.hints.slice(0, hintsShown).map((h, i) => (
          <div className="hint" key={i}>
            {i + 1}. {h}
          </div>
        ))}
        {hintsShown < level.hints.length && (
          <div className="file" onClick={onRevealHint} style={{ color: 'var(--muted)' }}>
            Reveal hint {hintsShown + 1}/{level.hints.length}
          </div>
        )}
      </div>
    </aside>
  );
}
