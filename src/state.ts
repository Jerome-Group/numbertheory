import { lessons } from './content/lessons';
import {
  buildCancellationMap,
  type CancellationMap,
} from './math/cancellation';
import { lessonPath, routeFromLocation, viewPath } from './routes';
import {
  buildPellOrbit,
  buildRationalContinuedFraction,
  buildSqrtContinuedFraction,
  type PellOrbit,
  type RationalContinuedFraction,
  type SqrtContinuedFraction,
} from './math/continued-fraction';
import { type CrtResult, solveCrt } from './math/crt';
import { divideGaussian, type GaussianDivision } from './math/gaussian';
import { type EuclidResult, extendedEuclid } from './math/euclid';
import {
  buildDivisorIncidenceStudy,
  buildReciprocityLattice,
  buildUnitOrderSpectrum,
  type ArithmeticFunction,
  type DivisorIncidenceStudy,
  type ReciprocityLattice,
  type UnitOrderSpectrum,
} from './math/group-labs';
import { buildHenselTree, type HenselTree } from './math/hensel';
import { type LinearResult, solveLinear } from './math/linear';
import {
  solveLocalSquares,
  type LocalSquareResult,
} from './math/local-squares';
import {
  buildQuadraticResidueMap,
  buildResidueClock,
  type QuadraticResidueResult,
  type ResidueClockResult,
  type ResidueOperation,
} from './math/residue';

export type AtlasView =
  | 'lesson'
  | 'learn'
  | 'explore'
  | 'practice'
  | 'reference'
  | 'course'
  | 'not-found';
export type StudyState = {
  view: AtlasView;
  lessonId: string;
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
  const values = Object.fromEntries(
    Object.keys(defaults).map((key) => [
      key,
      p.get(key === 'lessonId' ? 'lesson' : key) ??
        defaults[key as keyof typeof defaults],
    ]),
  ) as typeof defaults;
  const route = routeFromLocation(location.pathname, location.search);
  const lessonId =
    route.lessonId && lessons.some((x) => x.id === route.lessonId)
      ? route.lessonId
      : defaults.lessonId;
  const view = route.view as AtlasView;
  let result: EuclidResult | null = null,
    crt: CrtResult | null = null,
    linear: LinearResult | null = null,
    residue: ResidueClockResult | null = null,
    quadratic: QuadraticResidueResult | null = null,
    hensel: HenselTree | null = null,
    continuedFraction:
      | RationalContinuedFraction
      | SqrtContinuedFraction
      | null = null,
    pell: PellOrbit | null = null,
    divisorStudy: DivisorIncidenceStudy | null = null,
    orderStudy: UnitOrderSpectrum | null = null,
    lattice: ReciprocityLattice | null = null,
    fiberMap: CancellationMap | null = null,
    gaussian: GaussianDivision | null = null,
    squareResult: LocalSquareResult | null = null;
  try {
    result = extendedEuclid(values.a, values.b);
  } catch {
    /* The visible lab accepts corrected values. */
  }
  try {
    crt = solveCrt(values.ca, values.cm, values.cb, values.cn);
  } catch {
    /* The visible lab accepts corrected values. */
  }
  try {
    linear = solveLinear(values.la, values.lb, values.ln);
  } catch {
    /* The visible lab accepts corrected values. */
  }
  try {
    residue = buildResidueClock(
      values.rm,
      values.rf,
      values.rs,
      values.ro,
      values.rr0,
      values.rr1,
    );
  } catch {
    /* The visible lab accepts corrected values. */
  }
  try {
    quadratic = buildQuadraticResidueMap(values.qp, values.qt);
  } catch {
    /* The visible lab accepts corrected values. */
  }
  try {
    hensel = buildHenselTree(values.hp, values.hc, values.hl);
  } catch {
    /* The visible lab accepts corrected values. */
  }
  try {
    continuedFraction =
      values.cftype === 'sqrt'
        ? buildSqrtContinuedFraction(values.cfD, values.cfterms)
        : buildRationalContinuedFraction(values.cfn, values.cfd);
  } catch {
    /* The visible lab accepts corrected values. */
  }
  try {
    pell = buildPellOrbit(values.pellD, values.pellCount);
  } catch {
    /* The visible lab accepts corrected values. */
  }
  try {
    divisorStudy = buildDivisorIncidenceStudy(
      values.divisorN,
      values.divisorF,
      values.divisorG,
    );
  } catch {
    /* The visible lab accepts corrected values. */
  }
  try {
    orderStudy = buildUnitOrderSpectrum(values.orderP, values.orderG);
  } catch {
    /* The visible lab accepts corrected values. */
  }
  try {
    lattice = buildReciprocityLattice(values.latticeP, values.latticeQ);
  } catch {
    /* The visible lab accepts corrected values. */
  }
  try {
    fiberMap = buildCancellationMap(values.fiberN, values.fiberC);
  } catch {
    /* The visible lab accepts corrected values. */
  }
  try {
    gaussian = divideGaussian(values.ga, values.gb, values.gc, values.gd);
  } catch {
    /* The visible lab accepts corrected values. */
  }
  try {
    squareResult = solveLocalSquares(values.squareM, values.squareA);
  } catch {
    /* The visible lab accepts corrected values. */
  }
  return {
    ...values,
    view,
    lessonId,
    result,
    crt,
    linear,
    residue,
    quadratic,
    hensel,
    continuedFraction,
    pell,
    divisorStudy,
    orderStudy,
    lattice,
    fiberMap,
    gaussian,
    squareResult,
  };
}
let state: StudyState = fromUrl();
function emit() {
  for (const listener of listeners) listener();
}
function saveUrl() {
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
  const path =
    state.view === 'lesson' ? lessonPath(state.lessonId) : viewPath(state.view);
  const search = p.toString();
  history.pushState(null, '', search ? `${path}?${search}` : path);
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
  openLesson(lessonId: string) {
    if (!lessons.some((x) => x.id === lessonId))
      throw new Error('Unknown lesson ID.');
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
        'reference',
        'course',
      ].includes(view)
    )
      throw new Error('Unknown atlas view.');
    state = { ...state, view };
    saveUrl();
    emit();
    return state;
  },
  setCancellationMap(modulus: string, factor: string) {
    const fiberMap = buildCancellationMap(modulus, factor);
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
window.addEventListener('popstate', () => {
  state = fromUrl();
  emit();
});
