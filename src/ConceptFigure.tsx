import { figures } from './content/figures';
import { MathText } from './MathText';

export function ConceptFigure({ id }: { id: string }) {
  const figure = figures[id];
  if (!figure) return null;
  return (
    <figure className="concept-figure">
      <h3>{figure.title}</h3>
      {id === 'D02' && (
        <svg
          viewBox="0 0 600 88"
          role="img"
          aria-label="The block starts at minus twenty and ends just before minus fifteen. Minus seventeen is three units to the right of its start."
        >
          <title>Division block for a negative dividend</title>
          <path d="M40 42H560" stroke="currentColor" strokeWidth="2" />
          <rect
            x="80"
            y="20"
            width="440"
            height="44"
            fill="#234bd2"
            opacity=".1"
          />
          {[80, 168, 256, 344, 432, 520].map((x, index) => (
            <g key={x}>
              <path d={`M${x} 34V50`} stroke="currentColor" />
              <text x={x} y="82" textAnchor="middle">
                {index - 20}
              </text>
            </g>
          ))}
          <circle cx="80" cy="42" r="6" fill="#234bd2" />
          <circle cx="344" cy="42" r="7" fill="#234bd2" />
          <circle
            cx="520"
            cy="42"
            r="6"
            fill="white"
            stroke="#234bd2"
            strokeWidth="2"
          />
        </svg>
      )}
      <div className="figure-table">
        <table>
          <thead>
            <tr>
              {figure.headers.map((text, index) => (
                <th
                  key={text}
                  scope="col"
                  aria-label={figure.headerLabels[index]}
                >
                  <MathText text={text} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {figure.rows.map((row, index) => (
              <tr key={index}>
                {row.map((text, col) =>
                  col === 0 ? (
                    <th
                      key={col}
                      scope="row"
                      aria-label={figure.rowLabels[index]}
                    >
                      <MathText text={text} />
                    </th>
                  ) : (
                    <td key={col}>
                      <MathText text={text} />
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>{figure.caption}</figcaption>
    </figure>
  );
}
