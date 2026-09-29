/**
 * Particle shapes, generated from math (no 3D model to download).
 * Each generator returns `count` points (x, y, z) that fit in a sphere of radius ~1.7.
 */
export type ShapeName =
  | "sphere"
  | "dna"
  | "tooth"
  | "eye"
  | "brain"
  | "skin"
  | "bear"
  | "heart"
  | "field";

type Gen = (i: number, out: [number, number, number]) => void;

const TAU = Math.PI * 2;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);

/** Uniform random direction on the unit sphere. */
function dir(out: [number, number, number]) {
  const u = rand(-1, 1);
  const a = rand(0, TAU);
  const s = Math.sqrt(1 - u * u);
  out[0] = s * Math.cos(a);
  out[1] = u;
  out[2] = s * Math.sin(a);
  return out;
}

const sphere: Gen = (i, o) => {
  const r = Math.random();
  if (r < 0.72) {
    dir(o);
    const k = 1.45 + rand(-0.03, 0.03);
    o[0] *= k; o[1] *= k; o[2] *= k;
  } else if (r < 0.86) {
    // inner glow
    dir(o);
    const k = Math.cbrt(Math.random()) * 1.2;
    o[0] *= k; o[1] *= k; o[2] *= k;
  } else {
    // two orbit rings
    const a = rand(0, TAU);
    const ring = r < 0.93 ? 0 : 1;
    const R = ring === 0 ? 2.15 : 2.45;
    const x = Math.cos(a) * R, y = Math.sin(a) * R;
    const tilt = ring === 0 ? 1.25 : 1.75;
    const twist = ring === 0 ? 0.25 : -0.5;
    // rotate around X then Z
    const y1 = y * Math.cos(tilt), z1 = y * Math.sin(tilt);
    o[0] = x * Math.cos(twist) - y1 * Math.sin(twist);
    o[1] = x * Math.sin(twist) + y1 * Math.cos(twist);
    o[2] = z1;
  }
};

const dna: Gen = (i, o) => {
  const t = rand(-1, 1);
  const y = t * 2.2;
  const a = t * 7.5;
  const r = Math.random();
  if (r < 0.7) {
    const strand = r < 0.35 ? 0 : Math.PI;
    const R = 0.75 + rand(-0.04, 0.04);
    o[0] = Math.cos(a + strand) * R;
    o[2] = Math.sin(a + strand) * R;
    o[1] = y + rand(-0.03, 0.03);
  } else {
    // base pairs (rungs), quantized along the helix
    const tq = Math.round(t * 18) / 18;
    const aq = tq * 7.5;
    const s = rand(-1, 1) * 0.75;
    o[0] = Math.cos(aq) * s;
    o[2] = Math.sin(aq) * s;
    o[1] = tq * 2.2 + rand(-0.015, 0.015);
  }
  // lean the helix a little
  const lean = 0.35;
  const x = o[0], yy = o[1];
  o[0] = x * Math.cos(lean) - yy * Math.sin(lean);
  o[1] = x * Math.sin(lean) + yy * Math.cos(lean);
};

const tooth: Gen = (i, o) => {
  if (Math.random() < 0.62) {
    // crown: a rounded "squircle" block with four cusps on top
    dir(o);
    const sq = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 0.55);
    let x = sq(o[0]) * 0.95, y = sq(o[1]) * 0.62, z = sq(o[2]) * 0.8;
    if (y > 0.3) y += 0.22 * Math.pow(Math.abs(Math.cos(x * 3.3) * Math.cos(z * 3.6)), 1.5);
    if (y < -0.3) { x *= 0.82; z *= 0.82; } // neck
    o[0] = x; o[1] = y + 0.45; o[2] = z;
  } else {
    // two conical roots, slightly apart, tips curving inwards
    const side = Math.random() < 0.5 ? -1 : 1;
    const s = Math.pow(Math.random(), 0.85);
    const R = 0.36 * Math.pow(1 - s, 0.9) + 0.035;
    const a = rand(0, TAU);
    o[0] = side * (0.34 + 0.12 * Math.sin(s * Math.PI * 0.9)) + Math.cos(a) * R;
    o[2] = Math.sin(a) * R * 0.85;
    o[1] = -0.12 - s * 1.35;
  }
  o[1] += 0.25;
};

const eye: Gen = (i, o) => {
  const r = Math.random();
  if (r < 0.5) {
    // eyeball, leaving the front open for the iris
    do dir(o); while (o[2] > 0.72);
    o[0] *= 1.35; o[1] *= 1.35; o[2] *= 1.35;
  } else if (r < 0.9) {
    // iris: radial fibres around a dark pupil
    const fibres = 90;
    const a = (Math.floor(rand(0, fibres)) / fibres) * TAU + rand(-0.012, 0.012);
    const rr = rand(0.32, 0.86);
    o[0] = Math.cos(a) * rr;
    o[1] = Math.sin(a) * rr;
    o[2] = Math.sqrt(Math.max(0, 1.35 * 1.35 - rr * rr)) - 0.12;
  } else {
    // cornea dome
    const a = rand(0, TAU);
    const rr = Math.sqrt(Math.random()) * 0.95;
    o[0] = Math.cos(a) * rr;
    o[1] = Math.sin(a) * rr;
    o[2] = 1.18 + 0.28 * (1 - (rr * rr) / 0.9);
  }
  // look slightly towards the viewer's left
  const yaw = -0.35;
  const x = o[0], z = o[2];
  o[0] = x * Math.cos(yaw) + z * Math.sin(yaw);
  o[2] = -x * Math.sin(yaw) + z * Math.cos(yaw);
};

const brain: Gen = (i, o) => {
  if (Math.random() < 0.94) {
    dir(o);
    const side = o[0] >= 0 ? 1 : -1;
    const th = Math.atan2(o[2], o[1]);
    const ph = Math.asin(Math.max(-1, Math.min(1, o[0])));
    const folds = 1 + 0.075 * Math.sin(9 * th + 3 * Math.sin(6 * ph)) + 0.04 * Math.sin(17 * ph + 2 * th);
    o[0] = o[0] * 0.95 * folds + side * 0.1;
    o[1] = o[1] * 1.05 * folds;
    o[2] = o[2] * 1.45 * folds;
    if (o[1] < -0.55) o[1] = -0.55 + (o[1] + 0.55) * 0.45; // flatter base
  } else {
    // brain stem
    const s = Math.random();
    const a = rand(0, TAU);
    o[0] = Math.cos(a) * 0.2;
    o[2] = -0.35 + Math.sin(a) * 0.2 - s * 0.15;
    o[1] = -0.6 - s * 0.8;
  }
  o[1] += 0.2;
};

/** Dermatology: the classic 3D block of skin (layers, wavy surface, hairs). */
const skin: Gen = (i, o) => {
  const W = 1.5, D = 0.95, B = -0.95;
  const top = (x: number, z: number) => 0.55 + 0.07 * Math.sin(x * 4.2) * Math.cos(z * 3.1);
  const r = Math.random();
  const x = rand(-W, W), z = rand(-D, D);
  if (r < 0.38) {
    // wavy surface
    o[0] = x; o[2] = z; o[1] = top(x, z);
  } else if (r < 0.66) {
    // front cut: dense lines at the layer boundaries (epidermis / dermis / fat)
    const layers = [0.42, 0.05, -0.45];
    const y = Math.random() < 0.55 ? layers[Math.floor(rand(0, 3))] + rand(-0.025, 0.025) : rand(B, top(x, D));
    o[0] = x; o[1] = Math.min(y, top(x, D)); o[2] = D;
  } else if (r < 0.78) {
    // side cut
    o[0] = W; o[2] = z; o[1] = rand(B, top(W, z));
  } else if (r < 0.86) {
    // fat cells on the front face
    const cx = (Math.round(x / 0.36) * 0.36), cy = -0.72;
    const a = rand(0, TAU);
    o[0] = cx + Math.cos(a) * 0.15; o[1] = cy + Math.sin(a) * 0.15; o[2] = D;
  } else {
    // hairs growing from the surface
    const k = Math.floor(rand(0, 9));
    const hx = -1.25 + (k % 5) * 0.62, hz = k < 5 ? -0.4 : 0.35;
    const t = Math.random();
    o[0] = hx + t * 0.18; o[2] = hz; o[1] = top(hx, hz) - 0.35 + t * 1.05;
  }
  // show the top, the front cut and one side
  const tilt = 0.5, yaw = -0.55;
  const y1 = o[1] * Math.cos(tilt) - o[2] * Math.sin(tilt);
  const z1 = o[1] * Math.sin(tilt) + o[2] * Math.cos(tilt);
  const x2 = o[0] * Math.cos(yaw) + z1 * Math.sin(yaw);
  const z2 = -o[0] * Math.sin(yaw) + z1 * Math.cos(yaw);
  o[0] = x2; o[1] = y1 + 0.1; o[2] = z2;
};

/** Pediatrics: a friendly teddy-bear head. */
const bearParts: [number, number, number, number, number][] = [
  // x, y, z, radius, weight
  [0, 0, 0, 1.1, 0.62],
  [-0.85, 0.85, -0.1, 0.4, 0.1],
  [0.85, 0.85, -0.1, 0.4, 0.1],
  [0, -0.32, 0.88, 0.45, 0.12],
  [-0.38, 0.22, 0.98, 0.09, 0.03],
  [0.38, 0.22, 0.98, 0.09, 0.03],
];
const bear: Gen = (i, o) => {
  let r = Math.random();
  let p = bearParts[0];
  for (const part of bearParts) {
    if (r < part[4]) { p = part; break; }
    r -= part[4];
  }
  dir(o);
  o[0] = p[0] + o[0] * p[3];
  o[1] = p[1] + o[1] * p[3];
  o[2] = p[2] + o[2] * p[3];
};

/** Cardiology: a puffy 3D heart, sampled inside the implicit curve (x² + y² − 1)³ − x²y³ = 0. */
const heart: Gen = (i, o) => {
  let x = 0, y = 0, f = 0;
  do {
    x = rand(-1.2, 1.2);
    y = rand(-1.05, 1.3);
    f = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;
  } while (f > 0);
  const depth = 0.62 * Math.pow(Math.min(1, -f), 0.3);
  o[0] = x * 1.25;
  o[1] = y * 1.25 - 0.1;
  o[2] = (Math.random() < 0.5 ? -1 : 1) * depth + rand(-0.02, 0.02);
};

const field: Gen = (i, o) => {
  o[0] = rand(-7, 7);
  o[1] = rand(-4.5, 4.5);
  o[2] = rand(-4, 1.5);
};

const generators: Record<ShapeName, Gen> = { sphere, dna, tooth, eye, brain, skin, bear, heart, field };

export function buildShape(name: ShapeName, count: number): Float32Array {
  const out = new Float32Array(count * 3);
  const p: [number, number, number] = [0, 0, 0];
  const gen = generators[name] ?? sphere;
  for (let i = 0; i < count; i++) {
    gen(i, p);
    out[i * 3] = p[0];
    out[i * 3 + 1] = p[1];
    out[i * 3 + 2] = p[2];
  }
  return out;
}

export const isShape = (v: string | undefined): v is ShapeName => !!v && v in generators;
