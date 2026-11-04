// The "how to place the phone" figure: an architect's cutaway model of a
// Pombaline sill window, cut on the window's axis. Built with the Anatomy kit;
// writes figure.svg + live.js + how.css next to --out, and a test page.
//   node build.mjs --out DIR
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const SKILL = process.env.ANATOMY || "/Users/ncorticos/.claude/skills/anatomy";
const k = await import(SKILL + "/kit/iso-kit.mjs");
const G = await import(SKILL + "/kit/lathe.mjs");
const OUT = process.argv[process.argv.indexOf("--out") + 1];
mkdirSync(OUT, { recursive: true });

const W = 600, H = 440;
// World: 50 units = 1 m (the ruler on the base is true). The phone and the car
// are out of scale, and the caption says so. x < 0 inside, x > 0 outside.
const STREET = -50, SILL = 45, HEAD = 122, TOP = 150;
const SILLOUT = 24, WX0 = -44, WY0 = -104, OY0 = -40, RX = -130;
const BOARD = SILL + 1, GLASS_X = -22;
const BASE = { x: -146, y: -120, w: 252, d: 132, r: 5 };
const P = k.fitProjection(
  [...k.boxCorners(BASE, STREET - 14, STREET), [RX - 8, WY0 - 8, TOP], [RX - 8, 0, TOP], [0, 0, TOP], [0, WY0, TOP], [WX0, WY0, TOP]],
  W, H, { pad: 14, azimuth: 60 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const seg = (a, b) => k.segment(a, b, P);
const pathD = (pts) => k.pathOf(pts.map(at), true);
/** One flat face in the kit's own tones. */
const face = (pts, { shade = 2, top = false, tone = "mid", inner = "", lit = false } = {}) => {
  const d = pathD(pts);
  return `<g class="iso-solid"${lit ? " data-lit" : ""}><path class="iso-fill" d="${d}"/><path class="${top ? "iso-top" : "iso-shade"}"${top ? "" : ` data-shade="${shade}"`} d="${d}"/>${inner}<path class="iso-line iso-edge" data-tone="${tone}" d="${d}"/></g>`;
};
const box = (x0, x1, y0, y1, z0, z1, style = {}, r = 0.4, bevel = 0) =>
  S(k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, z1 - z0, P, 2, bevel), { tone: "mid", ...style });
const closed = (pts) => pathD(pts);

/* rubble on a cut face: closed stones only, so no line ever stops on the face */
function rubble(x0, x1, z0, z1, y, seed) {
  let s = seed, out = "";
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const stepX = 11, stepZ = 9;
  for (let z = z0 + 2, row = 0; z + 5 < z1; z += stepZ, row++) {
    for (let x = x0 + 2 + (row % 2) * 4; x + 6 < x1; x += stepX) {
      const w = Math.min(x1 - 1.5 - x, 6 + rnd() * 3.5), h = Math.min(z1 - 1.5 - z, 4 + rnd() * 3);
      const j = () => (rnd() - 0.5) * 1.3;
      out += closed([[x + j(), y, z + j()], [x + w + j(), y, z + j()], [x + w, y, z + h + j()], [x + j(), y, z + h]]);
    }
  }
  return L(out, { tone: "lo" });
}

function basePlate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, STREET - 14, 8, P)}"/>`];
  const feet = k.corners(BASE, 18).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of feet) {
    out.push(S(k.cylinder(x, y, 7, STREET - 14, 1.6, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.2, STREET - 12.4, 4.4, P, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, STREET - 8, 8, P, 6, 1.2), { tone: "mid" }));
  const screws = k.corners(BASE, 5).filter(([x, y]) => y > -10 || x > 100);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.8, STREET, P, 12)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, STREET])), { size: 0.45 }));
  // the true ruler along the cut: a tick every 20 cm, a long one every metre
  const strip = { x: -136, y: 3, w: 232, d: 6, r: 0.8 };
  out.push(S(k.slabOf(strip, STREET, 0.6, P, 2), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 10, 5, strip.y + 0.6, STREET + 0.6, [1.8, 3.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3, STREET + 0.6]), at([strip.x + strip.w - 2, strip.y + 3, STREET + 0.6])], { size: 0.4 }));
  return out.join("");
}

function street() {
  const out = [];
  const road = { x: 23, y: -114, w: 80, d: 114, r: 1 };
  out.push(S(k.slabOf(road, STREET, 1, P, 2), { tone: "lo" }));
  // lane dashes and a manhole
  let dashes = "";
  for (let y = -108; y < -6; y += 24) dashes += k.planOutline({ x: 90, y, w: 2.4, d: 13, r: 0.4 }, STREET + 1, P, 2);
  out.push(L(dashes, { tone: "mid" }));
  out.push(L(k.ring(36, -9, 5, STREET + 1, P, 24) + k.ring(36, -9, 4, STREET + 1, P, 24), { tone: "lo" }));
  out.push(D([[0, 0], [90, 0], [180, 0], [270, 0]].map(([a]) => at([36 + Math.cos(a * Math.PI / 180) * 2, -9 + Math.sin(a * Math.PI / 180) * 2, STREET + 1])), { size: 0.35 }));
  // pavement in Lisbon calcada: closed stones, and a kerb
  const walk = { x: 0, y: -114, w: 20, d: 114, r: 0.6 };
  out.push(S(k.slabOf(walk, STREET, 4, P, 2, 0.4), { tone: "mid" }));
  let cobbles = "";
  for (let y = -111, row = 0; y < -3; y += 5.2, row++) for (let x = 3.4 + (row % 2) * 2.6; x < 15; x += 5.2) cobbles += closed([[x, y, STREET + 4], [x + 3.6, y, STREET + 4], [x + 3.6, y + 3.6, STREET + 4], [x, y + 3.6, STREET + 4]]);
  out.push(L(cobbles, { tone: "faint" }));
  out.push(S(k.slabOf({ x: 20, y: -114, w: 3, d: 114, r: 0.4 }, STREET, 5, P, 2, 0.3), { tone: "mid" }));
  return out.join("");
}
function bollards() {
  const out = [];
  for (const y of [-106]) {
    out.push(S(k.cylinder(16, y, 2.4, STREET + 4, 1.2, P, 16), { tone: "lo" }));
    out.push(S(k.cylinder(16, y, 1.6, STREET + 5.2, 15, P, 16), { tone: "mid", crease: "none" }));
    out.push(L(k.sideArc(16, y, 1.6, STREET + 16, P, 10), { tone: "lo" }));
  }
  return out.join("");
}

/* the student's room: back wall, side wall, floor on joists, and what is in it */
function room() {
  const out = [];
  const Y0 = WY0;
  out.push(box(RX - 8, WX0, Y0 - 8, Y0, STREET, TOP, { crease: "faint" }));
  out.push(box(RX - 8, RX, Y0 - 8, 0, STREET, TOP, { crease: "faint" }));
  const floorW = WX0 - RX;
  out.push(S(k.slabOf({ x: RX, y: Y0, w: floorW, d: -Y0, r: 0 }, STREET, -STREET, P, 2), { tone: "mid" }));
  let boards = "";
  for (let y = Y0 + 8; y < 0; y += 8) boards += seg([RX, y, 0], [WX0, y, 0]);
  out.push(L(boards, { tone: "faint" }));
  // cut through the floor: a boarded deck, joists, a plaster ceiling
  out.push(L(seg([RX, 0, -2], [WX0, 0, -2]) + seg([RX, 0, -13], [WX0, 0, -13]), { tone: "lo" }));
  let joists = "";
  for (let x = RX + 7; x < WX0 - 6; x += 16) joists += closed([[x, 0, -2], [x + 5, 0, -2], [x + 5, 0, -13], [x, 0, -13]]);
  out.push(L(joists, { tone: "mid" }));
  // skirting
  out.push(box(RX, RX + 1.6, Y0, 0, 0, 6, { tone: "lo", crease: "none" }, 0.2));
  out.push(box(RX + 1.6, WX0, Y0, Y0 + 1.6, 0, 6, { tone: "lo", crease: "none" }, 0.2));
  // a frame on the side wall (closed outlines on its face)
  const pic = (y0, y1, z0, z1) => [[RX, y0, z0], [RX, y1, z0], [RX, y1, z1], [RX, y0, z1]];
  out.push(face(pic(-70, -30, 62, 96), { shade: 3, tone: "mid", inner: L(closed(pic(-65.5, -34.5, 66.5, 91.5)), { tone: "lo" }) }));
  // the desk, by the window: where a student works
  const dz = 30, dx0 = -122, dx1 = -74, dy0 = -60, dy1 = -32;
  for (const [x, y] of [[dx0 + 2, dy0 + 2], [dx1 - 2, dy0 + 2], [dx0 + 2, dy1 - 2], [dx1 - 2, dy1 - 2]]) out.push(box(x - 1.3, x + 1.3, y - 1.3, y + 1.3, 0, dz - 2, { tone: "mid", crease: "none" }, 0.3));
  out.push(box(dx0, dx1, dy0, dy1, dz - 2, dz + 1, { tone: "hi", crease: "lo" }, 0.8, 0.4));
  // laptop: the base on the desk, the lid standing behind it
  const lapY = -50, lapX = -94;
  out.push(box(lapX - 11, lapX + 11, lapY, lapY + 13, dz + 1, dz + 2, { tone: "mid", crease: "none" }, 0.6));
  out.push(L(k.planOutline({ x: lapX - 5, y: lapY + 8, w: 10, d: 4, r: 0.5 }, dz + 2, P, 2), { tone: "lo" }));
  let keys = ""; for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) keys += k.planOutline({ x: lapX - 9.4 + c * 2.4, y: lapY + 1 + r * 2.2, w: 1.8, d: 1.6, r: 0.2 }, dz + 2, P, 2);
  out.push(L(keys, { tone: "faint" }));
  const lid = [[lapX - 11, lapY, dz + 2], [lapX + 11, lapY, dz + 2], [lapX + 11, lapY - 4, dz + 16], [lapX - 11, lapY - 4, dz + 16]];
  const lidIn = [[lapX - 9.8, lapY - 0.4, dz + 3.6], [lapX + 9.8, lapY - 0.4, dz + 3.6], [lapX + 9.8, lapY - 3.5, dz + 15], [lapX - 9.8, lapY - 3.5, dz + 15]];
  out.push(face(lid, { shade: 3, tone: "mid", inner: L(closed(lidIn), { tone: "lo" }) }));
  // books and a lamp
  out.push(box(dx0 + 3, dx0 + 15, dy0 + 5, dy0 + 15, dz + 1, dz + 3.4, { tone: "mid" }, 0.3));
  out.push(box(dx0 + 4, dx0 + 14, dy0 + 6, dy0 + 14, dz + 3.4, dz + 5.4, { tone: "hi", crease: "lo" }, 0.3));
  out.push(S(k.cylinder(dx1 - 6, dy0 + 6, 3.2, dz + 1, 1, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(dx1 - 6, dy0 + 6, 0.7, dz + 2, 14, P, 10), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(dx1 - 6, dy0 + 6, 3.8, dz + 16, 5, P, 18), { tone: "hi", crease: "lo" }));
  // the chair, on the cut side of the desk
  for (const [x, y] of [[-106, -28], [-90, -28], [-106, -12], [-90, -12]]) out.push(box(x - 1, x + 1, y - 1, y + 1, 0, 17, { tone: "mid", crease: "none" }, 0.2));
  out.push(box(-108, -88, -30, -10, 17, 19.4, { tone: "hi", crease: "lo" }, 1, 0.4));
  out.push(box(-108, -88, -11.6, -10, 19.4, 38, { tone: "mid" }, 0.3));
  return out.join("");
}

/* the far half of the opening: what stands behind the leaf */
function reveal() {
  const out = [];
  out.push(face([[WX0, OY0, SILL], [-20, OY0, SILL], [-20, OY0, HEAD], [WX0, OY0, HEAD]], { shade: 3, tone: "mid" }));
  out.push(face([[-20, OY0, SILL], [0, OY0, SILL], [0, OY0, HEAD], [-20, OY0, HEAD]], { shade: 2, tone: "mid" }));
  return out.join("");
}
/* the sills: timber inside, the reveal's stone floor */
function innerSill() {
  const out = [];
  out.push(face([[-20, OY0, BOARD], [0, OY0, BOARD], [0, 0, BOARD], [-20, 0, BOARD]], { top: true, tone: "mid" }));
  out.push(box(-54, -24, OY0, 0, BOARD - 3, BOARD, { tone: "hi", crease: "lo" }, 0.5, 0.4));
  out.push(L(k.lineOnTop([-54, -26], [-24, -26], BOARD, P) + k.lineOnTop([-54, -12], [-24, -12], BOARD, P), { tone: "faint" }));
  return out.join("");
}
/* the fixed frame: two jamb strips, the bottom rail */
function frame() {
  const out = [];
  out.push(box(-24, -20, OY0, OY0 + 3, BOARD, HEAD, { tone: "mid", crease: "faint" }, 0.2));
  out.push(box(-24, -20, OY0, 0, BOARD, BOARD + 3, { tone: "mid", crease: "faint" }, 0.2));
  return out.join("");
}
/* the near mullion the leaves close on: drawn after the leaf, cut by the section */
const mullion = () => box(-24, -20, -2.6, 0, BOARD + 3, HEAD, { tone: "mid", crease: "faint" }, 0.2);

/* the façade, one face with a notch; lintel and lower wall cut by the section */
function facade() {
  const out = [];
  let tiles = "";
  for (let z = -22; z < TOP - 8; z += 8) {
    if (z > BOARD && z < HEAD + 14) tiles += seg([0, WY0, z], [0, OY0 - 8, z]);
    else if (z > SILL - 5.5 && z <= BOARD) tiles += seg([0, WY0, z], [0, OY0 - 8, z]);
    else tiles += seg([0, WY0, z], [0, 0, z]);
  }
  for (let y = WY0 + 8; y < 0; y += 8) {
    if (y > OY0 - 8) tiles += seg([0, y, -24], [0, y, SILL - 5]) + seg([0, y, HEAD + 14], [0, y, TOP - 8]);
    else tiles += seg([0, y, -24], [0, y, TOP - 8]);
  }
  out.push(face([[0, WY0, STREET], [0, 0, STREET], [0, 0, SILL], [0, OY0, SILL], [0, OY0, HEAD], [0, 0, HEAD], [0, 0, TOP], [0, WY0, TOP]], { shade: 3, tone: "mid", inner: L(tiles, { tone: "faint" }) }));
  // the cut, in the section plane
  const cut = { shade: 0, tone: "hi" };
  out.push(face([[WX0, 0, STREET], [0, 0, STREET], [0, 0, SILL], [WX0, 0, SILL]], { ...cut, inner: rubble(WX0, 0, STREET, SILL, 0, 7) }));
  out.push(face([[WX0, 0, HEAD], [0, 0, HEAD], [0, 0, TOP], [WX0, 0, TOP]], { ...cut, inner: rubble(WX0, 0, HEAD, TOP, 0, 23) }));
  out.push(face([[WX0, WY0, TOP], [0, WY0, TOP], [0, 0, TOP], [WX0, 0, TOP]], { top: true, tone: "mid", inner: L(k.lineOnTop([WX0 + 5, WY0], [WX0 + 5, 0], TOP, P) + k.lineOnTop([-5, WY0], [-5, 0], TOP, P), { tone: "faint" }) }));
  return out.join("");
}

/* stone on the façade: socle, string course, surround, cornice, a downpipe */
function dressings() {
  const out = [];
  const LEN = -WY0;
  let joints = "";
  for (let y = WY0 + 20; y < 0; y += 22) joints += seg([3, y, STREET + 4], [3, y, -24]);
  out.push(S(k.slabOf({ x: 0, y: WY0, w: 3, d: LEN, r: 0 }, STREET + 4, -24 - STREET - 4, P, 2, 0.5), { tone: "mid", crease: "lo", inner: L(joints, { tone: "lo" }) }));
  out.push(S(k.slabOf({ x: 0, y: WY0, w: 2.4, d: LEN, r: 0 }, -5, 5, P, 2, 0.3), { tone: "mid", crease: "faint" }));
  // zinc downpipe with two clamps, on the far stretch of wall
  const py = -80;
  out.push(S(k.cylinder(3, py, 2, STREET + 4 + 22, TOP - 8 - (STREET + 26), P, 14), { tone: "mid", crease: "none" }));
  for (const z of [30, 90]) out.push(S(k.cylinder(3, py, 2.6, z, 2, P, 14), { tone: "mid" }));
  // this window's surround: far jamb, lintel, cornice, cut by the section
  out.push(box(0, 2.4, OY0 - 8, OY0, BOARD, HEAD, { tone: "mid" }, 0.2, 0.2));
  out.push(box(0, 2.4, OY0 - 8, 0, HEAD, HEAD + 10, { tone: "mid" }, 0.2, 0.3));
  out.push(box(0, 4, OY0 - 10, 0, HEAD + 10, HEAD + 13, { tone: "mid" }, 0.2, 0.3));
  // eaves cornice
  out.push(S(k.slabOf({ x: 0, y: WY0, w: 7, d: LEN, r: 0 }, TOP - 8, 8, P, 2, 0.6), { tone: "mid", crease: "lo" }));
  // this window's stone sill, proud of the wall: the outside reading rests here
  out.push(box(0, SILLOUT, OY0 - 8, 0, BOARD - 5, BOARD, { tone: "hi", crease: "lo" }, 0.4, 0.4));
  return out.join("");
}

/* a car, in side view: a bonnet, a cabin, a boot, glass, wheels and lights */
function car() {
  const x0 = 38, x1 = 74, fx0 = x0 + 3, fx1 = x1 - 3, g = STREET + 1, wz = g + 7, wr = 7;
  const z = (v) => g + v;       // heights above the road
  const y = (v) => v - 22;      // along the car, 0 at the front bumper, negative backwards
  const F = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x0 - 2, y: y(-80), w: x1 - x0 + 4, d: 82, r: 6 }, g, 0.1, P)}" style="filter:blur(3px)"/>`];
  const wheel = (wy, s0, s1) => S(G.disc(s0, s1, wr, G.frameOf([0, wy, wz], [1, 0, 0], [0, 1, 0], [0, 0, 1]), P), { tone: "hi", crease: "lo" });
  const WF = y(-16), WR = y(-62);
  out.push(wheel(WR, x0 + 1, x0 + 6), wheel(WF, x0 + 1, x0 + 6));
  const body = [[y(-80), z(7)], [y(-80), z(19)], [y(-77), z(23)], [y(-24), z(24)], [y(-7), z(20)], [y(0), z(15)], [y(0), z(7)]];
  const cabin = [[y(-71), z(23.4)], [y(-64), z(37)], [y(-36), z(37)], [y(-23), z(24)]];
  out.push(S(G.prismOf(F, body, x0, x1, P), { tone: "hi", crease: "lo" }));
  out.push(S(G.prismOf(F, cabin, fx0, fx1, P), { tone: "hi", crease: "lo" }));
  // glass on the cabin side and windscreen; door lines, handles, the sill
  const side = (pts) => pts.map(([a, b]) => [fx1, y(a), z(b)]);
  const glass = (pts) => `<path class="fa-glass" d="${pathD(pts)}"/>` + L(pathD(pts), { tone: "mid" });
  out.push(glass(side([[-67.6, 24], [-62.8, 35.6], [-51.5, 35.6], [-51.5, 24]])));
  out.push(glass(side([[-49.5, 24], [-49.5, 35.6], [-37, 35.6], [-26, 24]])));
  out.push(glass([[fx0 + 2, y(-36.4), z(36.2)], [fx1 - 2, y(-36.4), z(36.2)], [fx1 - 2, y(-24.4), z(24.6)], [fx0 + 2, y(-24.4), z(24.6)]]));
  const sideLine = (pts) => pts.map(([a, b]) => [x1, y(a), z(b)]);
  out.push(L(closed(sideLine([[-50.5, 8], [-50.5, 22.6], [-24, 22.6], [-24, 8]])) + closed(sideLine([[-74, 8], [-74, 22.6], [-50.5, 22.6], [-50.5, 8]])), { tone: "lo" }));
  out.push(L(closed(sideLine([[-34, 19], [-34, 20.6], [-29, 20.6], [-29, 19]])) + closed(sideLine([[-60, 19], [-60, 20.6], [-55, 20.6], [-55, 19]])), { tone: "mid" }));
  // wheel arches and the near wheels
  const arch = (cy) => { const pts = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * (i / 14); pts.push([x1 + 0.01, cy + Math.cos(a) * (wr + 1.6), wz + Math.sin(a) * (wr + 1.6)]); } return `<path class="fa-arch" d="${pathD(pts)}"/>`; };
  out.push(arch(WR), arch(WF));
  for (const wy of [WR, WF]) {
    const W2 = G.frameOf([0, wy, wz], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    out.push(S(G.disc(x1 - 5, x1 + 1, wr, W2, P), { tone: "hi", crease: "lo" }));
    out.push(L(G.circleOf(W2, x1 + 1, 4.2, P, 24), { tone: "mid" }));
    out.push(D([at([x1 + 1, wy, wz])], { size: 0.6 }));
    out.push(D([0, 1, 2, 3, 4].map((i) => { const a = i * 1.2566; return at([x1 + 1, wy + Math.cos(a) * 2.6, wz + Math.sin(a) * 2.6]); }), { size: 0.35 }));
  }
  // front: grille, plate, headlights, bumper, on the end face
  const front = (x, h) => [x, y(0), z(h)];
  const rect = (xa, xb, za, zb) => closed([front(xa, za), front(xb, za), front(xb, zb), front(xa, zb)]);
  out.push(S(k.slabOf({ x: x0 - 0.6, y: y(0), w: x1 - x0 + 1.2, d: 1.8, r: 0.8 }, z(6.4), 3, P, 2), { tone: "mid", crease: "faint" }));
  out.push(`<path class="fa-lamp" d="${rect(x0 + 2.2, x0 + 8.6, 11.8, 14.6)}"/><path class="fa-lamp" d="${rect(x1 - 8.6, x1 - 2.2, 11.8, 14.6)}"/>`);
  out.push(L(rect(x0 + 2.2, x0 + 8.6, 11.8, 14.6) + rect(x1 - 8.6, x1 - 2.2, 11.8, 14.6) + rect(x0 + 11, x1 - 11, 11.4, 14.8), { tone: "mid" }));
  // mirror
  out.push(box(x1 - 1, x1 + 1.6, y(-37), y(-34.4), z(25), z(27.6), { tone: "mid", crease: "none" }, 0.2));
  return out.join("");
}

function phone() {
  const out = [];
  out.push(S(k.slabOf({ x: -6.5, y: -13, w: 13, d: 26, r: 2 }, 0, 2.4, P, 4, 0.3), { tone: "hi", lit: true, crease: "lo" }));
  out.push(`<path class="fa-screen" d="${k.planOutline({ x: -5.4, y: -11.6, w: 10.8, d: 23.2, r: 1 }, 2.4, P, 3)}"/>`);
  // the level meter on the screen: ten bars, the one thing that reads
  for (let i = 0; i < 10; i++) {
    const y = 9.4 - i * 2;
    out.push(`<path data-bar="${i}" class="fa-bar" data-band="${i < 5 ? "g" : i < 8 ? "a" : "r"}" d="${closed([[-3.8, y, 2.4], [3.8, y, 2.4], [3.8, y - 1.4, 2.4], [-3.8, y - 1.4, 2.4]])}"/>`);
  }
  return out.join("");
}

const INN = [-39, -17, BOARD], OUTS = [12, -17, BOARD];
const LEAF = { hx: -24, hy: OY0 + 3, w: 34.4, z0: BOARD + 3, z1: HEAD - 2, t: 3 };
const body = [
  basePlate(), street(), `<g data-slot="room">${room()}</g>`, reveal(), `<g data-slot="leafA"></g>`, innerSill(), frame(), `<g data-slot="leafB"></g>`, mullion(), facade(), dressings(), bollards(), `<g data-slot="car">${car()}</g>`,
  `<g data-slot="rings"></g>`,
  `<g data-part="shadow"><path class="iso-halo" d="${k.haloOf({ x: -6.5, y: -13, w: 13, d: 26, r: 2 }, 0, 0.1, P)}" style="filter:blur(1.5px)"/></g>`,
  `<g data-part="phone">${phone()}</g>`,
];
const svg = k.figureSvg({ width: W, height: H, label: "__LABEL__", body });

const FA_CSS = `
.fa-glass{fill:#d9e8f3;stroke:none}
.fa-arch{fill:#3a3f46;stroke:none}
.fa-lamp{fill:#fff4c9;stroke:none}
.fa-screen{fill:#14171a;stroke:none}
.fa-bar{fill:#3a3f46;transition:none}
.fa-bar[data-on][data-band="g"]{fill:#34c17b}.fa-bar[data-on][data-band="a"]{fill:#f0a92b}.fa-bar[data-on][data-band="r"]{fill:#ef5147}
.fa-leaf-glass{fill:#bcd9ee;fill-opacity:.42;stroke:none}
.fa-leaf-wood{fill:var(--anatomy-face);stroke:none;fill-rule:evenodd}
.fa-leaf-edge{fill:var(--anatomy-shade-1);stroke:none}
.fa-ring{fill:none;stroke:#e5484d;stroke-width:1.5;stroke-linecap:round;vector-effect:non-scaling-stroke}
`;
const live = `
function mountHowFigure(root, say) {
  const P = ${JSON.stringify(P)}, L = ${JSON.stringify(LEAF)}, INN = ${JSON.stringify(INN)}, OUTS = ${JSON.stringify(OUTS)};
  const SRC = [56, -17, -30], GLASS_X = ${GLASS_X}, BOARD = ${BOARD}, HEAD = ${HEAD};
  const rad = Math.PI / 180, sa = Math.sin(P.azimuth * rad), ca = Math.cos(P.azimuth * rad), se = Math.sin((P.elevation ?? 30) * rad), ce = Math.cos((P.elevation ?? 30) * rad), K = P.scale * ${k.cameraOf({ scale: 1 }).k};
  const iso = (x, y, z) => [P.origin[0] + (x * sa - y * ca) * K, P.origin[1] + ((x * ca + y * sa) * se - z * ce) * K];
  const f = (n) => Math.round(n * 10) / 10;
  const d = (pts, close) => pts.map((q, i) => (i ? "L" : "M") + f(q[0]) + " " + f(q[1])).join("") + (close ? "Z" : "");
  const shift = (x, y, z) => { const q = iso(x, y, z), o = iso(0, 0, 0); return "translate(" + f(q[0] - o[0]) + " " + f(q[1] - o[1]) + ")"; };
  const svg = root.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const NS = "http://www.w3.org/2000/svg";
  const mk = (cls, tone) => { const e = document.createElementNS(NS, "path"); e.setAttribute("class", cls); if (tone) e.setAttribute("data-tone", tone); return e; };
  /* the leaf: rebuilt each frame from its hinge, since a turn about z is no screen transform */
  const leaf = document.createElementNS(NS, "g");
  const lEdge = mk("fa-leaf-edge"), lWood = mk("fa-leaf-wood"), lGlass = mk("fa-leaf-glass"), lLine = mk("iso-line", "hi"), lBar = mk("iso-line", "mid");
  [lEdge, lGlass, lWood, lBar, lLine].forEach((e) => leaf.appendChild(e));
  const slotA = q('[data-slot="leafA"]'), slotB = q('[data-slot="leafB"]');
  function drawLeaf(open) {
    const th = open * 90 * rad, dx = -Math.sin(th), dy = Math.cos(th), nx = Math.cos(th), ny = Math.sin(th);
    const P3 = (u, z, n) => iso(L.hx + dx * u + nx * n, L.hy + dy * u + ny * n, z);
    const view = nx * ca + ny * sa;            // which face of the leaf is seen
    const n = view >= 0 ? L.t : 0;
    const R = (u0, u1, z0, z1) => d([P3(u0, z0, n), P3(u1, z0, n), P3(u1, z1, n), P3(u0, z1, n)], true);
    const rail = 3.2, W = L.w, Z0 = L.z0, Z1 = L.z1, zm = [Z0 + (Z1 - Z0) / 3, Z0 + (Z1 - Z0) * 2 / 3];
    const panes = [[Z0 + rail, zm[0] - 0.7], [zm[0] + 0.7, zm[1] - 0.7], [zm[1] + 0.7, Z1 - rail]];
    const holes = panes.map(([a, b]) => R(rail, W - rail, a, b)).join("");
    lWood.setAttribute("d", R(0, W, Z0, Z1) + holes);
    lGlass.setAttribute("d", R(0, W, Z0, Z1));
    lLine.setAttribute("d", R(0, W, Z0, Z1));
    lBar.setAttribute("d", holes);
    // the free edge's thickness, and the top
    const n2 = view >= 0 ? 0 : L.t;
    const free = (Math.abs(dx * ca + dy * sa) > 0.02) ? (dx * ca + dy * sa > 0 ? W : 0) : W;
    lEdge.setAttribute("d", d([P3(free, Z0, n), P3(free, Z1, n), P3(free, Z1, n2), P3(free, Z0, n2)], true) + d([P3(0, Z1, n), P3(W, Z1, n), P3(W, Z1, n2), P3(0, Z1, n2)], true));
    const slot = open > 0.45 ? slotA : slotB;
    if (leaf.parentNode !== slot) slot.appendChild(leaf);
  }
  /* sound from the street, as arcs in the plane through the phone: they stop on the
     wall, cross a closed window weakened, and go through an open one whole */
  const ringSlot = q('[data-slot="rings"]');
  const RN = 7, rings = [];
  for (let i = 0; i < RN; i++) { const a = mk("fa-ring"), b = mk("fa-ring"); b.setAttribute("stroke-dasharray", "1.5 3"); a.setAttribute("data-free", ""); b.setAttribute("data-free", ""); ringSlot.append(a, b); rings.push([a, b]); }
  const AIM = Math.atan2(BOARD + 4 - SRC[2], OUTS[0] - 6 - SRC[0]), SPREAD = 26 * rad, RMAX = 176;
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  function drawRings(t, open) {
    rings.forEach(([a, b], i) => {
      const r = ((t * 46 + i * RMAX / RN) % RMAX) + 8;
      const fade = smooth(8, 26, r) * (1 - smooth(RMAX * 0.68, RMAX, r));
      const strong = [], weak = [];
      for (let s = 0; s <= 26; s++) {
        const an = AIM - SPREAD + (2 * SPREAD * s) / 26, x = SRC[0] + Math.cos(an) * r, z = SRC[2] + Math.sin(an) * r;
        const inGap = z > BOARD + 1 && z < HEAD - 8;
        let kind = 0;
        if (x >= 0.5) kind = 1;
        else if (inGap) kind = open > 0.5 ? (x > -110 ? 1 : 0) : (x > GLASS_X ? 1 : (x > -96 ? 2 : 0));
        (kind === 1 ? strong : kind === 2 ? weak : []).push(kind ? iso(x, SRC[1], z) : 0);
      }
      a.setAttribute("d", strong.length > 1 ? d(strong) : ""); a.setAttribute("opacity", (0.72 * fade).toFixed(3));
      b.setAttribute("d", weak.length > 1 ? d(weak) : ""); b.setAttribute("opacity", (0.42 * fade).toFixed(3));
    });
  }
  const phone = q('[data-part="phone"]'), shadow = q('[data-part="shadow"]'), bars = [...svg.querySelectorAll("[data-bar]")];
  const car = q('[data-slot="car"]');
  /* the one timeline: what the student does, in order */
  const LOOP = 16, ease = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2, clamp01 = (x) => Math.min(1, Math.max(0, x));
  const span = (t, a, b) => clamp01((t - a) / (b - a));
  function stateAt(t) {
    t = ((t % LOOP) + LOOP) % LOOP;
    let win = 0, pos = INN, alpha = 1, step = "in";
    if (t < 1.7) { const e = ease(span(t, 0.1, 1.5)); pos = [INN[0], INN[1], INN[2] + 44 * (1 - e)]; alpha = smooth(0.05, 0.6, t); step = "place"; }
    else if (t < 6.2) { step = "in"; }
    else if (t < 7.6) { win = ease(span(t, 6.2, 7.6)); step = "open"; }
    else if (t < 9.9) {
      win = 1; step = "move";
      const u = span(t, 7.7, 9.8), up = ease(clamp01(u / 0.3)), ac = ease(clamp01((u - 0.2) / 0.6)), dn = ease(clamp01((u - 0.72) / 0.28));
      pos = [INN[0] + (OUTS[0] - INN[0]) * ac, INN[1], INN[2] + 24 * up - 24 * dn];
    } else if (t < 14.4) { win = 1; pos = OUTS; step = "out"; }
    else { win = 1 - ease(span(t, 14.5, 15.9)); pos = [OUTS[0], OUTS[1], OUTS[2] + 42 * ease(span(t, 14.4, 15.5))]; alpha = 1 - smooth(14.5, 15.4, t); step = "lift"; }
    const onSill = pos[2] - BOARD < 0.05;
    const level = pos[0] > 0 ? 0.86 : win > 0.5 ? 0.6 : 0.26;
    return { win, pos, alpha, step, level, onSill, side: pos[0] > 0 || step === "open" || step === "move" ? "out" : "in" };
  }
  let lastSide = "", meter = 0.2, shownBars = -1;
  function draw(t, dt) {
    const s = stateAt(t);
    drawLeaf(s.win); drawRings(t, s.win);
    phone.setAttribute("transform", shift(s.pos[0], s.pos[1], s.pos[2]));
    phone.setAttribute("opacity", s.alpha.toFixed(3));
    shadow.setAttribute("transform", shift(s.pos[0], s.pos[1], BOARD));
    const over = s.pos[0] < -28 || s.pos[0] > 6;      // only a sill can take the shadow
    shadow.setAttribute("opacity", (over ? s.alpha * (1 - smooth(0, 34, s.pos[2] - BOARD)) * 0.7 : 0).toFixed(3));
    meter += (s.level + Math.sin(t * 7.3) * 0.05 + Math.sin(t * 13.1) * 0.04 - meter) * (1 - Math.exp(-(dt || 0.016) / 0.16));
    const on = Math.round(clamp01(meter) * 10);
    if (on !== shownBars) { shownBars = on; bars.forEach((b, i) => { if (i < on) b.setAttribute("data-on", ""); else b.removeAttribute("data-on"); }); }
    car.setAttribute("transform", "translate(0 " + (Math.sin(t * 34) * 0.14).toFixed(2) + ")");
    if (s.step !== lastSide) { lastSide = s.step; say && say(s.step, s); }
  }
  /* idle tour; Dentro / Fora run forward to their moment and hold there for a while */
  const HOLD = { in: 3.6, out: 12 }, still = matchMedia("(prefers-reduced-motion: reduce)");
  let clock = 0, target = null, frame = 0, last = 0, visible = false, resume = 0, ringT = 0;
  const atHold = () => target !== null && Math.abs(((clock - target) % LOOP + LOOP) % LOOP) < 0.04;
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60; last = now;
    ringT += dt;
    if (target === null) clock += dt;
    else if (!atHold()) { const gap = ((target - clock) % LOOP + LOOP) % LOOP; clock += Math.min(gap, dt * (gap > 6 ? 3.2 : 1.8)); }
    drawAt(dt);
    frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
  }
  function drawAt(dt) {
    const s = stateAt(clock);
    draw(clock, dt);
    if (ringT) drawRings(ringT, s.win);
  }
  const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
  const api = {
    show(side, hold = 9000) {
      target = HOLD[side]; clearTimeout(resume);
      if (still.matches) { clock = target; ringT = 1.2; drawAt(0.5); return; }
      if (hold) resume = setTimeout(() => { target = null; run(); }, hold);
      run();
    },
    stateAt, redraw() { lastSide = ""; drawAt(0.016); },
    seek(t, r) { target = t; clock = t; ringT = r ?? t; drawAt(1); },
  };
  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }, { rootMargin: "80px 0px" }).observe(svg);
  if (still.matches) { clock = HOLD.in; ringT = 1.2; }
  drawAt(0.5);
  return api;
}
`;
writeFileSync(join(OUT, "figure.svg"), svg);
writeFileSync(join(OUT, "live.js"), live);
writeFileSync(join(OUT, "how.css"), FA_CSS);
const page = k.pageHtml({
  title: "How to place the phone", theme: "light", width: 820,
  body: k.plateHtml({ fig: "Fig 1", title: "Dentro e fora", hint: "", readout: "", caption: "Maquete sem escala", body: `<div class="iso-stage">${svg.replace("__LABEL__", "Maquete")}</div>` }) + `<style>${FA_CSS}</style>`,
  script: `${live};window.API=mountHowFigure(document.querySelector(".iso-stage"),(s)=>{const r=document.querySelector("[data-readout]");if(r)r.textContent=s;});`,
});
writeFileSync(join(OUT, "test.html"), page);
console.log("svg", (svg.length / 1024).toFixed(0) + "KB", "live", (live.length / 1024).toFixed(0) + "KB");
