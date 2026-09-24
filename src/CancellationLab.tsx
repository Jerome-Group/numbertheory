import { useEffect, useState, useSyncExternalStore } from 'react';
import { MathText } from './MathText';
import { studyStore } from './state';

const presets = [
  { modulus: '12', factor: '4', label: '\\(4\\pmod{12}\\)' },
  { modulus: '12', factor: '5', label: '\\(5\\pmod{12}\\)' },
  { modulus: '14', factor: '6', label: '\\(6\\pmod{14}\\)' },
  { modulus: '12', factor: '0', label: '\\(0\\pmod{12}\\)' },
];

export function CancellationLab() {
  const state = useSyncExternalStore(
    studyStore.subscribe,
    studyStore.getSnapshot,
  );
  const [modulus, setModulus] = useState(state.fiberN);
  const [factor, setFactor] = useState(state.fiberC);
  useEffect(() => {
    setModulus(state.fiberN);
    setFactor(state.fiberC);
  }, [state.fiberN, state.fiberC]);
  const [prediction, setPrediction] = useState<'yes' | 'no' | null>(null);
  const [error, setError] = useState('');
  const map = state.fiberMap;
  const [selectedOutput, setSelectedOutput] = useState<number | null>(null);
  const selected =
    map?.fibers.find((fiber) => fiber.output === selectedOutput) ??
    map?.fibers[0];
  function run(n: string, c: string) {
    try {
      studyStore.setCancellationMap(n, c);
      setModulus(n);
      setFactor(c);
      setSelectedOutput(null);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invalid input.');
    }
  }
  return (
    <section className="cancellation-lab" aria-labelledby="cancellation-title">
      <div className="cancellation-intro">
        <p className="eyebrow">EXACT EXPERIMENT · C02</p>
        <h2 id="cancellation-title">What does multiplication forget?</h2>
        <p>
          <MathText
            text={
              'Predict whether \\(x\\mapsto cx\\pmod n\\) can send two different inputs to the same output.'
            }
          />
        </p>
        <fieldset className="prediction-row">
          <legend>Predict</legend>
          <button
            type="button"
            aria-pressed={prediction === 'yes'}
            onClick={() => setPrediction('yes')}
          >
            It merges inputs
          </button>
          <button
            type="button"
            aria-pressed={prediction === 'no'}
            onClick={() => setPrediction('no')}
          >
            It permutes inputs
          </button>
        </fieldset>
        {prediction && map && (
          <p className="prediction-feedback">
            <MathText
              text={
                map.gcd === 1
                  ? 'This factor is a unit: every fiber has \\(1\\) input.'
                  : `This factor loses information: every nonempty fiber has \\(${map.gcd}\\) inputs.`
              }
            />
          </p>
        )}
      </div>
      <div className="cancellation-workspace">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run(modulus, factor);
          }}
        >
          <label>
            Modulus <MathText text={'\\(n\\)'} />
            <input
              value={modulus}
              onChange={(event) => setModulus(event.target.value)}
              inputMode="numeric"
            />
          </label>
          <label>
            Factor <MathText text={'\\(c\\)'} />
            <input
              value={factor}
              onChange={(event) => setFactor(event.target.value)}
              inputMode="numeric"
            />
          </label>
          <button type="submit">Map the residues</button>
        </form>
        <fieldset className="cancellation-presets">
          <legend>Examples</legend>
          {presets.map((preset) => (
            <button
              type="button"
              key={`${preset.modulus}-${preset.factor}`}
              onClick={() => run(preset.modulus, preset.factor)}
            >
              <MathText text={preset.label} />
            </button>
          ))}
        </fieldset>
        {error && <p role="alert">{error}</p>}
        {map && (
          <>
            <div className="fiber-summary">
              <strong>
                <MathText
                  text={`\\(\\gcd(${map.factor},${map.modulus})=${map.gcd}\\)`}
                />
              </strong>
              <span>
                <MathText
                  text={`Equality of outputs preserves the input modulo \\(${map.reducedModulus}\\).`}
                />
              </span>
            </div>
            <fieldset className="fiber-buttons">
              <legend>Select an output fiber</legend>
              {map.fibers.map((fiber) => (
                <button
                  type="button"
                  key={fiber.output}
                  aria-pressed={selected?.output === fiber.output}
                  onClick={() => setSelectedOutput(fiber.output)}
                >
                  <MathText text={`\\(${fiber.output}\\)`} />
                </button>
              ))}
            </fieldset>
            {selected && (
              <p className="fiber-equation">
                <MathText
                  text={`Output \\(${selected.output}\\) has inputs \\(${selected.inputs.join(',')}\\). Each pair differs by a multiple of \\(${map.reducedModulus}\\).`}
                />
              </p>
            )}
            <details className="fiber-table">
              <summary>Show the complete exact map</summary>
              <table>
                <caption>
                  <MathText
                    text={`Multiplication by \\(${map.factor}\\) modulo \\(${map.modulus}\\)`}
                  />
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Input</th>
                    <th scope="col">Output</th>
                  </tr>
                </thead>
                <tbody>
                  {map.rows.map((row) => (
                    <tr key={row.input}>
                      <td>
                        <MathText text={`\\(${row.input}\\)`} />
                      </td>
                      <td>
                        <MathText text={`\\(${row.output}\\)`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
        <p className="lab-boundary">
          <MathText
            text={
              'The table verifies these bounded inputs. The proof below establishes the cancellation rule for every allowed integer.'
            }
          />
        </p>
      </div>
    </section>
  );
}
