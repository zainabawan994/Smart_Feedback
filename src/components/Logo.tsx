/** Tavo wordmark: "tavo" in round strokes, the "o" a speech bubble. Letters follow the text colour (light/dark theme);
 *  the bubble is always tomato. Size it with a height class, e.g. className="h-7". Same shapes as /Tavo logo/tavo-logo.svg. */
export default function Logo({ className = "h-7" }: { className?: string }) {
  return (
    <svg viewBox="16 18 296 108" className={`${className} w-auto`} role="img" aria-label="Tavo">
      <g fill="none" stroke="currentColor" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round">
        <path d="M40 30 V90 A16 16 0 0 0 56 106 H64" />
        <line x1={24} y1={56} x2={62} y2={56} />
        <circle cx={110} cy={82} r={26} />
        <line x1={136} y1={56} x2={136} y2={108} />
        <polyline points="164,56 188,108 212,56" />
        <circle cx={270} cy={82} r={26} stroke="var(--tomato)" />
      </g>
      <polygon points="259.7,110.2 238,117 242.8,94.7" fill="var(--tomato)" />
    </svg>
  );
}
