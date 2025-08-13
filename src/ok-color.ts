// MIT-licensed algorithms by Björn Ottosson, ported to TypeScript.
// Source: “Two new color spaces for color picking – Okhsv & Okhsl” and ok_color.h.  [oai_citation:0‡bottosson.github.io](https://bottosson.github.io/posts/colorpicker/) [oai_citation:1‡GitLab](https://inkscape.gitlab.io/inkscape/doxygen/ok-color_8cpp_source.html)

export type RGB = { r: number; g: number; b: number }; // 0..1 (nonlinear sRGB where noted)
export type Lab = { L: number; a: number; b: number };
export type HSV = { h: number; s: number; v: number }; // h in [0,1), s,v in [0,1]
export type LCH = { L: number; C: number; H: number }; // H in degrees [0,360)

type LC = { L: number; C: number };
type ST = { S: number; T: number };

const pi = Math.PI;

// Clamp a number to [0,1]
function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// sRGB companding (encode from linear to sRGB)
function srgbTransfer(a: number): number {
  return a <= 0.0031308 ? 12.92 * a : 1.055 * Math.pow(a, 1 / 2.4) - 0.055;
}

// sRGB inverse companding (decode sRGB to linear)
function srgbTransferInv(a: number): number {
  return a <= 0.04045 ? a / 12.92 : Math.pow((a + 0.055) / 1.055, 2.4);
}

// Oklab ← linear sRGB
function linearSrgbToOklab(c: RGB): Lab {
  const l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  const m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  const s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

// linear sRGB ← Oklab
function oklabToLinearSrgb(c: Lab): RGB {
  const l_ = c.L + 0.3963377774 * c.a + 0.2158037573 * c.b;
  const m_ = c.L - 0.1055613458 * c.a - 0.0638541728 * c.b;
  const s_ = c.L - 0.0894841775 * c.a - 1.291485548 * c.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

// toe and inverse (for L_r)
function toe(x: number): number {
  const k1 = 0.206;
  const k2 = 0.03;
  const k3 = (1 + k1) / (1 + k2);
  const t = k3 * x - k1;
  return 0.5 * (t + Math.sqrt(t * t + 4 * k2 * k3 * x));
}
function toeInv(x: number): number {
  const k1 = 0.206;
  const k2 = 0.03;
  const k3 = (1 + k1) / (1 + k2);
  return (x * x + k1 * x) / (k3 * (x + k2));
}

function toST(cusp: LC): ST {
  const { L, C } = cusp;
  return { S: C / L, T: C / (1 - L) };
}

// Max saturation S = C/L for a given hue direction (a,b) normalized
function computeMaxSaturation(a: number, b: number): number {
  let k0: number, k1: number, k2: number, k3: number, k4: number;
  let wl: number, wm: number, ws: number;

  if (-1.88170328 * a - 0.80936493 * b > 1) {
    // red
    k0 = 1.19086277;
    k1 = 1.76576728;
    k2 = 0.59662641;
    k3 = 0.75515197;
    k4 = 0.56771245;
    wl = 4.0767416621;
    wm = -3.3077115913;
    ws = 0.2309699292;
  } else if (1.81444104 * a - 1.19445276 * b > 1) {
    // green
    k0 = 0.73956515;
    k1 = -0.45954404;
    k2 = 0.08285427;
    k3 = 0.1254107;
    k4 = 0.14503204;
    wl = -1.2684380046;
    wm = 2.6097574011;
    ws = -0.3413193965;
  } else {
    // blue
    k0 = 1.35733652;
    k1 = -0.00915799;
    k2 = -1.1513021;
    k3 = -0.50559606;
    k4 = 0.00692167;
    wl = -0.0041960863;
    wm = -0.7034186147;
    ws = 1.707614701;
  }

  // polynomial approx
  let S = k0 + k1 * a + k2 * b + k3 * a * a + k4 * a * b;

  // one Halley step
  const k_l = 0.3963377774 * a + 0.2158037573 * b;
  const k_m = -0.1055613458 * a - 0.0638541728 * b;
  const k_s = -0.0894841775 * a - 1.291485548 * b;

  const l_ = 1 + S * k_l;
  const m_ = 1 + S * k_m;
  const s_ = 1 + S * k_s;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const l_dS = 3 * k_l * l_ * l_;
  const m_dS = 3 * k_m * m_ * m_;
  const s_dS = 3 * k_s * s_ * s_;

  const l_dS2 = 6 * k_l * k_l * l_;
  const m_dS2 = 6 * k_m * k_m * m_;
  const s_dS2 = 6 * k_s * k_s * s_;

  const f = wl * l + wm * m + ws * s;
  const f1 = wl * l_dS + wm * m_dS + ws * s_dS;
  const f2 = wl * l_dS2 + wm * m_dS2 + ws * s_dS2;

  S = S - (f * f1) / (f1 * f1 - 0.5 * f * f2);
  return S;
}

// Cusp for normalized hue direction (a_, b_)
function findCusp(a_: number, b_: number): LC {
  const S_cusp = computeMaxSaturation(a_, b_);
  const rgbAtMax = oklabToLinearSrgb({ L: 1, a: S_cusp * a_, b: S_cusp * b_ });
  const denom = Math.max(rgbAtMax.r, Math.max(rgbAtMax.g, rgbAtMax.b));
  const L_cusp = Math.cbrt(1 / denom);
  const C_cusp = L_cusp * S_cusp;
  return { L: L_cusp, C: C_cusp };
}

// Helpers for direct OKLCh → sRGB conversion
function labFromLch(L: number, C: number, Hdeg: number): Lab {
  const rad = ((Hdeg % 360) * Math.PI) / 180;
  return { L, a: C * Math.cos(rad), b: C * Math.sin(rad) };
}

function isInGamut(rgb: RGB): boolean {
  return (
    rgb.r >= 0 &&
    rgb.r <= 1 &&
    rgb.g >= 0 &&
    rgb.g <= 1 &&
    rgb.b >= 0 &&
    rgb.b <= 1
  );
}

// -------- Public API: okhsv ↔ sRGB (nonlinear) --------

export function okhsvToSrgb(hsv: HSV): RGB {
  const h = hsv.h; // 0..1
  const s = hsv.s;
  const v = hsv.v;

  const eps = 1e-9;
  // Fast paths for edge cases
  if (v <= eps) {
    return { r: 0, g: 0, b: 0 };
  }
  if (s <= eps) {
    const Lgray = toeInv(v);
    const rgbGrayLin = oklabToLinearSrgb({ L: Lgray, a: 0, b: 0 });
    return {
      r: srgbTransfer(clamp01(rgbGrayLin.r)),
      g: srgbTransfer(clamp01(rgbGrayLin.g)),
      b: srgbTransfer(clamp01(rgbGrayLin.b)),
    };
  }

  const a_ = Math.cos(2 * pi * h);
  const b_ = Math.sin(2 * pi * h);

  const cusp = findCusp(a_, b_);
  const { S: S_max, T: T_max } = toST(cusp);
  const S_0 = 0.5;
  const k = 1 - S_0 / S_max;

  // triangle model
  const denom = S_0 + T_max - T_max * k * s;
  const L_v = 1 - (s * S_0) / denom;
  const C_v = (s * T_max * S_0) / denom;

  let L = v * L_v;
  let C = v * C_v;

  // toe + curved top compensation
  const L_vt = toeInv(L_v);
  const C_vt = (C_v * L_vt) / L_v;

  let L_new = toeInv(L);
  if (L > 0) {
    C = (C * L_new) / L;
  } else {
    C = 0;
  }
  L = L_new;

  const rgbScale = oklabToLinearSrgb({ L: L_vt, a: a_ * C_vt, b: b_ * C_vt });
  const scale_L = Math.cbrt(
    1 / Math.max(1e-12, Math.max(rgbScale.r, Math.max(rgbScale.g, rgbScale.b)))
  );

  L *= scale_L;
  C *= scale_L;

  const rgbLin = oklabToLinearSrgb({ L, a: C * a_, b: C * b_ });
  return {
    r: srgbTransfer(clamp01(rgbLin.r)),
    g: srgbTransfer(clamp01(rgbLin.g)),
    b: srgbTransfer(clamp01(rgbLin.b)),
  };
}

export function srgbToOkhsv(rgb: RGB): HSV {
  // to linear
  const lin: RGB = {
    r: srgbTransferInv(rgb.r),
    g: srgbTransferInv(rgb.g),
    b: srgbTransferInv(rgb.b),
  };
  const lab = linearSrgbToOklab(lin);

  const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  // If you want to avoid NaNs for grays, early-return here when C === 0.
  const a_ = lab.a / C;
  const b_ = lab.b / C;

  let L = lab.L;
  const h = 0.5 + (0.5 * Math.atan2(-lab.b, -lab.a)) / pi;

  const cusp = findCusp(a_, b_);
  const { S: S_max, T: T_max } = toST(cusp);
  const S_0 = 0.5;
  const k = 1 - S_0 / S_max;

  // find L_v, C_v, L_vt, C_vt
  const t = T_max / (C + L * T_max);
  const L_v = t * L;
  const C_v = t * C;

  const L_vt = toeInv(L_v);
  const C_vt = (C_v * L_vt) / L_v;

  const rgbScale = oklabToLinearSrgb({ L: L_vt, a: a_ * C_vt, b: b_ * C_vt });
  const scale_L = Math.cbrt(
    1 / Math.max(0, Math.max(rgbScale.r, Math.max(rgbScale.g, rgbScale.b)))
  );

  L /= scale_L;
  let C2 = C / scale_L;

  C2 = (C2 * toe(L)) / L;
  L = toe(L);

  const v = L / L_v;
  const s = ((S_0 + T_max) * C_v) / (T_max * S_0 + T_max * k * C_v);

  return { h, s, v };
}

const TAU = Math.PI * 2;

// okhsv → oklch
export function okhsvToOklch(hsv: HSV): LCH {
  const { h, s, v } = hsv; // h in [0,1)
  const a_ = Math.cos(TAU * h);
  const b_ = Math.sin(TAU * h);

  const cusp = findCusp(a_, b_);
  const { S: S_max, T: T_max } = toST(cusp);
  const S_0 = 0.5;
  const k = 1 - S_0 / S_max;

  // Triangle model (v=1)
  const denom = S_0 + T_max - T_max * k * s;
  const L_v = 1 - (s * S_0) / denom;
  const C_v = (s * T_max * S_0) / denom;

  // Scale to v
  let L = v * L_v;
  let C = v * C_v;

  // Toe + curved-top compensation
  const L_vt = toeInv(L_v);
  const C_vt = (C_v * L_vt) / L_v;

  const L_new = toeInv(L);
  C = (C * L_new) / L;
  L = L_new;

  // Gamut scaling against linear-sRGB
  const rgbScale = oklabToLinearSrgb({ L: L_vt, a: a_ * C_vt, b: b_ * C_vt });
  const scale_L = Math.cbrt(
    1 / Math.max(0, Math.max(rgbScale.r, Math.max(rgbScale.g, rgbScale.b)))
  );

  L *= scale_L;
  C *= scale_L;

  const H = (h * 360 + 360) % 360;
  return { L, C, H };
}

// oklch → okhsv
export function oklchToOkhsv(L: number, C: number, H: number): HSV {
  const eps = 1e-9;
  // Hue in [0,1)
  const h = (((H % 360) + 360) % 360) / 360;

  // Degenerate cases: neutrals or black
  // - If C≈0: s should be 0, v ≈ L (in the okhsv model)
  // - If L≈0: black → v=0, s=0
  if (L <= eps || C <= eps) {
    return { h, s: 0, v: Math.max(0, Math.min(1, L)) };
  }

  const a_ = Math.cos(TAU * h);
  const b_ = Math.sin(TAU * h);

  const cusp = findCusp(a_, b_);
  const { S: S_max, T: T_max } = toST(cusp);
  const S_0 = 0.5;
  const k = 1 - S_0 / S_max;

  // Find L_v, C_v
  const t = T_max / (C + L * T_max);
  const L_v = t * L;
  const C_v = t * C;

  // Toe-inverse versions
  const L_vt = toeInv(L_v);
  const C_vt = (C_v * L_vt) / L_v;

  // Gamut scaling (inverse of step used in okhsv→oklch)
  const rgbScale = oklabToLinearSrgb({ L: L_vt, a: a_ * C_vt, b: b_ * C_vt });
  const scale_L = Math.cbrt(
    1 / Math.max(1e-12, Math.max(rgbScale.r, Math.max(rgbScale.g, rgbScale.b)))
  );

  L /= scale_L;
  C /= scale_L;

  // Apply toe
  C = (C * toe(L)) / L;
  L = toe(L);

  // Recover v and s
  const v = L / L_v;
  const s = ((S_0 + T_max) * C_v) / (T_max * S_0 + T_max * k * C_v);

  return { h, s: isFinite(s) ? s : 0, v: isFinite(v) ? v : 0 };
}

// export function oklchToRgb(
//   L: number,
//   C: number,
//   H: number
// ): [red: number, green: number, blue: number] {
//   // Fast path for neutrals
//   if (C <= 1e-9) {
//     const rgbLin = oklabToLinearSrgb({ L, a: 0, b: 0 });
//     return [
//       255 * clamp01(srgbTransfer(clamp01(rgbLin.r))),
//       255 * clamp01(srgbTransfer(clamp01(rgbLin.g))),
//       255 * clamp01(srgbTransfer(clamp01(rgbLin.b))),
//     ];
//   }

//   // Try requested chroma first
//   let lab = labFromLch(L, C, H);
//   let rgbLin = oklabToLinearSrgb(lab);

//   if (!isInGamut(rgbLin)) {
//     // Binary search a scale factor on C in [0,1] to bring the color into sRGB gamut
//     let lo = 0;
//     let hi = 1;
//     for (let i = 0; i < 24; i++) {
//       // ~1e-7 precision
//       const mid = (lo + hi) / 2;
//       lab = labFromLch(L, C * mid, H);
//       rgbLin = oklabToLinearSrgb(lab);
//       if (isInGamut(rgbLin)) lo = mid;
//       else hi = mid;
//     }
//     // Use the in-gamut side
//     lab = labFromLch(L, C * lo, H);
//     rgbLin = oklabToLinearSrgb(lab);
//   }

//   // Compand and clamp
//   const r = srgbTransfer(clamp01(rgbLin.r));
//   const g = srgbTransfer(clamp01(rgbLin.g));
//   const b = srgbTransfer(clamp01(rgbLin.b));
//   // Optional: comment out the log if too chatty
//   // console.log(`OKLCH(${L.toFixed(3)}, ${C.toFixed(3)}, ${H.toFixed(1)}°) → sRGB(${(r*255).toFixed(1)}, ${(g*255).toFixed(1)}, ${(b*255).toFixed(1)})`);
//   return [255 * r, 255 * g, 255 * b];
// }

export function oklchToRgb(
  l: number,
  c: number,
  h: number
): [number, number, number] {
  // Convert OKLCh to OKLab
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // OKLab to linear RGB
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  let r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let b_ = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  // Apply gamma correction
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  b_ = b_ > 0.0031308 ? 1.055 * Math.pow(b_, 1 / 2.4) - 0.055 : 12.92 * b_;

  // Clamp to [0, 1]
  r = Math.max(0, Math.min(1, r));
  g = Math.max(0, Math.min(1, g));
  b_ = Math.max(0, Math.min(1, b_));

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b_ * 255)];
}

export function srgbToOklch(
  red: number,
  green: number,
  blue: number
): [L: number, C: number, H: number] {
  // Normalize 8-bit sRGB inputs to 0..1 before conversion
  const hsv = srgbToOkhsv({ r: red / 255, g: green / 255, b: blue / 255 });
  const lch = okhsvToOklch(hsv);
  // Log with explicit units to avoid confusion
  // console.log(
  //   `Converted RGB(${Math.round(red)}, ${Math.round(green)}, ${Math.round(
  //     blue
  //   )}) to OKLCH(${(lch.L * 100).toFixed(2)}%, ${lch.C.toFixed(
  //     4
  //   )}, ${lch.H.toFixed(2)}°)`
  // );
  return [lch.L, lch.C, lch.H];
}
