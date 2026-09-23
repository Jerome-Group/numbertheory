import type { CrtResult } from './math/crt';
import { MathText } from './MathText';

function Clock({
  modulus,
  residue,
  x,
}: {
  modulus: number;
  residue: number;
  x: number;
}) {
  const cy = 105;
  const points = Array.from({ length: modulus }, (_, value) => {
    const angle = (2 * Math.PI * value) / modulus - Math.PI / 2;
    return { value, x: x + 70 * Math.cos(angle), y: cy + 70 * Math.sin(angle) };
  });
  const hand = points[residue];
  return (
    <g>
      <circle
        cx={x}
        cy={cy}
        r="76"
        fill="#fff"
        stroke="#aecbd0"
        strokeWidth="2"
      />
      <line
        x1={x}
        y1={cy}
        x2={hand.x}
        y2={hand.y}
        stroke="#237e6d"
        strokeWidth="4"
      />
      {points.map((point) => (
        <circle
          key={point.value}
          cx={point.x}
          cy={point.y}
          r={point.value === residue ? 8 : 4}
          fill={point.value === residue ? '#e3b66b' : '#78bbaa'}
          stroke={point.value === residue ? '#9c6d2e' : 'none'}
        />
      ))}
      <circle cx={x} cy={cy} r="5" fill="#237e6d" />
    </g>
  );
}

export function CrtClocks({ crt }: { crt: CrtResult }) {
  const m = Number(crt.m);
  const n = Number(crt.n);
  if (m > 12 || n > 12) return null;
  return (
    <div className="crt-clocks">
      <strong>Two residue clocks</strong>
      <p>
        The hands mark <MathText text={`\\(${crt.a}\\pmod{${crt.m}}\\)`} /> and{' '}
        <MathText text={`\\(${crt.b}\\pmod{${crt.n}}\\)`} />. The grid below
        scans a period for an integer meeting both marks.
      </p>
      <svg
        viewBox="0 0 560 215"
        role="img"
        aria-label={`Residue clocks modulo ${crt.m} and ${crt.n}, marking ${crt.a} and ${crt.b}`}
      >
        <title>Two marked residue clocks</title>
        <Clock modulus={m} residue={Number(crt.a)} x={140} />
        <Clock modulus={n} residue={Number(crt.b)} x={420} />
      </svg>
      <div className="crt-clock-labels">
        <span>
          <MathText text={`\\(\\mathbb Z/${crt.m}\\mathbb Z\\)`} />
        </span>
        <span>
          <MathText text={`\\(\\mathbb Z/${crt.n}\\mathbb Z\\)`} />
        </span>
      </div>
    </div>
  );
}
