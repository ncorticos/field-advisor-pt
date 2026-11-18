// The "how to measure reverberation" figure (Fig 2): a quiet room cut open, the phone
// lying on a table in the middle, a balloon on a stand 1.5 m away over a floor tape that
// marks the 1–2 m band. The balloon bursts, the sound fills the room and comes back off
// the walls (image sources), and the phone's meter falls as the room goes quiet.
// Built with the Anatomy kit, like Fig 1 (src/how-phone).   node build.mjs --out DIR
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const SKILL = process.env.ANATOMY || "/Users/ncorticos/.claude/skills/anatomy";
const k = await import(SKILL + "/kit/iso-kit.mjs");
const G = await import(SKILL + "/kit/lathe.mjs");
const OUT = process.argv[process.argv.indexOf("--out") + 1];
mkdirSync(OUT, { recursive: true });

const W = 600, H = 440;
// World: 50 units = 1 m. The room is 4 m × 3 m, its walls cut at 2.6 m.
const RW = 200, RD = 150, TOP = 130, WT = 8;
const BASE = { x: -WT - 10, y: -WT - 10, w: RW + WT + 22, d: RD + WT + 22, r: 5 };
const PH = [80, 72, 38.2];                  // phone, on the table
const BAL = [155, 72, 76];                  // balloon centre: 1.5 m from the phone, at 1.5 m
const P = k.fitProjection(
  [...k.boxCorners(BASE, -16, -6), [-WT, -WT, TOP], [RW, -WT, TOP], [-WT, RD, TOP]],
  W, H, { pad: 16, azimuth: 60 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const seg = (a, b) => k.segment(a, b, P);
const pathD = (pts) => k.pathOf(pts.map(at), true);
const face = (pts, { shade = 2, top = false, tone = "mid", inner = "" } = {}) => {
  const d = pathD(pts);
  return `<g class="iso-solid"><path class="iso-fill" d="${d}"/><path class="${top ? "iso-top" : "iso-shade"}"${top ? "" : ` data-shade="${shade}"`} d="${d}"/>${inner}<path class="iso-line iso-edge" data-tone="${tone}" d="${d}"/></g>`;
};
const box = (x0, x1, y0, y1, z0, z1, style = {}, r = 0.4, bevel = 0) =>
  S(k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, z1 - z0, P, 2, bevel), { tone: "mid", ...style });

function basePlate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -16, 8, P)}"/>`];
  const feet = k.corners(BASE, 16).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of feet) {
    out.push(S(k.cylinder(x, y, 6.4, -16, 1.6, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.8, -14.4, 2.4, P, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, -12, 6, P, 6, 1.2), { tone: "mid" }));
  const screws = k.corners(BASE, 5).filter(([x, y]) => x > 0 || y > 0);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.8, -6, P, 12)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, -6])), { size: 0.45 }));
  return out.join("");
}

/* the two walls: side wall (x ≤ 0) with the door, back wall (y ≤ 0) with the window */
const WIN = { x0: 118, x1: 172, z0: 46, z1: 112 };
const DOOR = { y0: 96, y1: 138, z1: 104 };
function walls() {
  const out = [];
  // floor slab and boards
  out.push(S(k.slabOf({ x: -WT, y: -WT, w: RW + WT, d: RD + WT, r: 0 }, -6, 6, P, 2), { tone: "mid" }));
  let boards = "";
  for (let y = 10; y < RD; y += 10) boards += seg([0, y, 0], [RW, y, 0]);
  out.push(L(boards, { tone: "faint" }));
  // side wall, its door: a leaf with two panels, a frame, a handle
  out.push(box(-WT, 0, -WT, RD, 0, TOP, { crease: "faint" }));
  const dp = (y0, y1, z0, z1) => [[0, y0, z0], [0, y1, z0], [0, y1, z1], [0, y0, z1]];
  const panels = L(pathD(dp(DOOR.y0 + 6, DOOR.y1 - 6, 10, 48)) + pathD(dp(DOOR.y0 + 6, DOOR.y1 - 6, 56, DOOR.z1 - 8)), { tone: "lo" });
  out.push(face(dp(DOOR.y0, DOOR.y1, 0, DOOR.z1), { shade: 3, tone: "mid", inner: panels }));
  out.push(box(0, 1.4, DOOR.y0 - 3, DOOR.y0, 0, DOOR.z1 + 3, { tone: "mid", crease: "none" }, 0.2));
  out.push(box(0, 1.4, DOOR.y0 - 3, DOOR.y1 + 3, DOOR.z1, DOOR.z1 + 3, { tone: "mid", crease: "none" }, 0.2));
  out.push(box(0, 1.4, DOOR.y1, DOOR.y1 + 3, 0, DOOR.z1, { tone: "mid", crease: "none" }, 0.2));
  out.push(S(k.cylinder(1.6, DOOR.y1 - 5, 0.9, 51, 1.6, P, 10), { tone: "mid" }));
  out.push(box(1.4, 4.4, DOOR.y1 - 7.2, DOOR.y1 - 4.2, 52, 53, { tone: "hi", crease: "lo" }, 0.3));
  // back wall around the window opening
  out.push(box(-WT, WIN.x0, -WT, 0, 0, TOP, { crease: "faint" }));
  out.push(box(WIN.x0, WIN.x1, -WT, 0, 0, WIN.z0, { crease: "faint" }));
  out.push(box(WIN.x0, WIN.x1, -WT, 0, WIN.z1, TOP, { crease: "faint" }));
  out.push(box(WIN.x1, RW, -WT, 0, 0, TOP, { crease: "faint" }));
  // window: reveal, frame, two closed leaves with glass, sill
  out.push(face([[WIN.x0, -WT, WIN.z0], [WIN.x1, -WT, WIN.z0], [WIN.x1, -WT, WIN.z1], [WIN.x0, -WT, WIN.z1]], { shade: 1, tone: "lo" }));
  const leaf = (x0, x1) => {
    const g = [[x0 + 3, -4, WIN.z0 + 4], [x1 - 3, -4, WIN.z0 + 4], [x1 - 3, -4, WIN.z1 - 4], [x0 + 3, -4, WIN.z1 - 4]];
    return face([[x0, -4, WIN.z0], [x1, -4, WIN.z0], [x1, -4, WIN.z1], [x0, -4, WIN.z1]], { shade: 2, tone: "mid", inner: `<path class="fa-glass" d="${pathD(g)}"/>` + L(pathD(g), { tone: "mid" }) });
  };
  out.push(leaf(WIN.x0, (WIN.x0 + WIN.x1) / 2), leaf((WIN.x0 + WIN.x1) / 2, WIN.x1));
  out.push(box(WIN.x0, WIN.x1, -4, 0, WIN.z0 - 2, WIN.z0, { tone: "mid", crease: "none" }, 0.2));
  out.push(box(WIN.x0 - 3, WIN.x1 + 3, -WT, 4, WIN.z0 - 4.5, WIN.z0 - 2, { tone: "hi", crease: "lo" }, 0.4, 0.3));
  out.push(box(WIN.x0, WIN.x1, -4, 0, WIN.z1, WIN.z1 + 2, { tone: "mid", crease: "none" }, 0.2));
  out.push(D([at([(WIN.x0 + WIN.x1) / 2 - 2, 0, (WIN.z0 + WIN.z1) / 2]), at([(WIN.x0 + WIN.x1) / 2 + 2, 0, (WIN.z0 + WIN.z1) / 2])], { size: 0.55 }));
  // radiator under the window: a body with fins, on two brackets
  out.push(box(WIN.x0 + 4, WIN.x1 - 4, 1, 8, 8, 36, { tone: "mid", crease: "lo" }, 0.6, 0.4));
  let fins = ""; for (let x = WIN.x0 + 8; x < WIN.x1 - 6; x += 4) fins += seg([x, 8, 10], [x, 8, 34]);
  out.push(L(fins, { tone: "faint" }));
  out.push(S(k.cylinder(WIN.x1 - 6, 6, 1, 4, 4, P, 10), { tone: "mid", crease: "none" }));
  // skirting on both walls
  out.push(box(0, 1.4, 0, DOOR.y0 - 3, 0, 5, { tone: "lo", crease: "none" }, 0.2));
  out.push(box(0, WIN.x0 + 2, 0, 1.4, 0, 5, { tone: "lo", crease: "none" }, 0.2));
  out.push(box(WIN.x1 - 2, RW, 0, 1.4, 0, 5, { tone: "lo", crease: "none" }, 0.2));
  // wall tops (the cut): a faint plaster line
  out.push(L(k.lineOnTop([-WT + 3, -WT], [-WT + 3, RD], TOP, P) + k.lineOnTop([-WT, -WT + 3], [RW, -WT + 3], TOP, P), { tone: "faint" }));
  return out.join("");
}

/* a bookcase against the back wall, left of the window: shelves and books (they absorb) */
function bookcase() {
  const out = [], x0 = 14, x1 = 64, y1 = 14, z1 = 96;
  out.push(box(x0, x1, 0, y1, 0, z1, { tone: "mid", crease: "lo" }, 0.4, 0.3));
  let rows = "", spines = "";
  const shelves = [6, 28, 50, 72, 92];
  for (let i = 0; i < shelves.length - 1; i++) {
    const zA = shelves[i], zB = shelves[i + 1] - 2;
    rows += k.planOutline({ x: x0 + 2, y: y1 - 0.01, w: x1 - x0 - 4, d: 0.01, r: 0 }, zA, P, 1);
    let x = x0 + 3, s = 7 + i * 13;
    while (x < x1 - 6) {
      s = (s * 16807) % 2147483647; const w = 2.4 + (s % 30) / 10, h = (zB - zA) * (0.62 + ((s >> 5) % 30) / 100);
      spines += pathD([[x, y1, zA], [x + w, y1, zA], [x + w, y1, zA + h], [x, y1, zA + h]]);
      x += w + 0.6;
    }
  }
  out.push(L(rows, { tone: "lo" }), L(spines, { tone: "faint" }));
  return out.join("");
}

/* the table in the middle of the room: four legs, a top; the phone lies on it */
const TB = { x0: 56, x1: 104, y0: 52, y1: 92, z: 37 };
function table(part) {
  const out = [];
  const leg = (x, y) => box(x - 1.4, x + 1.4, y - 1.4, y + 1.4, 0, TB.z - 2, { tone: "mid", crease: "none" }, 0.3);
  if (part === "back") out.push(leg(TB.x0 + 3, TB.y0 + 3), leg(TB.x1 - 3, TB.y0 + 3), leg(TB.x0 + 3, TB.y1 - 3));
  else {
    out.push(leg(TB.x1 - 3, TB.y1 - 3));
    out.push(box(TB.x0, TB.x1, TB.y0, TB.y1, TB.z - 2, TB.z + 1, { tone: "hi", crease: "lo" }, 0.8, 0.4));
  }
  return out.join("");
}
function phone() {
  const out = [];
  const [x, y, z] = PH;
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: x - 7, y: y - 13, w: 14, d: 26, r: 2 }, z, 0.1, P)}" style="filter:blur(1.5px)"/>`);
  out.push(S(k.slabOf({ x: x - 6.5, y: y - 13, w: 13, d: 26, r: 2 }, z, 2.4, P, 4, 0.3), { tone: "hi", lit: true, crease: "lo" }));
  out.push(`<path class="fa-screen" d="${k.planOutline({ x: x - 5.4, y: y - 11.6, w: 10.8, d: 23.2, r: 1 }, z + 2.4, P, 3)}"/>`);
  for (let i = 0; i < 10; i++) {
    const yy = y + 7.4 - i * 2;
    out.push(`<path data-bar="${i}" class="fa-bar" data-band="${i < 5 ? "g" : i < 8 ? "a" : "r"}" d="${pathD([[x - 3.8, yy, z + 2.4], [x + 3.8, yy, z + 2.4], [x + 3.8, yy - 1.4, z + 2.4], [x - 3.8, yy - 1.4, z + 2.4]])}"/>`);
  }
  // the recording dot, at the top of the screen
  const rc = at([x, y + 10, z + 2.4]);
  out.push(`<circle data-rec class="fa-rec" cx="${rc[0].toFixed(1)}" cy="${rc[1].toFixed(1)}" r="1.5"/>`);
  return out.join("");
}

/* the floor tape from under the phone: a tick every 20 cm, a long one every metre, and the
   1–2 m band where the balloon goes */
function tape() {
  const out = [], y = 112, x0 = PH[0], x1 = PH[0] + 110;
  const strip = { x: x0 - 2, y, w: x1 - x0 + 4, d: 6, r: 0.6 };
  out.push(S(k.slabOf(strip, 0, 0.5, P, 2), { tone: "lo", crease: "none" }));
  out.push(`<path class="fa-band" d="${k.planOutline({ x: x0 + 50, y: y + 0.6, w: 50, d: 4.8, r: 0.3 }, 0.5, P, 1)}"/>`);
  const t = k.topTicks(x0, x1, 10, 5, y + 0.4, 0.5, [1.6, 3.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // the line from the tape's zero to the phone's foot, and from 1.5 m to the stand
  out.push(L(seg([x0, y, 0.5], [x0, TB.y1 - 3, 0]), { tone: "faint" }));
  return out.join("");
}

/* the balloon on its stand: a weighted foot, a pole, a clip at the knot */
function stand() {
  const out = [], [x, y] = BAL;
  out.push(S(k.cylinder(x, y, 7, 0, 1.4, P, 28), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 5, 1.4, 1.2, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 0.7, 2.6, BAL[2] - 15 - 2.6, P, 10), { tone: "mid", crease: "none" }));
  out.push(box(x - 1.6, x + 1.6, y - 1.2, y + 1.2, BAL[2] - 15, BAL[2] - 12.6, { tone: "mid", crease: "none" }, 0.3));
  return out.join("");
}
function balloon() {
  const [x, y, z] = BAL;
  const F = G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const knot = [[z - 12.6, 0], [z - 12.4, 0.9], [z - 11, 1.1], [z - 10, 0.7], [z - 9.4, 1.2]];
  const body = [[z - 9.4, 1.2, 1], [z - 8.2, 3.8, 1], [z - 6, 6.4, 1], [z - 2.5, 8, 1], [z + 1.5, 8.4, 1], [z + 5, 7.6, 1], [z + 7.6, 5.4, 1], [z + 9.2, 2.6, 1], [z + 9.8, 0]];
  return `<g class="fa-balloon" data-part="balloon">${S(G.lathe([...knot, ...body], F, P), { tone: "mid", crease: "none" })}</g>`;
}

const body = [
  basePlate(), walls(), bookcase(), tape(),
  `<g data-slot="far"></g>`, table("back"), stand(), table("front"),
  `<g data-part="phone">${phone()}</g>`,
  balloon(),
  `<g data-slot="shreds"></g>`,
];
// sound: drawn inside the room's outline only
const hull = k.pathOf([[0, RD, 0], [RW, RD, 0], [RW, 0, 0], [RW, 0, TOP], [0, 0, TOP], [0, RD, TOP]].map(at), true);
const svg = k.figureSvg({ width: W, height: H, label: "__LABEL__", body: [`<defs><clipPath id="fa-rt-room"><path d="${hull}"/></clipPath></defs>`, ...body, `<g data-slot="waves" clip-path="url(#fa-rt-room)"></g>`] });

const FA_CSS = `
.fa-balloon{--anatomy-face:#e5484d;--anatomy-top:#f07075;--anatomy-shade-0:#b42a2f;--anatomy-shade-1:#c7353a;--anatomy-shade-2:#d63e43;--anatomy-shade-3:#e0474c;--anatomy-lit-top:#f07075;--anatomy-lit-shade:#d63e43}
.fa-band{fill:#16A34A;fill-opacity:.32;stroke:none}
.fa-rec{fill:#3a3f46}.fa-rec[data-on]{fill:#ef5147}
.fa-wave{fill:none;stroke:#0D9488;stroke-width:1.8;vector-effect:non-scaling-stroke}
.fa-wave[data-kind="r"]{stroke-dasharray:3 3;stroke-width:1.5}
.fa-shred{fill:#e5484d;stroke:#a3262b;stroke-width:.4;vector-effect:non-scaling-stroke}
`;
const live = `
function mountRtFigure(root, say) {
  const P = ${JSON.stringify(P)}, BAL = ${JSON.stringify(BAL)}, RW = ${RW}, RD = ${RD}, TOP = ${TOP};
  const rad = Math.PI / 180, sa = Math.sin(P.azimuth * rad), ca = Math.cos(P.azimuth * rad), se = Math.sin((P.elevation ?? 30) * rad), ce = Math.cos((P.elevation ?? 30) * rad), K = P.scale * ${k.cameraOf({ scale: 1 }).k};
  const iso = (x, y, z) => [P.origin[0] + (x * sa - y * ca) * K, P.origin[1] + ((x * ca + y * sa) * se - z * ce) * K];
  const f = (n) => Math.round(n * 10) / 10;
  const svg = root.querySelector("svg"), q = (s) => svg.querySelector(s), NS = "http://www.w3.org/2000/svg";
  const bal = q('[data-part="balloon"]'), rec = q("[data-rec]"), bars = [...svg.querySelectorAll("[data-bar]")];
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  /* sound: the balloon and its images in the walls and the floor; each sphere's outline is a
     circle in this camera. Shown slowed down about 600 times. */
  const SRC = [[BAL[0], BAL[1], BAL[2], 0], [-BAL[0], BAL[1], BAL[2], 1], [BAL[0], -BAL[1], BAL[2], 1], [BAL[0], BAL[1], -BAL[2], 1], [-BAL[0], -BAL[1], BAL[2], 2]];
  const waveSlot = q('[data-slot="waves"]'), waves = [];
  for (const s of SRC) for (let j = 0; j < 4; j++) { const c = document.createElementNS(NS, "circle"); c.setAttribute("class", "fa-wave"); if (s[3]) c.setAttribute("data-kind", "r"); c.setAttribute("data-free", ""); waveSlot.appendChild(c); waves.push({ c, s, j }); }
  /* the shreds of rubber: ballistic, from the burst to the floor */
  const shredSlot = q('[data-slot="shreds"]'), shreds = [];
  for (let i = 0; i < 9; i++) { const p = document.createElementNS(NS, "path"); p.setAttribute("class", "fa-shred"); shredSlot.appendChild(p); const a = i * 2.39996, e = 0.35 + (i % 3) * 0.3; shreds.push({ p, v: [Math.cos(a) * Math.cos(e) * 46, Math.sin(a) * Math.cos(e) * 46, Math.sin(e) * 40 + 10], r: 1.2 + (i % 4) * 0.5, spin: i }); }
  const LOOP = 10, POP = 2.2, RT = 3.2, C = 48;   // C: drawn speed of sound, units per second
  function stateAt(t) {
    if (t < 0.9) return "quiet";
    if (t < POP) return "record";
    if (t < POP + 0.5) return "pop";
    if (t < POP + RT + 0.6) return "decay";
    return "result";
  }
  let shownBars = -1, lastStep = "";
  function draw(t) {
    const since = t - POP, popped = since >= 0;
    // balloon: sways, swells a hair, then is gone
    const sway = Math.sin(t * 1.7) * 0.6;
    if (!popped) { const o = iso(0, 0, 0), q2 = iso(sway, 0, 0), s = 1 + 0.06 * smooth(POP - 0.5, POP, t); const c = iso(BAL[0], BAL[1], BAL[2]);
      bal.setAttribute("transform", "translate(" + f(q2[0] - o[0] + c[0] * (1 - s)) + " " + f(q2[1] - o[1] + c[1] * (1 - s)) + ") scale(" + s.toFixed(3) + ")"); bal.setAttribute("opacity", "1"); }
    else bal.setAttribute("opacity", "0");
    // shreds
    shreds.forEach((s, i) => {
      if (!popped || since > 2.4) { s.p.setAttribute("d", ""); return; }
      const tt = Math.min(since, 2.4), x = BAL[0] + s.v[0] * tt * Math.exp(-tt * 1.4) / 1, y = BAL[1] + s.v[1] * tt * Math.exp(-tt * 1.4), z = Math.max(0.4, BAL[2] + s.v[2] * tt - 70 * tt * tt);
      const c = iso(x, y, z), a = s.spin + tt * 9, r = s.r * K;
      s.p.setAttribute("d", "M" + f(c[0] + Math.cos(a) * r) + " " + f(c[1] + Math.sin(a) * r * 0.6) + "L" + f(c[0] - Math.sin(a) * r * 0.7) + " " + f(c[1] + Math.cos(a) * r * 0.5) + "L" + f(c[0] - Math.cos(a) * r) + " " + f(c[1] - Math.sin(a) * r * 0.4) + "Z");
      s.p.setAttribute("opacity", (1 - smooth(1.8, 2.4, since)).toFixed(2));
    });
    // waves: three shells per source, spaced in time, fading with the room's decay
    waves.forEach(({ c, s, j }) => {
      const age = since - j * 0.42, dx = s[0] - BAL[0], dy = s[1] - BAL[1], dz = s[2] - BAL[2], lag = Math.hypot(dx, dy, dz) / C;
      if (!popped || age <= 0) { c.setAttribute("r", "0"); c.setAttribute("opacity", "0"); return; }
      const R = age * C, reach = Math.hypot(dx, dy, dz) / 2 * (s[3] === 2 ? 1.42 : 1), born = s[3] ? smooth(reach, reach + 10, R) : smooth(0, 0.15, age);
      const fade = born * Math.pow(10, -1.4 * age / RT) * (s[3] ? 0.8 : 1) * (1 - smooth(RT, RT + 0.6, age));
      const p = iso(s[0], s[1], s[2]);
      c.setAttribute("cx", f(p[0])); c.setAttribute("cy", f(p[1])); c.setAttribute("r", f(R * K)); c.setAttribute("opacity", Math.max(0, fade).toFixed(3));
    });
    // the meter: up at the burst, then down in a straight line in dB over RT
    let level = 0.12 + Math.sin(t * 7.3) * 0.03;
    if (popped) level = Math.max(level, 1 - 0.88 * Math.min(1, since / RT));
    const on = Math.round(Math.min(1, Math.max(0, level)) * 10);
    if (on !== shownBars) { shownBars = on; bars.forEach((b, i) => (i < on ? b.setAttribute("data-on", "") : b.removeAttribute("data-on"))); }
    const recording = t > 0.9 && t < POP + RT + 0.6;
    if (recording && Math.floor(t * 2) % 2 === 0) rec.setAttribute("data-on", ""); else rec.removeAttribute("data-on");
    const step = stateAt(t);
    if (step !== lastStep) { lastStep = step; say && say(step); }
  }
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let clock = 0, last = 0, frame = 0, visible = false;
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60; last = now;
    clock = (clock + dt) % LOOP; draw(clock);
    frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }, { rootMargin: "80px 0px" }).observe(svg);
  root.addEventListener("click", () => { clock = POP - 0.4; if (still.matches) { clock = POP + 0.9; draw(clock); } });
  if (still.matches) clock = POP + 0.9;
  draw(clock);
  return { seek(t) { clock = t; draw(t); } };
}
`;
writeFileSync(join(OUT, "figure.svg"), svg);
writeFileSync(join(OUT, "live.js"), live);
writeFileSync(join(OUT, "how.css"), FA_CSS);
const page = k.pageHtml({
  title: "How to measure reverberation", theme: "light", width: 820,
  body: k.plateHtml({ fig: "Fig 2", title: "Reverberação", hint: "", readout: "", caption: "Maquete: som mostrado ~600× mais lento", body: `<div class="iso-stage">${svg.replace("__LABEL__", "Maquete")}</div>` }) + `<style>.fa-glass{fill:#d9e8f3;stroke:none}.fa-screen{fill:#14171a;stroke:none}.fa-bar{fill:#3a3f46}.fa-bar[data-on][data-band="g"]{fill:#34c17b}.fa-bar[data-on][data-band="a"]{fill:#f0a92b}.fa-bar[data-on][data-band="r"]{fill:#ef5147}${FA_CSS}</style>`,
  script: `${live};window.API=mountRtFigure(document.querySelector(".iso-stage"),(s)=>{const r=document.querySelector("[data-readout]");if(r)r.textContent=s;});`,
});
writeFileSync(join(OUT, "test.html"), page);
console.log("svg", (svg.length / 1024).toFixed(0) + "KB");
