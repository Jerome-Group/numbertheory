import { lessons } from '../content/lessons';
import { claimRegistry } from '../content/registries';
import { buildCancellationMap } from '../math/cancellation';
import {
  buildPellOrbit,
  buildRationalContinuedFraction,
  buildSqrtContinuedFraction,
} from '../math/continued-fraction';
import { solveCrt } from '../math/crt';
import { divideGaussian } from '../math/gaussian';
import { extendedEuclid } from '../math/euclid';
import {
  buildDivisorIncidenceStudy,
  buildReciprocityLattice,
  buildUnitOrderSpectrum,
  type ArithmeticFunction,
} from '../math/group-labs';
import { buildHenselTree } from '../math/hensel';
import { solveLinear } from '../math/linear';
import { buildQuadraticResidueMap, buildResidueClock } from '../math/residue';
import { studyStore } from '../state';

type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};
type ModelContext = {
  registerTool: (
    tool: Tool,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};
declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}
function record(input: unknown, keys: string[]): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    throw new Error('Expected an object.');
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !keys.includes(key)))
    throw new Error('Unknown field.');
  return value;
}
function stringField(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string' || value.length > max || value.length === 0)
    throw new Error(`Invalid ${name}.`);
  return value;
}
const idSchema = {
  type: 'object',
  properties: { lessonId: { type: 'string', enum: lessons.map((x) => x.id) } },
  required: ['lessonId'],
  additionalProperties: false,
};
const claimSchema = {
  type: 'object',
  properties: { claimId: { type: 'string', enum: [...claimRegistry.keys()] } },
  required: ['claimId'],
  additionalProperties: false,
};
const integerSchema = {
  type: 'object',
  properties: {
    a: { type: 'string', pattern: '^-?(0|[1-9][0-9]*)$', maxLength: 14 },
    b: { type: 'string', pattern: '^-?(0|[1-9][0-9]*)$', maxLength: 14 },
  },
  required: ['a', 'b'],
  additionalProperties: false,
};
const cancellationSchema = {
  type: 'object',
  properties: {
    modulus: { type: 'string', pattern: '^[1-9][0-9]*$', maxLength: 2 },
    factor: { type: 'string', pattern: '^-?(0|[1-9][0-9]*)$', maxLength: 14 },
  },
  required: ['modulus', 'factor'],
  additionalProperties: false,
};
const gaussianSchema = {
  type: 'object',
  properties: Object.fromEntries(
    ['alphaRe', 'alphaIm', 'betaRe', 'betaIm'].map((key) => [
      key,
      { type: 'string', pattern: '^-?(0|[1-9][0-9]*)$', maxLength: 4 },
    ]),
  ),
  required: ['alphaRe', 'alphaIm', 'betaRe', 'betaIm'],
  additionalProperties: false,
};
const crtSchema = {
  type: 'object',
  properties: Object.fromEntries(
    ['a', 'm', 'b', 'n'].map((key) => [
      key,
      { type: 'string', pattern: '^-?(0|[1-9][0-9]*)$', maxLength: 14 },
    ]),
  ),
  required: ['a', 'm', 'b', 'n'],
  additionalProperties: false,
};
const linearSchema = {
  type: 'object',
  properties: Object.fromEntries(
    ['a', 'b', 'n'].map((key) => [
      key,
      { type: 'string', pattern: '^-?(0|[1-9][0-9]*)$', maxLength: 14 },
    ]),
  ),
  required: ['a', 'b', 'n'],
  additionalProperties: false,
};
const residueSchema = {
  type: 'object',
  properties: {
    modulus: { type: 'string', pattern: '^[1-9][0-9]*$', maxLength: 2 },
    first: { type: 'string', pattern: '^-?(0|[1-9][0-9]*)$', maxLength: 14 },
    second: { type: 'string', pattern: '^-?(0|[1-9][0-9]*)$', maxLength: 14 },
    operation: { type: 'string', enum: ['add', 'multiply'] },
  },
  required: ['modulus', 'first', 'second', 'operation'],
  additionalProperties: false,
};
const quadraticSchema = {
  type: 'object',
  properties: {
    prime: { type: 'string', pattern: '^[1-9][0-9]*$', maxLength: 2 },
    target: { type: 'string', pattern: '^-?(0|[1-9][0-9]*)$', maxLength: 14 },
  },
  required: ['prime', 'target'],
  additionalProperties: false,
};
const henselSchema = {
  type: 'object',
  properties: {
    prime: { type: 'string', pattern: '^[1-9][0-9]*$', maxLength: 2 },
    constant: { type: 'string', pattern: '^-?(0|[1-9][0-9]*)$', maxLength: 14 },
    levels: { type: 'string', pattern: '^[1-9][0-9]*$', maxLength: 1 },
  },
  required: ['prime', 'constant', 'levels'],
  additionalProperties: false,
};
const viewSchema = {
  type: 'object',
  properties: {
    view: {
      type: 'string',
      enum: ['learn', 'explore', 'practice', 'reference', 'course'],
    },
  },
  required: ['view'],
  additionalProperties: false,
};
const smallDecimal = {
  type: 'string',
  pattern: '^-?(0|[1-9][0-9]*)$',
  maxLength: 4,
};
const positiveDecimal = {
  type: 'string',
  pattern: '^[1-9][0-9]*$',
  maxLength: 4,
};
const rationalCfSchema = {
  type: 'object',
  properties: { numerator: smallDecimal, denominator: positiveDecimal },
  required: ['numerator', 'denominator'],
  additionalProperties: false,
};
const sqrtCfSchema = {
  type: 'object',
  properties: {
    radicand: positiveDecimal,
    terms: { ...positiveDecimal, maxLength: 2 },
  },
  required: ['radicand', 'terms'],
  additionalProperties: false,
};
const pellSchema = {
  type: 'object',
  properties: {
    radicand: positiveDecimal,
    count: { ...positiveDecimal, maxLength: 1 },
  },
  required: ['radicand', 'count'],
  additionalProperties: false,
};
const divisorSchema = {
  type: 'object',
  properties: {
    n: { ...positiveDecimal, maxLength: 3 },
    f: { type: 'string', enum: ['one', 'identity', 'mobius', 'totient'] },
    g: { type: 'string', enum: ['one', 'identity', 'mobius', 'totient'] },
  },
  required: ['n', 'f', 'g'],
  additionalProperties: false,
};
const orderSchema = {
  type: 'object',
  properties: { prime: positiveDecimal, candidate: positiveDecimal },
  required: ['prime', 'candidate'],
  additionalProperties: false,
};
const latticeSchema = {
  type: 'object',
  properties: { p: positiveDecimal, q: positiveDecimal },
  required: ['p', 'q'],
  additionalProperties: false,
};
export function registerStudyTools(): () => void {
  const context = document.modelContext;
  if (!context?.registerTool) return () => {};
  const controller = new AbortController();
  const tools: Tool[] = [
    {
      name: 'get_number_theory_context',
      title: 'Get atlas context',
      description:
        'Describe the visible public route and lesson without exposing hidden practice answers.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        record(input, []);
        const s = studyStore.getSnapshot();
        const lesson = lessons.find((x) => x.id === s.lessonId);
        return {
          view: s.view,
          lessonId: s.view === 'lesson' ? s.lessonId : null,
          title: s.view === 'lesson' ? lesson?.title : null,
          lab: s.view === 'lesson' ? (lesson?.lab ?? null) : null,
          url: location.href,
        };
      },
    },
    {
      name: 'open_number_theory_view',
      title: 'Open atlas route',
      description:
        'Open the visible Learn, Explore, Practice, Reference, or MH3210 course route.',
      inputSchema: viewSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['view']);
        const view = stringField(o.view, 'view', 10);
        const s = studyStore.openView(
          view as Parameters<typeof studyStore.openView>[0],
        );
        return { view: s.view, url: location.href };
      },
    },
    {
      name: 'find_number_theory_lessons',
      title: 'Find lessons',
      description:
        'Search the public Number Theory lessons by title, question, or summary.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string', minLength: 1, maxLength: 80 } },
        required: ['query'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['query']);
        const q = stringField(o.query, 'query', 80).toLowerCase();
        return lessons
          .filter((x) =>
            `${x.title} ${x.question} ${x.summary}`.toLowerCase().includes(q),
          )
          .slice(0, 12)
          .map((x) => ({ id: x.id, title: x.title, question: x.question }));
      },
    },
    {
      name: 'open_number_theory_lesson',
      title: 'Open lesson',
      description: 'Open one public lesson in the visible reading interface.',
      inputSchema: idSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['lessonId']);
        const id = stringField(o.lessonId, 'lessonId', 8);
        const s = studyStore.openLesson(id);
        return { lessonId: s.lessonId, url: location.href };
      },
    },
    {
      name: 'get_number_theory_claim',
      title: 'Get theorem and proof',
      description:
        'Read a public claim, its preserved proof, dependencies and source status without changing the page.',
      inputSchema: claimSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const fields = record(input, ['claimId']);
        const id = stringField(fields.claimId, 'claimId', 32);
        const claim = claimRegistry.get(id);
        if (!claim) throw new Error('Unknown claim ID.');
        return claim;
      },
    },
    {
      name: 'compute_cancellation_map',
      title: 'Compute multiplication fibers',
      description:
        'Return the exact bounded multiplication map and its fibers without changing the page.',
      inputSchema: cancellationSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const fields = record(input, ['modulus', 'factor']);
        return buildCancellationMap(
          stringField(fields.modulus, 'modulus', 2),
          stringField(fields.factor, 'factor', 14),
        );
      },
    },
    {
      name: 'set_cancellation_map',
      title: 'Set multiplication fibers',
      description:
        'Set the visible exact C02 multiplication map and open its lesson.',
      inputSchema: cancellationSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const fields = record(input, ['modulus', 'factor']);
        const state = studyStore.setCancellationMap(
          stringField(fields.modulus, 'modulus', 2),
          stringField(fields.factor, 'factor', 14),
        );
        return {
          lessonId: state.lessonId,
          map: state.fiberMap,
          url: location.href,
        };
      },
    },
    {
      name: 'compute_gaussian_division',
      title: 'Compute Gaussian division',
      description:
        'Return an exact Gaussian quotient, remainder, and strict norm certificate without changing the page.',
      inputSchema: gaussianSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const fields = record(input, [
          'alphaRe',
          'alphaIm',
          'betaRe',
          'betaIm',
        ]);
        return divideGaussian(
          stringField(fields.alphaRe, 'alphaRe', 4),
          stringField(fields.alphaIm, 'alphaIm', 4),
          stringField(fields.betaRe, 'betaRe', 4),
          stringField(fields.betaIm, 'betaIm', 4),
        );
      },
    },
    {
      name: 'set_gaussian_division',
      title: 'Set Gaussian division',
      description:
        'Set the visible exact Gaussian division lab and open its lesson.',
      inputSchema: gaussianSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const fields = record(input, [
          'alphaRe',
          'alphaIm',
          'betaRe',
          'betaIm',
        ]);
        const state = studyStore.setGaussianDivision(
          stringField(fields.alphaRe, 'alphaRe', 4),
          stringField(fields.alphaIm, 'alphaIm', 4),
          stringField(fields.betaRe, 'betaRe', 4),
          stringField(fields.betaIm, 'betaIm', 4),
        );
        return {
          lessonId: state.lessonId,
          division: state.gaussian,
          url: location.href,
        };
      },
    },
    {
      name: 'compute_euclid',
      title: 'Compute Euclid trace',
      description:
        'Compute the exact gcd, Bézout certificate and division trace for two bounded decimal integers without changing the page.',
      inputSchema: integerSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['a', 'b']);
        return extendedEuclid(
          stringField(o.a, 'a', 14),
          stringField(o.b, 'b', 14),
        );
      },
    },
    {
      name: 'set_euclid_example',
      title: 'Set Euclid example',
      description:
        'Set the visible Euclidean algorithm lab to two bounded decimal integers and open its lesson.',
      inputSchema: integerSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['a', 'b']);
        const s = studyStore.setEuclidInputs(
          stringField(o.a, 'a', 14),
          stringField(o.b, 'b', 14),
        );
        return {
          lessonId: s.lessonId,
          a: s.a,
          b: s.b,
          gcd: s.result?.gcd,
          url: location.href,
        };
      },
    },
    {
      name: 'compute_crt',
      title: 'Compute Chinese remainders',
      description:
        'Compute an exact compatible residue class or explain why two bounded congruences have no solution, without changing the page.',
      inputSchema: crtSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['a', 'm', 'b', 'n']);
        return solveCrt(
          stringField(o.a, 'a', 14),
          stringField(o.m, 'm', 14),
          stringField(o.b, 'b', 14),
          stringField(o.n, 'n', 14),
        );
      },
    },
    {
      name: 'set_crt_example',
      title: 'Set Chinese remainder example',
      description:
        'Set the visible Chinese remainder lab to two bounded congruences and open its lesson.',
      inputSchema: crtSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['a', 'm', 'b', 'n']);
        const s = studyStore.setCrtInputs(
          stringField(o.a, 'a', 14),
          stringField(o.m, 'm', 14),
          stringField(o.b, 'b', 14),
          stringField(o.n, 'n', 14),
        );
        return {
          lessonId: s.lessonId,
          compatible: s.crt?.compatible,
          residue: s.crt?.residue,
          modulus: s.crt?.modulus,
          url: location.href,
        };
      },
    },
    {
      name: 'compute_linear_congruence',
      title: 'Compute linear congruence',
      description:
        'Solve a bounded linear congruence exactly and return its count and representatives without changing the page.',
      inputSchema: linearSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['a', 'b', 'n']);
        return solveLinear(
          stringField(o.a, 'a', 14),
          stringField(o.b, 'b', 14),
          stringField(o.n, 'n', 14),
        );
      },
    },
    {
      name: 'set_linear_congruence',
      title: 'Set linear congruence example',
      description: 'Set the visible linear congruence lab and open its lesson.',
      inputSchema: linearSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['a', 'b', 'n']);
        const s = studyStore.setLinearInputs(
          stringField(o.a, 'a', 14),
          stringField(o.b, 'b', 14),
          stringField(o.n, 'n', 14),
        );
        return {
          lessonId: s.lessonId,
          solvable: s.linear?.solvable,
          count: s.linear?.count,
          url: location.href,
        };
      },
    },
    {
      name: 'compute_residue_operation',
      title: 'Compute residue operation',
      description:
        'Compute a bounded addition or multiplication of residue classes and its shift invariant.',
      inputSchema: residueSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['modulus', 'first', 'second', 'operation']);
        const r = buildResidueClock(
          stringField(o.modulus, 'modulus', 2),
          stringField(o.first, 'first', 14),
          stringField(o.second, 'second', 14),
          stringField(o.operation, 'operation', 8) as 'add' | 'multiply',
          '0',
          '0',
        );
        return {
          modulus: r.modulus,
          firstClass: r.firstClass,
          secondClass: r.secondClass,
          resultClass: r.resultClass,
          shiftedResultClass: r.shiftedResultClass,
        };
      },
    },
    {
      name: 'set_residue_operation',
      title: 'Set residue clock',
      description:
        'Set the visible residue clock using bounded integers and open its lesson.',
      inputSchema: residueSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['modulus', 'first', 'second', 'operation']);
        const current = studyStore.getSnapshot();
        const s = studyStore.setResidueInputs(
          stringField(o.modulus, 'modulus', 2),
          stringField(o.first, 'first', 14),
          stringField(o.second, 'second', 14),
          stringField(o.operation, 'operation', 8) as 'add' | 'multiply',
          current.rr0,
          current.rr1,
        );
        return {
          lessonId: s.lessonId,
          resultClass: s.residue?.resultClass,
          url: location.href,
        };
      },
    },
    {
      name: 'compute_quadratic_residue',
      title: 'Compute quadratic residue',
      description:
        'Compute bounded quadratic roots and the Legendre value for an odd prime.',
      inputSchema: quadraticSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['prime', 'target']);
        const r = buildQuadraticResidueMap(
          stringField(o.prime, 'prime', 2),
          stringField(o.target, 'target', 14),
        );
        return {
          prime: r.prime,
          target: r.target,
          symbol: r.symbol,
          roots: r.roots,
          nonzeroSquares: r.nonzeroSquares,
        };
      },
    },
    {
      name: 'set_quadratic_residue',
      title: 'Set quadratic residue map',
      description: 'Set the visible quadratic residue map and open its lesson.',
      inputSchema: quadraticSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['prime', 'target']);
        const s = studyStore.setQuadraticInputs(
          stringField(o.prime, 'prime', 2),
          stringField(o.target, 'target', 14),
        );
        return {
          lessonId: s.lessonId,
          symbol: s.quadratic?.symbol,
          rootCount: s.quadratic?.roots.length,
          url: location.href,
        };
      },
    },
    {
      name: 'compute_hensel_tree',
      title: 'Compute Hensel root tree',
      description:
        'Compute bounded root counts and branch types for x squared minus a constant modulo powers of an odd prime.',
      inputSchema: henselSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['prime', 'constant', 'levels']);
        const r = buildHenselTree(
          stringField(o.prime, 'prime', 2),
          stringField(o.constant, 'constant', 14),
          stringField(o.levels, 'levels', 1),
        );
        return {
          prime: r.prime,
          constant: r.c,
          levels: r.levels.map((level) => ({
            level: level.level,
            modulus: level.modulus,
            count: level.roots.length,
            firstRoots: level.roots.slice(0, 16),
          })),
          branchCounts: {
            unique: r.branches.filter((b) => b.kind === 'unique').length,
            none: r.branches.filter((b) => b.kind === 'none').length,
            all: r.branches.filter((b) => b.kind === 'all').length,
          },
        };
      },
    },
    {
      name: 'set_hensel_tree',
      title: 'Set Hensel root tree',
      description: 'Set the visible Hensel root tree and open its lesson.',
      inputSchema: henselSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['prime', 'constant', 'levels']);
        const s = studyStore.setHenselInputs(
          stringField(o.prime, 'prime', 2),
          stringField(o.constant, 'constant', 14),
          stringField(o.levels, 'levels', 1),
        );
        return {
          lessonId: s.lessonId,
          rootCount: s.hensel?.finalRoots.length,
          url: location.href,
        };
      },
    },
    {
      name: 'compute_rational_continued_fraction',
      title: 'Compute rational continued fraction',
      description:
        'Return an exact finite expansion, division trace and convergents without changing the page.',
      inputSchema: rationalCfSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['numerator', 'denominator']);
        return buildRationalContinuedFraction(
          stringField(o.numerator, 'numerator', 4),
          stringField(o.denominator, 'denominator', 4),
        );
      },
    },
    {
      name: 'set_rational_continued_fraction',
      title: 'Set rational continued fraction',
      description:
        'Set the visible continued-fraction staircase and open its lesson.',
      inputSchema: rationalCfSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['numerator', 'denominator']);
        const s = studyStore.getSnapshot();
        const next = studyStore.setContinuedFractionInputs(
          'rational',
          stringField(o.numerator, 'numerator', 4),
          stringField(o.denominator, 'denominator', 4),
          s.cfD,
          s.cfterms,
        );
        return {
          lessonId: next.lessonId,
          expansion:
            next.continuedFraction?.kind === 'rational'
              ? next.continuedFraction.canonical
              : null,
          url: location.href,
        };
      },
    },
    {
      name: 'compute_sqrt_continued_fraction',
      title: 'Compute square-root continued fraction',
      description:
        'Return exact periodic coefficients and bounded convergents for a nonsquare radicand.',
      inputSchema: sqrtCfSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['radicand', 'terms']);
        return buildSqrtContinuedFraction(
          stringField(o.radicand, 'radicand', 4),
          stringField(o.terms, 'terms', 2),
        );
      },
    },
    {
      name: 'set_sqrt_continued_fraction',
      title: 'Set square-root continued fraction',
      description:
        'Set the visible periodic continued-fraction staircase and open its lesson.',
      inputSchema: sqrtCfSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['radicand', 'terms']);
        const s = studyStore.getSnapshot();
        const next = studyStore.setContinuedFractionInputs(
          'sqrt',
          s.cfn,
          s.cfd,
          stringField(o.radicand, 'radicand', 4),
          stringField(o.terms, 'terms', 2),
        );
        return {
          lessonId: next.lessonId,
          periodLength:
            next.continuedFraction?.kind === 'sqrt'
              ? next.continuedFraction.periodLength
              : null,
          url: location.href,
        };
      },
    },
    {
      name: 'compute_pell_orbit',
      title: 'Compute Pell orbit',
      description:
        'Return the fundamental norm-one solution, period parity and bounded exact orbit.',
      inputSchema: pellSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['radicand', 'count']);
        return buildPellOrbit(
          stringField(o.radicand, 'radicand', 4),
          stringField(o.count, 'count', 1),
        );
      },
    },
    {
      name: 'set_pell_orbit',
      title: 'Set Pell orbit',
      description: 'Set the visible Pell solution orbit and open its lesson.',
      inputSchema: pellSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['radicand', 'count']);
        const s = studyStore.setPellInputs(
          stringField(o.radicand, 'radicand', 4),
          stringField(o.count, 'count', 1),
        );
        return {
          lessonId: s.lessonId,
          fundamental: s.pell?.fundamental,
          url: location.href,
        };
      },
    },
    {
      name: 'compute_divisor_convolution',
      title: 'Compute divisor convolution',
      description:
        'Return exact divisor and complement contributions and inversion checks.',
      inputSchema: divisorSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['n', 'f', 'g']);
        return buildDivisorIncidenceStudy(
          stringField(o.n, 'n', 3),
          stringField(o.f, 'f', 8) as ArithmeticFunction,
          stringField(o.g, 'g', 8) as ArithmeticFunction,
        );
      },
    },
    {
      name: 'set_divisor_convolution',
      title: 'Set divisor convolution',
      description: 'Set the visible divisor-incidence lab and open its lesson.',
      inputSchema: divisorSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['n', 'f', 'g']);
        const s = studyStore.setDivisorInputs(
          stringField(o.n, 'n', 3),
          stringField(o.f, 'f', 8) as ArithmeticFunction,
          stringField(o.g, 'g', 8) as ArithmeticFunction,
        );
        return {
          lessonId: s.lessonId,
          value: s.divisorStudy?.convolutionValue,
          url: location.href,
        };
      },
    },
    {
      name: 'compute_primitive_root_cycle',
      title: 'Compute primitive-root cycle',
      description:
        'Return exact order, cycle, generator tests and unit-order spectrum.',
      inputSchema: orderSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['prime', 'candidate']);
        return buildUnitOrderSpectrum(
          stringField(o.prime, 'prime', 4),
          stringField(o.candidate, 'candidate', 4),
        );
      },
    },
    {
      name: 'set_primitive_root_cycle',
      title: 'Set primitive-root cycle',
      description: 'Set the visible unit-order lab and open its lesson.',
      inputSchema: orderSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['prime', 'candidate']);
        const s = studyStore.setOrderInputs(
          stringField(o.prime, 'prime', 4),
          stringField(o.candidate, 'candidate', 4),
        );
        return {
          lessonId: s.lessonId,
          order: s.orderStudy?.candidateOrder,
          url: location.href,
        };
      },
    },
    {
      name: 'compute_reciprocity_lattice',
      title: 'Compute reciprocity lattice',
      description:
        'Return exact half-rectangle counts, symbols and reciprocity parity.',
      inputSchema: latticeSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['p', 'q']);
        return buildReciprocityLattice(
          stringField(o.p, 'p', 4),
          stringField(o.q, 'q', 4),
        );
      },
    },
    {
      name: 'set_reciprocity_lattice',
      title: 'Set reciprocity lattice',
      description: 'Set the visible reciprocity lattice and open its lesson.',
      inputSchema: latticeSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const o = record(input, ['p', 'q']);
        const s = studyStore.setLatticeInputs(
          stringField(o.p, 'p', 4),
          stringField(o.q, 'q', 4),
        );
        return {
          lessonId: s.lessonId,
          sign: s.lattice?.reciprocitySign,
          url: location.href,
        };
      },
    },
  ];
  for (const tool of tools) {
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: controller.signal }),
      ).catch(() => {});
    } catch {
      /* Reading and labs remain usable without browser tool support. */
    }
  }
  return () => controller.abort();
}
