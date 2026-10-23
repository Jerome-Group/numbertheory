import { lessons } from './content/lessons';
import {
  buildCancellationMap,
  type CancellationMap,
} from './math/cancellation';
import {
  defaultInvestigation,
  encodeInvestigationRoute,
  type InvestigationId,
  type InvestigationRoute,
  type InvestigationSelection,
  inspectInvestigation,
  type KeptWitnesses,
  parseInvestigationRoute,
} from './math/conjectures';
import {
  buildPellOrbit,
  buildRationalContinuedFraction,
  buildSqrtContinuedFraction,
  type PellOrbit,
  type RationalContinuedFraction,
  type SqrtContinuedFraction,
} from './math/continued-fraction';
import { type CrtResult, solveCrt } from './math/crt';
import { type EuclidResult, extendedEuclid } from './math/euclid';
import { divideGaussian, type GaussianDivision } from './math/gaussian';
import {
  type ArithmeticFunction,
  buildDivisorIncidenceStudy,
  buildReciprocityLattice,
  buildUnitOrderSpectrum,
  type DivisorIncidenceStudy,
  type ReciprocityLattice,
  type UnitOrderSpectrum,
} from './math/group-labs';
import { buildHenselTree, type HenselTree } from './math/hensel';
import { type LinearResult, solveLinear } from './math/linear';
import {
  type LocalSquareResult,
  solveLocalSquares,
} from './math/local-squares';
import {
  buildQuadraticResidueMap,
  buildResidueClock,
  type QuadraticResidueResult,
  type ResidueClockResult,
  type ResidueOperation,
} from './math/residue';
import { lessonPath, routeFromLocation, viewPath } from './routes';

export type AtlasView =
  | 'lesson'
  | 'learn'
  | 'explore'
  | 'practice'
  | 'studio'
  | 'reference'
  | 'course'
  | 'not-found';
export type StudyState = {
  view: AtlasView;
  lessonId: string;
  urlIssue: string | null;
  investigation: InvestigationRoute | null;
  keptWitnesses: KeptWitnesses;
  a: string;
  b: string;
  result: EuclidResult | null;
  ca: string;
  cm: string;
  cb: string;
  cn: string;
  crt: CrtResult | null;
  la: string;
  lb: string;
  ln: string;
  linear: LinearResult | null;
  rm: string;
  rf: string;
  rs: string;
  ro: ResidueOperation;
  rr0: string;
  rr1: string;
  residue: ResidueClockResult | null;
  qp: string;
  qt: string;
  quadratic: QuadraticResidueResult | null;
  hp: string;
  hc: string;
  hl: string;
  hensel: HenselTree | null;
  cftype: 'rational' | 'sqrt';
  cfn: string;
  cfd: string;
  cfD: string;
  cfterms: string;
  continuedFraction: RationalContinuedFraction | SqrtContinuedFraction | null;
  pellD: string;
  pellCount: string;
  pell: PellOrbit | null;
  divisorN: string;
  divisorF: ArithmeticFunction;
  divisorG: ArithmeticFunction;
  divisorStudy: DivisorIncidenceStudy | null;
  orderP: string;
  orderG: string;
  orderStudy: UnitOrderSpectrum | null;
  latticeP: string;
  latticeQ: string;
  lattice: ReciprocityLattice | null;
  fiberN: string;
  fiberC: string;
  fiberMap: CancellationMap | null;
  ga: string;
  gb: string;
  gc: string;
  gd: string;
  gaussian: GaussianDivision | null;
  squareM: string;
  squareA: string;
  squareResult: LocalSquareResult | null;
};
const defaults = {
  view: 'learn' as AtlasView,
  lessonId: 'D04',
  a: '252',
  b: '105',
  ca: '2',
  cm: '6',
  cb: '8',
  cn: '9',
  la: '6',
  lb: '8',
  ln: '14',
  rm: '7',
  rf: '-1',
  rs: '9',
  ro: 'add' as ResidueOperation,
  rr0: '-7',
  rr1: '14',
  qp: '7',
  qt: '2',
  hp: '7',
  hc: '2',
  hl: '3',
  cftype: 'rational' as 'rational' | 'sqrt',
  cfn: '43',
  cfd: '19',
  cfD: '2',
  cfterms: '8',
  pellD: '13',
  pellCount: '5',
  divisorN: '12',
  divisorF: 'one' as ArithmeticFunction,
  divisorG: 'one' as ArithmeticFunction,
  orderP: '7',
  orderG: '3',
  latticeP: '7',
  latticeQ: '11',
  fiberN: '12',
  fiberC: '4',
  ga: '7',
  gb: '5',
  gc: '3',
  gd: '2',
  squareM: '72',
  squareA: '1',
};
const listeners = new Set<() => void>();
function fromUrl(): StudyState {
  const p = new URLSearchParams(location.search);
  const route = routeFromLocation(location.pathname, location.search);
  const lessonId =
    route.lessonId && lessons.some((x) => x.id === route.lessonId)
      ? route.lessonId
      : defaults.lessonId;
  const view = route.view as AtlasView;
  const recovered: string[] = [];
  const investigation = parseInvestigationRoute(p);
  function hydrate<T>(
    name: string,
    build: (read: (key: keyof typeof defaults) => string) => T,
  ): T {
    try {
      return build((key) => p.get(key) ?? defaults[key]);
    } catch {
      recovered.push(name);
      return build((key) => defaults[key]);
    }
  }
  return {
    view,
    lessonId,
    investigation:
      view === 'studio' && investigation.kind === 'valid'
        ? investigation.route
        : null,
    keptWitnesses: new Map(),
    ...hydrate('Euclidean algorithm', (read) => {
      const a = read('a'),
        b = read('b');
      return { a, b, result: extendedEuclid(a, b) };
    }),
    ...hydrate('Chinese remainder theorem', (read) => {
      const ca = read('ca'),
        cm = read('cm'),
        cb = read('cb'),
        cn = read('cn');
      return { ca, cm, cb, cn, crt: solveCrt(ca, cm, cb, cn) };
    }),
    ...hydrate('linear congruences', (read) => {
      const la = read('la'),
        lb = read('lb'),
        ln = read('ln');
      return { la, lb, ln, linear: solveLinear(la, lb, ln) };
    }),
    ...hydrate('residue clock', (read) => {
      const rm = read('rm'),
        rf = read('rf'),
        rs = read('rs'),
        ro = read('ro'),
        rr0 = read('rr0'),
        rr1 = read('rr1');
      if (ro !== 'add' && ro !== 'multiply')
        throw new Error('Choose addition or multiplication.');
      return {
        rm,
        rf,
        rs,
        ro,
        rr0,
        rr1,
        residue: buildResidueClock(rm, rf, rs, ro, rr0, rr1),
      };
    }),
    ...hydrate('quadratic residues', (read) => {
      const qp = read('qp'),
        qt = read('qt');
      return { qp, qt, quadratic: buildQuadraticResidueMap(qp, qt) };
    }),
    ...hydrate('Hensel tree', (read) => {
      const hp = read('hp'),
        hc = read('hc'),
        hl = read('hl');
      return { hp, hc, hl, hensel: buildHenselTree(hp, hc, hl) };
    }),
    ...hydrate('continued fractions', (read) => {
      const cftype = read('cftype'),
        cfn = read('cfn'),
        cfd = read('cfd'),
        cfD = read('cfD'),
        cfterms = read('cfterms');
      if (cftype !== 'rational' && cftype !== 'sqrt')
        throw new Error('Choose a rational or square-root input.');
      const rational = buildRationalContinuedFraction(cfn, cfd);
      const sqrt = buildSqrtContinuedFraction(cfD, cfterms);
      return {
        cftype,
        cfn,
        cfd,
        cfD,
        cfterms,
        continuedFraction: cftype === 'sqrt' ? sqrt : rational,
      };
    }),
    ...hydrate('Pell orbit', (read) => {
      const pellD = read('pellD'),
        pellCount = read('pellCount');
      return { pellD, pellCount, pell: buildPellOrbit(pellD, pellCount) };
    }),
    ...hydrate('divisor incidence', (read) => {
      const divisorN = read('divisorN'),
        divisorF = read('divisorF'),
        divisorG = read('divisorG');
      if (
        (divisorF !== 'one' &&
          divisorF !== 'identity' &&
          divisorF !== 'mobius' &&
          divisorF !== 'totient') ||
        (divisorG !== 'one' &&
          divisorG !== 'identity' &&
          divisorG !== 'mobius' &&
          divisorG !== 'totient')
      )
        throw new Error('Choose supported arithmetic functions.');
      return {
        divisorN,
        divisorF,
        divisorG,
        divisorStudy: buildDivisorIncidenceStudy(divisorN, divisorF, divisorG),
      };
    }),
    ...hydrate('unit orders', (read) => {
      const orderP = read('orderP'),
        orderG = read('orderG');
      return {
        orderP,
        orderG,
        orderStudy: buildUnitOrderSpectrum(orderP, orderG),
      };
    }),
    ...hydrate('reciprocity lattice', (read) => {
      const latticeP = read('latticeP'),
        latticeQ = read('latticeQ');
      return {
        latticeP,
        latticeQ,
        lattice: buildReciprocityLattice(latticeP, latticeQ),
      };
    }),
    ...hydrate('cancellation map', (read) => {
      const fiberN = read('fiberN'),
        fiberC = read('fiberC');
      return { fiberN, fiberC, fiberMap: buildCancellationMap(fiberN, fiberC) };
    }),
    ...hydrate('Gaussian division', (read) => {
      const ga = read('ga'),
        gb = read('gb'),
        gc = read('gc'),
        gd = read('gd');
      return { ga, gb, gc, gd, gaussian: divideGaussian(ga, gb, gc, gd) };
    }),
    ...hydrate('local square roots', (read) => {
      const squareM = read('squareM'),
        squareA = read('squareA');
      return {
        squareM,
        squareA,
        squareResult: solveLocalSquares(squareM, squareA),
      };
    }),
    urlIssue:
      view === 'studio' && investigation.kind === 'invalid'
        ? investigation.message
        : recovered.length
          ? `Invalid experiment inputs in this URL. Restored default examples for ${recovered.join(', ')}.`
          : null,
  };
}
let state: StudyState = fromUrl();
let revision = 0;
let navigationRevision = 0;
function emit() {
  revision++;
  for (const listener of listeners) listener();
}
function saveUrl(mode: 'push' | 'replace' = 'push') {
  state = { ...state, urlIssue: null };
  const p = new URLSearchParams();
  for (const key of [
    'a',
    'b',
    'ca',
    'cm',
    'cb',
    'cn',
    'la',
    'lb',
    'ln',
    'rm',
    'rf',
    'rs',
    'ro',
    'rr0',
    'rr1',
    'qp',
    'qt',
    'hp',
    'hc',
    'hl',
    'cftype',
    'cfn',
    'cfd',
    'cfD',
    'cfterms',
    'pellD',
    'pellCount',
    'divisorN',
    'divisorF',
    'divisorG',
    'orderP',
    'orderG',
    'latticeP',
    'latticeQ',
    'fiberN',
    'fiberC',
    'ga',
    'gb',
    'gc',
    'gd',
    'squareM',
    'squareA',
  ] as const)
    if (state[key] !== defaults[key]) p.set(key, state[key]);
  if (state.view === 'studio' && state.investigation)
    for (const [key, value] of encodeInvestigationRoute(state.investigation))
      p.set(key, value);
  const path =
    state.view === 'lesson' ? lessonPath(state.lessonId) : viewPath(state.view);
  const search = p.toString();
  const hash =
    state.view === 'studio' && state.investigation ? '#conjecture-clinic' : '';
  history[mode === 'replace' ? 'replaceState' : 'pushState'](
    null,
    '',
    `${search ? `${path}?${search}` : path}${hash}`,
  );
}
export const studyStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot() {
    return state;
  },
  getNavigationRevision() {
    return navigationRevision;
  },
  getRevision() {
    return revision;
  },
  openInvestigation(id: InvestigationId) {
    navigationRevision++;
    state = {
      ...state,
      view: 'studio',
      investigation: defaultInvestigation(id),
    };
    saveUrl();
    emit();
  },
  selectInvestigation(selection: InvestigationSelection) {
    if (
      state.investigation?.selection.id === selection.id &&
      state.investigation.selection.condition === selection.condition
    )
      return;
    state = { ...state, investigation: { selection, searched: false } };
    saveUrl();
    emit();
  },
  searchInvestigation() {
    if (!state.investigation || state.investigation.searched) return;
    state = {
      ...state,
      investigation: { ...state.investigation, searched: true },
    };
    saveUrl('replace');
    emit();
  },
  keepInvestigationWitness() {
    if (!state.investigation?.searched) return;
    const report = inspectInvestigation(state.investigation.selection);
    if (report.kind !== 'refuted') return;
    const keptWitnesses = new Map(state.keptWitnesses);
    keptWitnesses.set(report.investigationId, report);
    state = { ...state, keptWitnesses };
    emit();
  },
  removeKeptWitness() {
    if (!state.investigation) return;
    const keptWitnesses = new Map(state.keptWitnesses);
    keptWitnesses.delete(state.investigation.selection.id);
    state = { ...state, keptWitnesses };
    emit();
  },
  openLesson(lessonId: string) {
    if (!lessons.some((x) => x.id === lessonId))
      throw new Error('Unknown lesson ID.');
    navigationRevision++;
    state = { ...state, lessonId, view: 'lesson' };
    saveUrl();
    emit();
    return state;
  },
  openView(view: AtlasView) {
    if (
      ![
        'lesson',
        'learn',
        'explore',
        'practice',
        'studio',
        'reference',
        'course',
      ].includes(view)
    )
      throw new Error('Unknown atlas view.');
    navigationRevision++;
    state = { ...state, view };
    saveUrl();
    emit();
    return state;
  },
  setCancellationMap(modulus: string, factor: string) {
    const fiberMap = buildCancellationMap(modulus, factor);
    if (state.view !== 'lesson' || state.lessonId !== 'C02')
      navigationRevision++;
    state = {
      ...state,
      view: 'lesson',
      lessonId: 'C02',
      fiberN: String(fiberMap.modulus),
      fiberC: fiberMap.factor,
      fiberMap,
    };
    saveUrl();
    emit();
    return state;
  },
  setGaussianDivision(
    alphaRe: string,
    alphaIm: string,
    betaRe: string,
    betaIm: string,
  ) {
    const gaussian = divideGaussian(alphaRe, alphaIm, betaRe, betaIm);
    state = {
      ...state,
      view: 'lesson',
      lessonId: 'N04',
      ga: gaussian.alpha.re,
      gb: gaussian.alpha.im,
      gc: gaussian.beta.re,
      gd: gaussian.beta.im,
      gaussian,
    };
    saveUrl();
    emit();
    return state;
  },
  setLocalSquares(modulus: string, target: string) {
    const squareResult = solveLocalSquares(modulus, target);
    state = {
      ...state,
      view: 'lesson',
      lessonId: 'X05',
      squareM: String(squareResult.modulus),
      squareA: squareResult.target,
      squareResult,
    };
    saveUrl();
    emit();
    return state;
  },
  setEuclidInputs(a: string, b: string) {
    const result = extendedEuclid(a, b);
    state = {
      ...state,
      view: 'lesson',
      lessonId: 'D04',
      a: result.a,
      b: result.b,
      result,
    };
    saveUrl();
    emit();
    return state;
  },
  setCrtInputs(ca: string, cm: string, cb: string, cn: string) {
    const crt = solveCrt(ca, cm, cb, cn);
    state = {
      ...state,
      view: 'lesson',
      lessonId: state.lessonId === 'C05' ? 'C05' : 'C04',
      ca: crt.a,
      cm: crt.m,
      cb: crt.b,
      cn: crt.n,
      crt,
    };
    saveUrl();
    emit();
    return state;
  },
  setLinearInputs(la: string, lb: string, ln: string) {
    const linear = solveLinear(la, lb, ln);
    state = {
      ...state,
      view: 'lesson',
      lessonId: 'C03',
      la: linear.a,
      lb: linear.b,
      ln: linear.n,
      linear,
    };
    saveUrl();
    emit();
    return state;
  },
  setResidueInputs(
    rm: string,
    rf: string,
    rs: string,
    ro: ResidueOperation,
    rr0: string,
    rr1: string,
  ) {
    const residue = buildResidueClock(rm, rf, rs, ro, rr0, rr1);
    state = {
      ...state,
      view: 'lesson',
      lessonId: 'C01',
      rm: String(residue.modulus),
      rf: residue.first,
      rs: residue.second,
      ro: residue.operation,
      rr0,
      rr1,
      residue,
    };
    saveUrl();
    emit();
    return state;
  },
  setQuadraticInputs(qp: string, qt: string) {
    const quadratic = buildQuadraticResidueMap(qp, qt);
    state = {
      ...state,
      view: 'lesson',
      lessonId: 'Q01',
      qp: String(quadratic.prime),
      qt: quadratic.input,
      quadratic,
    };
    saveUrl();
    emit();
    return state;
  },
  setHenselInputs(hp: string, hc: string, hl: string) {
    const hensel = buildHenselTree(hp, hc, hl);
    state = {
      ...state,
      view: 'lesson',
      lessonId: state.lessonId === 'F04' ? 'F04' : 'F03',
      hp: String(hensel.prime),
      hc: hensel.c,
      hl: String(hensel.requestedLevels),
      hensel,
    };
    saveUrl();
    emit();
    return state;
  },
  setContinuedFractionInputs(
    kind: 'rational' | 'sqrt',
    numerator: string,
    denominator: string,
    radicand: string,
    terms: string,
  ) {
    const continuedFraction =
      kind === 'sqrt'
        ? buildSqrtContinuedFraction(radicand, terms)
        : buildRationalContinuedFraction(numerator, denominator);
    state = {
      ...state,
      view: 'lesson',
      lessonId: kind === 'sqrt' ? 'R05' : 'R01',
      cftype: kind,
      cfn: numerator,
      cfd: denominator,
      cfD: radicand,
      cfterms: terms,
      continuedFraction,
    };
    saveUrl();
    emit();
    return state;
  },
  setPellInputs(radicand: string, count: string) {
    const pell = buildPellOrbit(radicand, count);
    state = {
      ...state,
      view: 'lesson',
      lessonId: state.lessonId === 'R08' ? 'R08' : 'R06',
      pellD: radicand,
      pellCount: count,
      pell,
    };
    saveUrl();
    emit();
    return state;
  },
  setDivisorInputs(n: string, f: ArithmeticFunction, g: ArithmeticFunction) {
    const divisorStudy = buildDivisorIncidenceStudy(n, f, g);
    state = {
      ...state,
      view: 'lesson',
      lessonId: state.lessonId === 'A04' ? 'A04' : 'A03',
      divisorN: n,
      divisorF: f,
      divisorG: g,
      divisorStudy,
    };
    saveUrl();
    emit();
    return state;
  },
  setOrderInputs(prime: string, candidate: string) {
    const orderStudy = buildUnitOrderSpectrum(prime, candidate);
    state = {
      ...state,
      view: 'lesson',
      lessonId: state.lessonId === 'U01' ? 'U01' : 'U02',
      orderP: prime,
      orderG: candidate,
      orderStudy,
    };
    saveUrl();
    emit();
    return state;
  },
  setLatticeInputs(p: string, q: string) {
    const lattice = buildReciprocityLattice(p, q);
    state = {
      ...state,
      view: 'lesson',
      lessonId: 'Q04',
      latticeP: p,
      latticeQ: q,
      lattice,
    };
    saveUrl();
    emit();
    return state;
  },
};
window.addEventListener('hashchange', () => {
  navigationRevision++;
  emit();
});
window.addEventListener('popstate', () => {
  navigationRevision++;
  state = { ...fromUrl(), keptWitnesses: state.keptWitnesses };
  emit();
});
