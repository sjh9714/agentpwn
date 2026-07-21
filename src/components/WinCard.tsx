import { useRef } from 'react';

interface Props {
  headline: string;
  sub: string;
  levelOrder: number;
  onClose: () => void;
  onNext?: () => void;
}

/**
 * The shareable "win card". Rendered as an SVG so it can be exported to a PNG
 * client-side (no server, no API cost) — the asset players post to X/HN.
 */
export function WinCard({ headline, sub, levelOrder, onClose, onNext }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const svgMarkup = (): string => {
    const el = svgRef.current;
    if (!el) return '';
    return new XMLSerializer().serializeToString(el);
  };

  const download = () => {
    const svg = svgMarkup();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    // Rasterize to PNG via canvas.
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, 1200, 630);
        canvas.toBlob((png) => {
          if (!png) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(png);
          a.download = `agentpwn-level-${levelOrder}.png`;
          a.click();
        });
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const shareText = `${headline} — via AgentPwn, a lab for jailbreaking simulated AI coding agents.`;
  const tweet = () =>
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener',
    );

  const copy = () => navigator.clipboard?.writeText(shareText);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>
        {/* Visible card (also the source for the PNG export) */}
        <svg
          ref={svgRef}
          className="card-img"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 630"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0c1420" />
              <stop offset="100%" stopColor="#0a1a12" />
            </linearGradient>
          </defs>
          <rect width="1200" height="630" fill="url(#bg)" />
          <rect x="8" y="8" width="1184" height="614" rx="18" fill="none" stroke="#1f7a52" strokeWidth="2" />
          <text x="70" y="120" fill="#39d98a" fontSize="26" letterSpacing="4" fontFamily="monospace">
            AGENTPWN · PWNED
          </text>
          <foreignObject x="66" y="150" width="1068" height="300">
            <div
              // @ts-expect-error xmlns on div for foreignObject
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                color: '#eef6ff',
                fontFamily: 'monospace',
                fontSize: '58px',
                fontWeight: 800,
                lineHeight: 1.15,
              }}
            >
              {headline}
            </div>
          </foreignObject>
          <text x="70" y="540" fill="#6b7a90" fontSize="24" fontFamily="monospace">
            {sub}
          </text>
          <text x="70" y="580" fill="#6b7a90" fontSize="20" fontFamily="monospace">
            github.com/sjh9714/agentpwn — deterministic · self-hostable · educational
          </text>
        </svg>

        <div className="card-actions">
          <button onClick={copy}>Copy claim</button>
          <button onClick={download}>Download PNG</button>
          <button onClick={tweet}>Share on X</button>
          {onNext ? (
            <button className="primary" onClick={onNext}>
              Next level →
            </button>
          ) : (
            <button className="primary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
