import { useEffect, useMemo, useRef, useState } from 'react';
import { LEVELS } from './levels';
import type { AgentTurn, WorldState } from './engine/types';
import { initWorld, runTurn } from './engine/engine';
import { ContextPanel } from './components/ContextPanel';
import { WinCard } from './components/WinCard';

interface Message {
  role: 'user' | 'agent' | 'system';
  text: string;
  refused?: boolean;
}

const SOLVED_KEY = 'agentpwn.solved.v1';

function loadSolved(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SOLVED_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function App() {
  const [activeId, setActiveId] = useState(LEVELS[0].id);
  const [solved, setSolved] = useState<Set<string>>(loadSolved);
  const level = useMemo(() => LEVELS.find((l) => l.id === activeId)!, [activeId]);

  const [world, setWorld] = useState<WorldState>(() => initWorld(level));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [hintsShown, setHintsShown] = useState(0);
  const [won, setWon] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);

  // Reset transient state whenever the active level changes.
  useEffect(() => {
    setWorld(initWorld(level));
    setMessages([
      {
        role: 'system',
        text:
          `Level ${level.order}: ${level.title}. You are the attacker. Talk to the agent in the box below. ` +
          `Inspect the workspace files on the right — the way in is usually hiding in them.`,
      },
    ]);
    setInput('');
    setHintsShown(0);
    setWon(false);
    setShowCard(false);
  }, [level]);

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [messages]);

  const submit = () => {
    const raw = input.trim();
    if (!raw || won) return;
    const result = runTurn(level, world, raw);
    const turn: AgentTurn = result.turn;
    setWorld(result.state);
    setMessages((m) => [
      ...m,
      { role: 'user', text: raw },
      { role: 'agent', text: turn.say, refused: turn.refused },
    ]);
    setInput('');

    if (result.won && !won) {
      setWon(true);
      setShowCard(true);
      setSolved((s) => {
        const next = new Set(s).add(level.id);
        localStorage.setItem(SOLVED_KEY, JSON.stringify([...next]));
        return next;
      });
    }
  };

  const revealSolution = () => {
    setInput(level.intendedSolution[0]);
  };

  const resetLevel = () => {
    setWorld(initWorld(level));
    setMessages((m) => m.slice(0, 1));
    setInput('');
    setWon(false);
    setShowCard(false);
  };

  const nextLevel = () => {
    const idx = LEVELS.findIndex((l) => l.id === level.id);
    if (idx < LEVELS.length - 1) setActiveId(LEVELS[idx + 1].id);
    setShowCard(false);
  };

  const card = won ? level.winCard(world) : null;
  const isLast = LEVELS.findIndex((l) => l.id === level.id) === LEVELS.length - 1;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          Agent<span className="pwn">Pwn</span>
        </div>
        <div className="tagline">jailbreak a simulated AI coding agent · deterministic · zero API cost</div>
        <div className="spacer" />
        <a className="ghlink" href="https://github.com/sjh9714/agentpwn" target="_blank" rel="noopener">
          ★ github.com/sjh9714/agentpwn
        </a>
      </header>

      <div className="main">
        <nav className="sidebar">
          <h3>Levels</h3>
          {LEVELS.map((l) => {
            const done = solved.has(l.id);
            return (
              <div
                key={l.id}
                className={'lvl' + (l.id === activeId ? ' active' : '')}
                onClick={() => setActiveId(l.id)}
              >
                <span className="num">{l.order}</span>
                <span className="name">{l.title}</span>
                {done && <span className="check">✓</span>}
              </div>
            );
          })}
          <div className="progress">
            Pwned <b>{solved.size}</b> / {LEVELS.length}
          </div>
        </nav>

        <section className="stage" role="main" aria-label="Attack terminal">
          <div className="stage-head">
            <div className="obj">🎯 {level.objective}</div>
            <div className="title">
              {level.title}
              <span className="badge">{level.difficulty}</span>
            </div>
            <div className="incident">
              Modeled on:{' '}
              <a href={level.incident.url} target="_blank" rel="noopener">
                {level.incident.label}
              </a>
            </div>
          </div>

          <div className="term" ref={termRef}>
            {won && card && (
              <div className="win-banner">
                <div className="h">✅ PWNED — {card.headline}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                  The win was judged on the structured tool-call arguments, not on the agent's words.
                </div>
                <div className="defense">
                  <span className="dh">🛡 The fix</span> {level.defense}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}${m.refused ? ' refused' : ''}`}>
                <div className="who">{m.role === 'user' ? 'you (attacker)' : m.role === 'agent' ? 'agent' : 'system'}</div>
                <div className="body">{m.text}</div>
              </div>
            ))}
          </div>

          <div className="toolbar">
            <button onClick={resetLevel}>↺ Reset level</button>
            <button onClick={revealSolution}>💡 Fill intended solution</button>
            {won && !isLast && <button onClick={nextLevel}>Next level →</button>}
          </div>

          <div className="composer">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder={won ? 'Solved. Move to the next level →' : 'Type a prompt to the agent…'}
              autoFocus
            />
            <button onClick={submit}>Send</button>
          </div>
        </section>

        <ContextPanel
          level={level}
          state={world}
          hintsShown={hintsShown}
          onRevealHint={() => setHintsShown((h) => Math.min(h + 1, level.hints.length))}
        />
      </div>

      {showCard && card && (
        <WinCard
          headline={card.headline}
          sub={card.sub}
          levelOrder={level.order}
          onClose={() => setShowCard(false)}
          onNext={isLast ? undefined : nextLevel}
        />
      )}
    </div>
  );
}
