// The "how to place the phone" figure: an architect's cutaway model of a
// Pombaline sill window, cut on the window's axis. Built with the Anatomy kit;
// writes figure.svg + live.js + how.css next to --out, and a test page.
//   node build.mjs --out DIR
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const SKILL = process.env.ANATOMY || "/Users/ncorticos/.claude/skills/anatomy";
const k = await import(SKILL + "/kit/iso-kit.mjs");
const G = await import(SKILL + "/kit/lathe.mjs");
const { glScript } = await import(SKILL + "/scripts/inline-kit.mjs");
const { glCamera } = await import(SKILL + "/kit/gl.mjs");
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
  out.push(face(lid, { shade: 3, tone: "mid", inner: `<path class="fa-lcd" d="${closed(lidIn)}"/>` + L(closed(lidIn), { tone: "lo" }) }));
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

/* the roller shutter (estore): its box under the lintel, outside the glass, and
   two guide rails down the reveal; the slats are drawn live, from how far down it is */
const SH = { x0: -11, x1: -3, y0: OY0, y1: 0, top: HEAD - 8 };
function shutterBox() {
  const out = [];
  out.push(box(SH.x0 - 1, SH.x1, SH.y0, SH.y1, SH.top, HEAD, { tone: "mid", crease: "lo" }, 0.3, 0.3));
  out.push(L(k.lineOnTop([SH.x0 + 1, SH.y0 + 2], [SH.x0 + 1, SH.y1 - 1], SH.top, P), { tone: "faint" }));
  // the far guide, on the reveal face; the near one is cut by the section
  out.push(box(-8.6, -5.4, SH.y0, SH.y0 + 1.6, BOARD, SH.top, { tone: "mid", crease: "none" }, 0.2));
  out.push(box(-8.6, -5.4, -1.6, 0, BOARD, SH.top, { tone: "mid", crease: "none" }, 0.2));
  return out.join("");
}

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


/* the street lantern on its wall bracket, between the window and the downpipe: a Lisbon
   "candeeiro de braço". Its light is the shader's; the glass is drawn here. */
const LANT = { x0: 12.6, x1: 19.4, y0: -65.4, y1: -58.6, z0: 113, z1: 124, lamp: [16, -62, 118] };
function lantern() {
  const out = [], c = LANT, mx = (c.x0 + c.x1) / 2, my = (c.y0 + c.y1) / 2;
  out.push(box(0, 1.4, my - 3.4, my + 3.4, 121, 136, { tone: "mid", crease: "lo" }, 0.3, 0.3));          // wall plate
  out.push(D([at([1.4, my - 2, 123.4]), at([1.4, my + 2, 123.4]), at([1.4, my - 2, 133.6]), at([1.4, my + 2, 133.6])], { size: 0.4 }));
  out.push(L(seg([1.4, my, 124.6], [9.6, my, 131]), { tone: "mid" }));                                    // brace, plate to arm
  out.push(box(1.4, mx + 1, my - 0.7, my + 0.7, 131, 132.4, { tone: "mid", crease: "none" }, 0.2));        // arm
  out.push(S(k.cylinder(mx, my, 0.55, 127.6, 3.4, P, 10), { tone: "mid", crease: "none" }));              // hanger
  out.push(S(k.cylinder(mx, my, 1.1, 109.2, 1.8, P, 12), { tone: "mid" }));                              // drop finial
  out.push(box(c.x0 - 0.4, c.x1 + 0.4, c.y0 - 0.4, c.y1 + 0.4, 111, c.z0, { tone: "mid", crease: "lo" }, 0.3, 0.3)); // bottom
  out.push(box(c.x0, c.x0 + 0.9, c.y0, c.y0 + 0.9, c.z0, c.z1, { tone: "mid", crease: "none" }, 0.1)); // far post
  const pane = (pts) => `<path class="fa-lantern-glass" d="${pathD(pts)}"/>` + L(pathD(pts), { tone: "mid" });
  out.push(pane([[c.x1, c.y0, c.z0], [c.x1, c.y1, c.z0], [c.x1, c.y1, c.z1], [c.x1, c.y0, c.z1]]));
  out.push(pane([[c.x0, c.y1, c.z0], [c.x1, c.y1, c.z0], [c.x1, c.y1, c.z1], [c.x0, c.y1, c.z1]]));
  for (const [x, y] of [[c.x1 - 0.9, c.y0], [c.x0, c.y1 - 0.9], [c.x1 - 0.9, c.y1 - 0.9]]) out.push(box(x, x + 0.9, y, y + 0.9, c.z0, c.z1, { tone: "mid", crease: "none" }, 0.1));
  out.push(box(c.x0 - 1.6, c.x1 + 1.6, c.y0 - 1.6, c.y1 + 1.6, c.z1, c.z1 + 1.6, { tone: "mid", crease: "lo" }, 0.4, 0.4)); // brim
  out.push(box(c.x0 + 0.8, c.x1 - 0.8, c.y0 + 0.8, c.y1 - 0.8, c.z1 + 1.6, c.z1 + 3.8, { tone: "mid", crease: "lo" }, 0.4, 0.5)); // roof
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
const nightFilter = (id) => `<defs><filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter></defs>`;
const body = [
  nightFilter("fa-night"),
  basePlate(), street(), `<g data-slot="room">${room()}</g>`, reveal(), `<g data-slot="leafA"></g>`, innerSill(), frame(), `<g data-slot="leafB"></g>`, mullion(), `<g data-slot="shade"></g>`, shutterBox(), facade(), dressings(), lantern(), bollards(), `<g data-slot="car">${car()}</g>`,
];
const frontBody = [
  nightFilter("fa-night-front"),
  `<g data-slot="rings"></g>`,
  `<g data-part="shadow"><path class="iso-halo" d="${k.haloOf({ x: -6.5, y: -13, w: 13, d: 26, r: 2 }, 0, 0.1, P)}" style="filter:blur(1.5px)"/></g>`,
  `<g data-part="phone">${phone()}</g>`,
];
const back = k.figureSvg({ width: W, height: H, label: "__LABEL__", body }).replace('class="iso-svg"', 'class="iso-svg fa-back"');
const front = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg fa-front" viewBox="0 0 ${W} ${H}" aria-hidden="true">${frontBody.join("")}</svg>`;
const svg = `<div class="fa-fig">${back}<canvas class="fa-gl" aria-hidden="true"></canvas>${front}</div>`;

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
.fa-slats{fill:#a9b1bb;stroke:none}
.fa-slat-line{fill:none;stroke:#59626c;stroke-width:.6;vector-effect:non-scaling-stroke}
.fa-fig{position:relative}
.fa-fig>.fa-gl,.fa-fig>.fa-front{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
.fa-gl{mix-blend-mode:color-dodge}
.fa-lantern-glass{fill:color-mix(in srgb,#ffe7b0 calc(var(--fa-lit,0)*100%),#e8edf1);stroke:none}
.fa-lcd{fill:color-mix(in srgb,#cfe0ff calc(var(--fa-lcd,0)*100%),transparent);stroke:none}
.fa-slat-edge{fill:none;stroke:var(--anatomy-ink,#1d2329);stroke-width:1;stroke-linejoin:round;vector-effect:non-scaling-stroke}
`;

/* ---------------- night: the lamps, as a WebGL layer ----------------
   The SVG darkens by a colour matrix (the moonless ambient). Over it the canvas is
   colour-dodged, so it multiplies what is drawn by (1 + gain): a lit wall brightens and
   warms while its lines stay lines, and the paper round the model stays paper.
   Where a pixel lands is found by casting its ray into the same boxes the SVG draws. */
const B = (a, b) => ({ a, b });
const SC = {
  // the room
  floor: B([RX, WY0, STREET], [WX0, 0, 0]), back: B([RX - 8, WY0 - 8, STREET], [WX0, WY0, TOP]), side: B([RX - 8, WY0 - 8, STREET], [RX, 0, TOP]),
  desk: B([-122, -60, 28], [-74, -32, 31]), seat: B([-108, -30, 17], [-88, -10, 19.4]), chairBack: B([-108, -11.6, 19.4], [-88, -10, 38]),
  laptop: B([-105, -50, 31], [-83, -37, 32]), books: B([-119, -55, 31], [-107, -45, 35.4]),
  // the wall and its window
  wallLow: B([WX0, WY0, STREET], [0, 0, SILL]), pier: B([WX0, WY0, SILL], [0, OY0, HEAD]), wallHigh: B([WX0, WY0, HEAD], [0, 0, TOP]),
  sillIn: B([-54, OY0, BOARD - 3], [0, 0, BOARD]), sillOut: B([0, OY0 - 8, BOARD - 5], [SILLOUT, 0, BOARD]),
  shutter: B([SH.x0 - 1, SH.y0, SH.top], [SH.x1, SH.y1, HEAD]), socle: B([0, WY0, STREET + 4], [3, 0, -24]),
  surround: B([0, OY0 - 10, HEAD], [4, 0, HEAD + 13]), eaves: B([0, WY0, TOP - 8], [7, 0, TOP]),
  // the street
  base: B([BASE.x, BASE.y, STREET - 14], [BASE.x + BASE.w, BASE.y + BASE.d, STREET]), walk: B([0, -114, STREET], [20, 0, STREET + 4]),
  kerb: B([20, -114, STREET], [23, 0, STREET + 5]), road: B([23, -114, STREET], [103, 0, STREET + 1]),
  // the lantern itself, so its cap and foot stay dark
  lanBody: B([LANT.x0, LANT.y0, LANT.z0], [LANT.x1, LANT.y1, LANT.z1]), lanBrim: B([LANT.x0 - 1.6, LANT.y0 - 1.6, LANT.z1], [LANT.x1 + 1.6, LANT.y1 + 1.6, LANT.z1 + 3.8]),
  lanFoot: B([LANT.x0 - 0.4, LANT.y0 - 0.4, 111], [LANT.x1 + 0.4, LANT.y1 + 0.4, LANT.z0]),
};
const WALL = ["wallLow", "pier", "wallHigh", "sillOut", "shutter", "surround"];
const CAST = { desk: ["desk", "seat", "chairBack", "laptop", "books", ...WALL], lant: [...WALL, "eaves"] };
/* prisms along x, from the same (y, z) profiles the SVG draws: the car's body and cabin, the laptop's lid */
const CG = STREET + 1, cy = (v) => v - 22;
const PRISMS = [
  { x: [38, 74], pts: [[-80, 7], [-80, 19], [-77, 23], [-24, 24], [-7, 20], [0, 15], [0, 7]].map(([a, b]) => [cy(a), CG + b]), cast: true },
  { x: [41, 71], pts: [[-71, 23.4], [-64, 37], [-36, 37], [-23, 24]].map(([a, b]) => [cy(a), CG + b]), cast: true },
  { x: [-105, -83], pts: [[-50, 32], [-49.4, 32], [-53.4, 46], [-54, 46]], cast: false },
];
function prismGlsl(pr, i, shadow) {
  const n = pr.pts.length, c = pr.pts.reduce((a, q) => [a[0] + q[0] / n, a[1] + q[1] / n], [0, 0]);
  let code = `{float te=-1e9,tx=1e9;vec3 nn=vec3(0.);float t1=(${pr.x[0].toFixed(2)}-ro.x)*ird.x,t2=(${pr.x[1].toFixed(2)}-ro.x)*ird.x;if(min(t1,t2)>te){te=min(t1,t2);nn=vec3(-sign(ird.x),0.,0.);}tx=min(tx,max(t1,t2));`;
  for (let k2 = 0; k2 < n; k2++) {
    const a = pr.pts[k2], b = pr.pts[(k2 + 1) % n];
    let ny = b[1] - a[1], nz = -(b[0] - a[0]);
    const L2 = Math.hypot(ny, nz); ny /= L2; nz /= L2;
    if ((c[0] - a[0]) * ny + (c[1] - a[1]) * nz > 0) { ny = -ny; nz = -nz; }
    const cc = a[0] * ny + a[1] * nz;
    code += `{vec3 m=vec3(0.,${ny.toFixed(4)},${nz.toFixed(4)});float dn=dot(m,rd),d0=${cc.toFixed(3)}-dot(m,ro);if(abs(dn)<1e-6){if(d0<0.)tx=-1e9;}else{float t=d0/dn;if(dn<0.){if(t>te){te=t;nn=m;}}else tx=min(tx,t);}}`;
  }
  return code + (shadow ? `if(te<tx&&tx>.002&&te<.998)o=1.;}` : `if(te<tx&&te>0.&&te<T){T=te;N=nn;}}`);
}
const v3 = (q) => `vec3(${q.map((n) => (+n).toFixed(2)).join(",")})`;
const LCD = { o: [-103.8, -50.4, 34.6], u: [19.6, 0, 0], v: [0, -3.1, 11.4] };
const HEAD_LAMPS = [[43.4, -22, STREET + 12.8], [66.6, -22, STREET + 12.8]];
const FRAG = `
uniform vec4 uLamp;   // desk lamp, street lantern, headlights, laptop screen: 0..1 each
float T; vec3 N;
void bx(vec3 ro,vec3 ird,vec3 a,vec3 b){vec3 t1=(a-ro)*ird,t2=(b-ro)*ird,tn=min(t1,t2),tf=max(t1,t2);float te=max(max(tn.x,tn.y),tn.z),tx=min(min(tf.x,tf.y),tf.z);
  if(te<tx&&te>0.&&te<T){T=te;N=te==tn.x?vec3(-sign(ird.x),0.,0.):(te==tn.y?vec3(0.,-sign(ird.y),0.):vec3(0.,0.,-sign(ird.z)));}}
float sh(vec3 ro,vec3 ird,vec3 a,vec3 b){vec3 t1=(a-ro)*ird,t2=(b-ro)*ird,tn=min(t1,t2),tf=max(t1,t2);float te=max(max(tn.x,tn.y),tn.z),tx=min(min(tf.x,tf.y),tf.z);return te<tx&&tx>.002&&te<.998?1.:0.;}
void scene(vec3 ro,vec3 ird){vec3 rd=1./ird;${Object.values(SC).map((b) => `bx(ro,ird,${v3(b.a)},${v3(b.b)});`).join("")}${PRISMS.map((q, i) => prismGlsl(q, i, false)).join("")}}
float occDesk(vec3 ro,vec3 ird){float o=0.;${CAST.desk.map((n) => `o=max(o,sh(ro,ird,${v3(SC[n].a)},${v3(SC[n].b)}));`).join("")}return o;}
float occLant(vec3 ro,vec3 ird){float o=0.;vec3 rd=1./ird;${CAST.lant.map((n) => `o=max(o,sh(ro,ird,${v3(SC[n].a)},${v3(SC[n].b)}));`).join("")}${PRISMS.filter((q) => q.cast).map((q, i) => prismGlsl(q, i, true)).join("")}return o;}
const vec3 LD=vec3(-80.,-54.,44.5);
const vec3 LL=${v3(LANT.lamp)};
const vec3 C_DESK=vec3(1.,.6,.26);
const vec3 C_LANT=vec3(1.,.58,.22);
const vec3 C_HEAD=vec3(.9,.95,1.);
const vec3 C_LCD=vec3(.55,.74,1.);
vec3 safeInv(vec3 d){return 1./(d+sign(d)*1e-4+vec3(1e-6));}
float pl(vec3 p,vec3 n,vec3 L,float r0){vec3 d=L-p;float q=dot(d,d);return max(dot(n,d)*inversesqrt(q),0.)/(1.+q/(r0*r0));}
float visDesk(vec3 p,float h){float v=0.;for(int i=0;i<8;i++){float a=6.2832*(float(i)+h)/8.,r=mix(.6,2.2,fract(float(i)*.618+h));v+=1.-occDesk(p,safeInv(LD+vec3(cos(a),sin(a),0.)*r-p));}return v*.125;}
float visLant(vec3 p,float h){float v=0.;for(int i=0;i<8;i++){float a=6.2832*(float(i)+h)/8.,r=mix(.6,2.6,fract(float(i)*.618+h));v+=1.-occLant(p,safeInv(LL+vec3(cos(a)*r,sin(a)*r,0.)-p));}return v*.125;}
/* a rectangle on a plane, seen along the ray: soft by a pixel, and only where nothing nearer hides it */
float quad(vec3 ro,vec3 rd,vec3 o,vec3 u,vec3 v,float inset,float px,out float t,out vec2 uv){vec3 n=cross(u,v);t=dot(o-ro,n)/dot(rd,n);vec3 q=ro+rd*t-o;
  float lu=length(u),lv=length(v);uv=vec2(dot(q,u)/lu,dot(q,v)/lv);return window(uv.x,inset,lu-inset,.7*px)*window(uv.y,inset,lv-inset,.7*px);}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec3 V=towardViewer(),ro=rayOf(vb)+900.*V,rd=-V,ird=1./rd;
  float px=pixelOf(),h=hash12(gl_FragCoord.xy);
  T=1e5;N=vec3(0.);scene(ro,ird);
  vec3 g=vec3(0.);
  if(T<1e4){
    vec3 p=ro+rd*T,n=N,pe=p+n*.05;
    if(uLamp.x>.001){float f=pl(p,n,LD,24.);vec3 dir=normalize(p-LD);f*=mix(1.,.08,smoothstep(-.15,.45,dir.z));if(f>.002)f*=visDesk(pe,h);g+=uLamp.x*2.1*f*C_DESK;}
    if(uLamp.y>.001){float f=pl(p,n,LL,110.);if(f>.002)f*=visLant(pe,h);g+=uLamp.y*2.3*f*C_LANT;}
    if(uLamp.z>.001){${HEAD_LAMPS.map((q) => `{vec3 d=p-${v3(q)};float c=dot(normalize(d),normalize(vec3(0.,1.,-.16)));g+=uLamp.z*1.5*pl(p,n,${v3(q)},34.)*smoothstep(.8,.96,c)*C_HEAD;}`).join("")}}
    if(uLamp.w>.001)g+=uLamp.w*.7*pl(p,n,vec3(-94.,-46.,40.),9.)*C_LCD;
  }
  float tq;vec2 uv;
  // the lantern's two glass faces
  float e=quad(ro,rd,vec3(${LANT.x1},${LANT.y0},${LANT.z0}),vec3(0.,${(LANT.y1 - LANT.y0).toFixed(2)},0.),vec3(0.,0.,${(LANT.z1 - LANT.z0).toFixed(2)}),.9,px,tq,uv)*step(tq,T+.3);
  e+=quad(ro,rd,vec3(${LANT.x0},${LANT.y1},${LANT.z0}),vec3(${(LANT.x1 - LANT.x0).toFixed(2)},0.,0.),vec3(0.,0.,${(LANT.z1 - LANT.z0).toFixed(2)}),.9,px,tq,uv)*step(tq,T+.3);
  g+=uLamp.y*e*vec3(4.2,2.5,1.05);
  // the desk lamp's shade, fabric lit from inside (a cylinder r 3.8, z 46–51)
  {vec2 o=ro.xy-vec2(-80.,-54.),d=rd.xy;float a=dot(d,d),b=dot(o,d),c=dot(o,o)-14.44,D=b*b-a*c;
   if(D>0.){float t=(-b-sqrt(D))/a;float z=ro.z+rd.z*t;float rim=smoothstep(0.,.9*px*a,sqrt(D)/sqrt(a)*.26);
     g+=uLamp.x*rim*window(z,46.,51.,.7*px)*step(t,T)*mix(1.6,.9,smoothstep(46.,51.,z))*vec3(2.4,1.35,.5);}}
  // the laptop's screen
  float s=quad(ro,rd,${v3(LCD.o)},${v3(LCD.u)},${v3(LCD.v)},.5,px,tq,uv)*step(tq,T+.3);
  g+=uLamp.w*s*mix(1.1,.75,uv.y/11.8)*vec3(.55,.8,1.25);
  // the headlights
  ${HEAD_LAMPS.map((q) => `g+=uLamp.z*quad(ro,rd,vec3(${(q[0] - 3.2).toFixed(2)},-22.,${(q[2] - 1.4).toFixed(2)}),vec3(6.4,0.,0.),vec3(0.,0.,2.8),.25,px,tq,uv)*step(tq,T+.3)*vec3(2.6,2.6,2.2);`).join("\n  ")}
  vec3 sv=g/(1.+g);
  sv=max(sv+(h-.5)/255.*smoothstep(0.,2./255.,max(sv.r,max(sv.g,sv.b))),0.);
  float al=smoothstep(0.,.012,max(sv.r,max(sv.g,sv.b)));
  gl_FragColor=vec4(sv*al,al);
}`;
const NIGHT_DATA = { frag: FRAG, camera: glCamera(P) };
const live = `
const FA_GL = (function () {
${glScript()}
return { glLayer, settle };
})();
function mountHowFigure(root, say) {
  const P = ${JSON.stringify(P)}, L = ${JSON.stringify(LEAF)}, INN = ${JSON.stringify(INN)}, OUTS = ${JSON.stringify(OUTS)};
  const SRC = [56, -17, -30], GLASS_X = ${GLASS_X}, BOARD = ${BOARD}, HEAD = ${HEAD}, SH = ${JSON.stringify(SH)}, SX = -7;
  const rad = Math.PI / 180, sa = Math.sin(P.azimuth * rad), ca = Math.cos(P.azimuth * rad), se = Math.sin((P.elevation ?? 30) * rad), ce = Math.cos((P.elevation ?? 30) * rad), K = P.scale * ${k.cameraOf({ scale: 1 }).k};
  const iso = (x, y, z) => [P.origin[0] + (x * sa - y * ca) * K, P.origin[1] + ((x * ca + y * sa) * se - z * ce) * K];
  const f = (n) => Math.round(n * 10) / 10;
  const d = (pts, close) => pts.map((q, i) => (i ? "L" : "M") + f(q[0]) + " " + f(q[1])).join("") + (close ? "Z" : "");
  const shift = (x, y, z) => { const q = iso(x, y, z), o = iso(0, 0, 0); return "translate(" + f(q[0] - o[0]) + " " + f(q[1] - o[1]) + ")"; };
  const svg = root.querySelector("svg.fa-back") || root.querySelector("svg"), fsvg = root.querySelector("svg.fa-front");
  const q = (s) => svg.querySelector(s) || (fsvg && fsvg.querySelector(s));
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
  /* the shutter: slats in the plane x = SX, from the box down to how far it is let down */
  const shSlot = q('[data-slot="shade"]'), shFill = mk("fa-slats"), shLines = mk("fa-slat-line"), shEdge = mk("fa-slat-edge");
  shSlot.append(shFill, shLines, shEdge);
  function drawShade(down) {
    if (down < 0.01) { shFill.setAttribute("d", ""); shLines.setAttribute("d", ""); shEdge.setAttribute("d", ""); return; }
    const zb = SH.top - down * (SH.top - BOARD), y0 = SH.y0 + 1.6, y1 = -1.6;
    const rect = d([iso(SX, y0, SH.top), iso(SX, y1, SH.top), iso(SX, y1, zb), iso(SX, y0, zb)], true);
    shFill.setAttribute("d", rect); shEdge.setAttribute("d", rect);
    let ln = ""; for (let z = SH.top - 3.4; z > zb + 0.8; z -= 3.4) ln += d([iso(SX, y0, z), iso(SX, y1, z)]);
    shLines.setAttribute("d", ln + d([iso(SX, y0, zb + 1.6), iso(SX, y1, zb + 1.6)]));
  }
  /* sound from the street, as arcs in the plane through the phone: they stop on the
     wall, cross a closed window weakened, and go through an open one whole */
  const ringSlot = q('[data-slot="rings"]');
  const RN = 7, rings = [];
  for (let i = 0; i < RN; i++) { const a = mk("fa-ring"), b = mk("fa-ring"); b.setAttribute("stroke-dasharray", "1.5 3"); a.setAttribute("data-free", ""); b.setAttribute("data-free", ""); ringSlot.append(a, b); rings.push([a, b]); }
  const AIM = Math.atan2(BOARD + 4 - SRC[2], OUTS[0] - 6 - SRC[0]), SPREAD = 26 * rad, RMAX = 176;
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  function drawRings(t, open, shade = 0) {
    rings.forEach(([a, b], i) => {
      const r = ((t * 46 + i * RMAX / RN) % RMAX) + 8;
      const fade = smooth(8, 26, r) * (1 - smooth(RMAX * 0.68, RMAX, r));
      const strong = [], weak = [];
      for (let s = 0; s <= 26; s++) {
        const an = AIM - SPREAD + (2 * SPREAD * s) / 26, x = SRC[0] + Math.cos(an) * r, z = SRC[2] + Math.sin(an) * r;
        const inGap = z > BOARD + 1 && z < HEAD - 8;
        let kind = 0;
        if (x >= 0.5) kind = 1;
        else if (inGap) kind = open > 0.5 ? (x > -110 ? 1 : 0) : shade > 0.5 ? (x > SX ? 1 : (x > -66 ? 2 : 0)) : (x > GLASS_X ? 1 : (x > -96 ? 2 : 0));
        (kind === 1 ? strong : kind === 2 ? weak : []).push(kind ? iso(x, SRC[1], z) : 0);
      }
      a.setAttribute("d", strong.length > 1 ? d(strong) : ""); a.setAttribute("opacity", (0.72 * fade).toFixed(3));
      b.setAttribute("d", weak.length > 1 ? d(weak) : ""); b.setAttribute("opacity", (0.42 * fade).toFixed(3));
    });
  }
  const phone = q('[data-part="phone"]'), shadow = q('[data-part="shadow"]'), bars = [...root.querySelectorAll("[data-bar]")];
  const car = q('[data-slot="car"]');

  /* night falls: the drawing darkens by a colour matrix and the lamps come on, each when
     the dusk passes its own level (the car first, then the lantern's photocell, then the
     student at the desk), each on its own envelope, so nothing pops */
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const NGT = ${JSON.stringify(NIGHT_DATA)};
  const cvs = root.querySelector("canvas.fa-gl");
  const mat = svg.querySelector("#fa-night feColorMatrix"), matF = fsvg && fsvg.querySelector("#fa-night-front feColorMatrix");
  let layer = null;
  try { if (cvs) layer = FA_GL.glLayer({ canvas: cvs, fragment: NGT.frag, view: [${W}, ${H}], camera: NGT.camera, uniforms: ["uLamp"], onError: (m) => console.warn("night layer:", m) }); } catch (e) { layer = null; }
  if (cvs && !layer) cvs.style.display = "none";
  const dusk = { x: 0, v: 0 }, lamps = [0, 1, 2, 3].map(() => ({ x: 0, v: 0 }));
  const LAMP_AT = [0.62, 0.42, 0.28, 0.12], LAMP_S = [0.07, 0.5, 0.12, 0.3];
  let depth = 0, shownD = "", shownL = "", glDirty = true;
  const matrix = (d) => { const A = [1 - 0.56 * d, 1 - 0.53 * d, 1 - 0.44 * d], k = 0.6 * d, W3 = [0.2126, 0.7152, 0.0722]; let v = ""; for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) v += (A[i] * ((1 - k) * (i === j ? 1 : 0) + k * W3[j])).toFixed(4) + " "; v += "0 0 "; } return v + "0 0 0 1 0"; };
  function nightStep(dt, calm) {
    let moving = FA_GL.settle(dusk, depth, dt, 0.8, calm);
    lamps.forEach((l, i) => { moving = FA_GL.settle(l, dusk.x > LAMP_AT[i] * Math.max(depth, 0.5) ? 1 : 0, dt, LAMP_S[i], calm) || moving; });
    const d = Math.min(1, Math.max(0, dusk.x)), dk = d.toFixed(3);
    if (dk !== shownD) {
      shownD = dk;
      if (mat) mat.setAttribute("values", matrix(d));
      if (matF) matF.setAttribute("values", matrix(d * 0.3));
      svg.style.filter = d > 0.002 ? "url(#fa-night)" : "";
      if (fsvg) fsvg.style.filter = d > 0.002 ? "url(#fa-night-front)" : "";
    }
    // the eye adapts: a lamp only counts as the ambient falls, so a lit wall never goes paler than day
    const expo = d * d * (3 - 2 * d), u = lamps.map((l) => Math.min(1, Math.max(0, l.x)) * expo), lk = u.map((x) => x.toFixed(3)).join();
    if (lk !== shownL) { shownL = lk; root.style.setProperty("--fa-lit", layer ? "0" : u[1].toFixed(3)); root.style.setProperty("--fa-lcd", u[3].toFixed(3)); glDirty = true; }
    if (layer && glDirty) { glDirty = false; if (Math.max(...u) > 1e-3) layer.draw({ uLamp: u }, 0); else layer.clear(); }
    return moving;
  }
  addEventListener("resize", () => { glDirty = true; if (still.matches) nightStep(1, true); });
  /* the one timeline: what the student does, in order */
  const DAY = 16, NIGHT_IN = 5.2, NIGHT_ADD = 5.6; let night = false, LOOP = DAY;
  const ease = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2, clamp01 = (x) => Math.min(1, Math.max(0, x));
  const span = (t, a, b) => clamp01((t - a) / (b - a));
  function stateAt(t) {
    t = ((t % LOOP) + LOOP) % LOOP;
    if (night && t >= NIGHT_IN) {
      // 5.2–6.4 lower, 6.4–10.0 hold and measure, 10.0–10.8 raise, then the day tour resumes
      const u = t - NIGHT_IN;
      if (u < NIGHT_ADD) {
        const base = dayAt(NIGHT_IN - 0.01);
        let shade = 1, step = "inshade";
        if (u < 1.2) { shade = ease(span(u, 0, 1.2)); step = "shade"; }
        else if (u > 4.8) { shade = 1 - ease(span(u, 4.8, 5.6)); step = "raise"; }
        return { ...base, shade, step, level: 0.26 - 0.13 * shade, side: "shade" };
      }
      return { ...dayAt(t - NIGHT_ADD), shade: 0 };
    }
    return { ...dayAt(t), shade: 0 };
  }
  function dayAt(t) {
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
    drawLeaf(s.win); drawShade(s.shade); drawRings(t, s.win, s.shade);
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
  const HOLD = { in: 3.6, out: 12 }, HOLD_N = { in: 3.6, shade: 8.2, out: 12 + NIGHT_ADD };
  let clock = 0, target = null, frame = 0, last = 0, visible = false, resume = 0, ringT = 0;
  const atHold = () => target !== null && Math.abs(((clock - target) % LOOP + LOOP) % LOOP) < 0.04;
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60; last = now;
    ringT += dt;
    nightStep(dt, false);
    if (target === null) clock += dt;
    else if (!atHold()) { const gap = ((target - clock) % LOOP + LOOP) % LOOP; clock += Math.min(gap, dt * (gap > 6 ? 3.2 : 1.8)); }
    drawAt(dt);
    frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
  }
  function drawAt(dt) {
    const s = stateAt(clock);
    draw(clock, dt);
    if (ringT) drawRings(ringT, s.win, s.shade);
  }
  const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
  const api = {
    show(side, hold = 9000) {
      target = (night ? HOLD_N : HOLD)[side]; if (target === undefined) target = HOLD.in; clearTimeout(resume);
      if (still.matches) { clock = target; ringT = 1.2; drawAt(0.5); return; }
      if (hold) resume = setTimeout(() => { target = null; run(); }, hold);
      run();
    },
    night(on, deep = 1) {
      on = !!on; depth = on ? Math.min(1, Math.max(0.3, deep)) : 0;
      if (still.matches) nightStep(1, true); else run();
      if (on === night) return;
      night = on; LOOP = on ? DAY + NIGHT_ADD : DAY;
      if (on && clock >= NIGHT_IN) clock += NIGHT_ADD; else if (!on && clock >= NIGHT_IN + NIGHT_ADD) clock -= NIGHT_ADD; else if (!on && clock >= NIGHT_IN) clock = NIGHT_IN;
      clock = ((clock % LOOP) + LOOP) % LOOP; target = null; lastSide = ""; drawAt(0.016); run();
    },
    isNight: () => night,
    stateAt, redraw() { lastSide = ""; drawAt(0.016); },
    seek(t, r) { target = t; clock = t; ringT = r ?? t; drawAt(1); },
  };
  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }, { rootMargin: "80px 0px" }).observe(svg);
  if (still.matches) { clock = HOLD.in; ringT = 1.2; }
  nightStep(0.016, still.matches);
  drawAt(0.5);
  return api;
}
`;
writeFileSync(join(OUT, "figure.html"), svg);
writeFileSync(join(OUT, "live.js"), live);
writeFileSync(join(OUT, "how.css"), FA_CSS);
const page = k.pageHtml({
  title: "How to place the phone", theme: "light", width: 820,
  body: k.plateHtml({ fig: "Fig 1", title: "Dentro e fora", hint: "", readout: "", caption: "Maquete sem escala", body: `<div class="iso-stage">${svg.replace("__LABEL__", "Maquete")}</div>` }) + `<style>${FA_CSS}</style>`,
  script: `${live};window.API=mountHowFigure(document.querySelector(".iso-stage"),(s)=>{const r=document.querySelector("[data-readout]");if(r)r.textContent=s;});if(location.hash==="#night")API.night(true);`,
});
writeFileSync(join(OUT, "test.html"), page);
console.log("svg", (svg.length / 1024).toFixed(0) + "KB", "live", (live.length / 1024).toFixed(0) + "KB");
