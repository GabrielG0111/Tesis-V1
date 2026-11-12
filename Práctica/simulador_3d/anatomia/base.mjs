// Base común de las figuras de anatomía: cámara, registro de piezas con su forma
// real (para el orden de pintado y la auditoría de la skill anatomy), caras
// planas, huecos con profundidad y la emisión del SVG con sus datos vivos.
import * as k from "./kit/iso-kit.mjs";
import * as A from "./kit/audit.mjs";
import * as G from "./kit/lathe.mjs";
import { tubePieces, tubeSvg } from "./kit/tube.mjs";

export { k, A, G };

export const RESORTE = { stagger: 0.045, stiffness: 64, damping: 14.2, substeps: 4 };

const suma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const por = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vec = { suma, por, punto };

/**
 * Crea el contexto de una figura.
 * piezas: { id: { nombre, dice, mueve: [x, y, z] } }; la pieza "base" es el soporte fijo.
 * orden: el orden de salida al despiezar (el de fuera primero).
 */
export function figura({ ancho = 600, alto = 400, azimut = 58, elevacion = 34, encaje, pad = 20, piezas, orden, resorte = RESORTE }) {
  const semilla = ++figura.semilla;
  orden = orden.filter((p) => (piezas[p]?.mueve ?? [0, 0, 0]).some((v) => v !== 0));
  const P = k.fitProjection(encaje, ancho, alto, { pad, azimuth: azimut, elevation: elevacion });
  const R = A.recorder(P, { order: orden, spring: resorte });
  const V = A.cameraBasis(P).V;
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const fondo = [];
  const mueveDe = (pieza, o) => o.mueve ?? piezas[pieza]?.mueve ?? [0, 0, 0];
  const nombreDe = (pieza, o, base) => R.nameFor(o.nombre ?? `${pieza === "base" ? "stand" : pieza}.${base}`);

  function poner(pieza, centro, svg, formas, o = {}) {
    if (o.envolver) svg = o.envolver.abre + svg + o.envolver.cierra;
    return R.put({ piece: pieza, ride: o.monta ?? pieza, at: centro, bias: o.sesgo ?? 0, svg, move: mueveDe(pieza, o), shapes: formas, name: o.nombreItem ?? formas[0]?.name ?? R.nameFor(`${pieza}.item`) });
  }

  /** Caja redondeada apoyada en z. o.cara(paths) devuelve marcado extra dibujado encima. */
  function losa(pieza, plan, z, h, o = {}) {
    const pasos = o.pasos ?? (plan.r > 0 ? 4 : 2);
    const paths = k.slabOf(plan, z, h, P, pasos, o.bisel ?? 0);
    const nombre = nombreDe(pieza, o, o.parte ?? "losa");
    const forma = R.solid(A.slab(plan, z, h, { name: nombre, owner: o.dueno, limp: o.blando, ...(o.corte ? { cut: o.corte } : {}) }, pasos));
    const svg = S(paths, { tone: o.tono ?? "mid", crease: o.pliegue ?? "faint", lit: o.lit, inner: o.dentro ?? "" }) + (o.extra ?? "");
    poner(pieza, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], svg, [forma, ...(o.formas ?? [])], o);
    return forma;
  }
  const caja = (pieza, [x0, y0, z0], [x1, y1, z1], o = {}) => losa(pieza, { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: o.r ?? 0 }, z0, z1 - z0, o);

  function prisma(pieza, anillo, z, h, o = {}) {
    const paths = k.extrude(anillo, z, h, P, { convex: o.convexo ?? true, bevel: o.bisel });
    const nombre = nombreDe(pieza, o, o.parte ?? "prisma");
    const forma = R.solid(A.extruded(anillo, z, h, { name: nombre }));
    const cx = anillo.reduce((s, p) => s + p[0], 0) / anillo.length;
    const cy = anillo.reduce((s, p) => s + p[1], 0) / anillo.length;
    poner(pieza, [cx, cy, z + h / 2], S(paths, { tone: o.tono ?? "mid", lit: o.lit, inner: o.dentro ?? "" }) + (o.extra ?? ""), [forma], o);
    return forma;
  }

  function cil(pieza, cx, cy, r, z, h, o = {}) {
    const paths = k.cylinder(cx, cy, r, z, h, P, o.pasos ?? 20, o.bisel ?? 0);
    const nombre = nombreDe(pieza, o, o.parte ?? "cil");
    const forma = R.solid(A.cylinder(cx, cy, r, z, h, { name: nombre }));
    poner(pieza, [cx, cy, z + h / 2], S(paths, { tone: o.tono ?? "mid", lit: o.lit, crease: o.pliegue ?? "faint", inner: o.dentro ?? "" }) + (o.extra ?? ""), [forma], o);
    return forma;
  }

  /** Disco a lo largo de un eje cualquiera (tornillos en caras verticales, botones, ejes). */
  function disco(pieza, centro, eje, r, grosor, o = {}) {
    const F = G.frameAlong(centro, eje);
    const paths = G.disc(0, grosor, r, F, P);
    const nombre = nombreDe(pieza, o, o.parte ?? "disco");
    const forma = R.solid(A.disc(F, 0, grosor, r, { name: nombre, owner: o.dueno }));
    poner(pieza, suma(centro, por(eje, grosor / 2)), S(paths, { tone: o.tono ?? "mid", lit: o.lit }) + (o.extra ?? ""), [forma], o);
    return forma;
  }

  /** Prisma a lo largo de un eje cualquiera: polígono convexo en el plano (u, v) del marco F, de s0 a s1. */
  function prismaEje(pieza, F, poligono, s0, s1, o = {}) {
    const paths = G.prismOf(F, poligono, s0, s1, P);
    const nombre = nombreDe(pieza, o, o.parte ?? "prisma");
    const forma = R.solid(A.prism(F, poligono, s0, s1, { name: nombre, owner: o.dueno }));
    const cu = poligono.reduce((t, p) => t + p[0], 0) / poligono.length, cv = poligono.reduce((t, p) => t + p[1], 0) / poligono.length;
    const centro = suma(suma(suma(F.o, por(F.a, (s0 + s1) / 2)), por(F.u, cu)), por(F.v, cv));
    poner(pieza, centro, S(paths, { tone: o.tono ?? "mid", lit: o.lit, crease: o.pliegue ?? "faint" }) + (o.extra ?? ""), [forma], o);
    return forma;
  }

  /**
   * Ventana fija: recorta lo que sale de una abertura (un conector que se extrae, una tarjeta
   * que sale de su ranura). El recorte es la proyección del prisma que barre la abertura a lo
   * largo de la salida y no se mueve con la pieza (data-hold), como el vástago de la skill.
   */
  function ventana(esquinas, salida) {
    const id = `an-v${semilla}-${clips++}`;
    const pts = [...esquinas, ...esquinas.map((p) => suma(p, salida))].map(at);
    const casco = cascoConvexo(pts);
    return { abre: `<clipPath id="${id}"><path data-hold d="${k.pathOf(casco, true)}"/></clipPath><g clip-path="url(#${id})">`, cierra: "</g>" };
  }

  /** Cable o tubo: filete, trozos ordenables y ruta registrada para la auditoría. */
  function cable(pieza, puntos, r, o = {}) {
    const ruta = puntos.length > 2 ? G.fillet(puntos, o.curva ?? Math.max(3, r * 2.6), 7, { P, tube: r }) : puntos;
    const id = R.nameFor(o.nombre ?? `${pieza}.cable`);
    R.route(id, ruta, r, { owner: id, limp: true, piece: pieza, move: mueveDe(pieza, o), ride: o.monta ?? pieza, free: o.libre ?? [false, false], bundle: o.haz, touch: o.toca });
    tubePieces(ruta, r, P, { maxLength: o.trozo ?? 14, spacing: 1.4 }).forEach((t, i) =>
      R.put({ piece: pieza, ride: o.monta ?? pieza, at: t.mid, bias: o.sesgo ?? 0, svg: o.envolver ? o.envolver.abre + tubeSvg(t, { tone: o.tono ?? "mid" }) + o.envolver.cierra : tubeSvg(t, { tone: o.tono ?? "mid" }), move: mueveDe(pieza, o), shapes: [A.tube(t.points, t.radii)], name: `${id}:${i}`, route: id, chunk: i }),
    );
    return ruta;
  }

  /** Elemento compuesto: marcado libre con las formas que lo envuelven. */
  function item(pieza, centro, svg, formas, o = {}) {
    for (const f of formas) R.solid(f);
    return poner(pieza, centro, svg, formas, o);
  }

  /** Plano de una cara: origen, eje u (s) y eje v (t, hacia abajo en caras verticales). */
  function cara(o, u, v) {
    const O = at(o), U = at(suma(o, u)), W = at(suma(o, v));
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    return {
      o, u, v, n,
      m: `matrix(${(U[0] - O[0]).toFixed(4)} ${(U[1] - O[1]).toFixed(4)} ${(W[0] - O[0]).toFixed(4)} ${(W[1] - O[1]).toFixed(4)} ${O[0].toFixed(2)} ${O[1].toFixed(2)})`,
      p: (s, t, fuera = 0) => suma(suma(suma(o, por(u, s)), por(v, t)), por(n, fuera)),
    };
  }
  // Caras habituales: frente (+y, s = x, t = -z) y lado (+x, s = -y, t = -z).
  const frente = (y) => cara([0, y, 0], [1, 0, 0], [0, 0, -1]);
  const lado = (x) => cara([x, 0, 0], [0, -1, 0], [0, 0, -1]);
  const arriba = (z) => cara([0, 0, z], [1, 0, 0], [0, 1, 0]);
  const enCara = (c, d, style) => `<g transform="${c.m}">${L(d, style)}</g>`;
  const rect = (s0, t0, s1, t1, r = 0, pasos = 4) => k.pathOf(k.roundedPlan({ x: Math.min(s0, s1), y: Math.min(t0, t1), w: Math.abs(s1 - s0), d: Math.abs(t1 - t0), r }, pasos), true);

  let clips = 0;
  /**
   * Hueco con profundidad en una cara: paredes interiores sombreadas por orientación,
   * fondo oscuro y contenido recortado por la abertura (puertos, ranuras, bahías).
   */
  function hueco(c, forma, prof, { claseFondo = "an-hueco", fondoExtra = "", borde = "lo" } = {}) {
    const id = `an-c${semilla}-${clips++}`;
    const anillo = forma.anillo ?? k.roundedPlan({ x: forma.s0, y: forma.t0, w: forma.s1 - forma.s0, d: forma.t1 - forma.t0, r: forma.r ?? 0.4 }, (forma.r ?? 0.4) > 0 ? 4 : 1);
    let area = 0;
    anillo.forEach(([as, atv], i) => { const [bs, bt] = anillo[(i + 1) % anillo.length]; area += as * bt - bs * atv; });
    const tapas = [];
    const lados = [[], [], [], []];
    const { sinA, cosA } = k.cameraOf(P);
    const [lx, ly] = [-sinA, cosA];
    anillo.forEach(([as, atv], i) => {
      const [bs, bt] = anillo[(i + 1) % anillo.length];
      const largo = Math.hypot(bs - as, bt - atv) || 1;
      const [ds, dt] = [(bs - as) / largo, (bt - atv) / largo];
      const [ns, nt] = area > 0 ? [-dt, ds] : [dt, -ds];
      const n3 = suma(por(c.u, ns), por(c.v, nt));
      if (punto(n3, V) <= 1e-6) return;
      const q = k.pathOf([at(c.p(as, atv)), at(c.p(bs, bt)), at(c.p(bs, bt, -prof)), at(c.p(as, atv, -prof))], true);
      if (n3[2] > 0.6) tapas.push(q);
      else lados[Math.min(3, Math.max(0, Math.floor(((n3[0] * lx + n3[1] * ly + 1) / 2) * 4)))].push(q);
    });
    const d = k.pathOf(anillo, true);
    const atras = cara(c.p(0, 0, -prof), c.u, c.v);
    return [
      `<clipPath id="${id}"><path transform="${c.m}" d="${d}"/></clipPath>`,
      `<g clip-path="url(#${id})">`,
      `<g transform="${atras.m}"><path class="${claseFondo}" d="${d}"/>${fondoExtra}</g>`,
      tapas.length ? `<path class="iso-top" d="${tapas.join("")}"/>` : "",
      ...lados.map((q, i) => (q.length ? `<path class="iso-shade" data-shade="${i}" d="${q.join("")}"/>` : "")),
      `</g>`,
      `<g transform="${c.m}"><path class="iso-line" data-tone="${borde}" d="${d}"/></g>`,
    ].join("");
  }

  /**
   * Agujeros pasantes en una placa: devuelve el recorte (evenodd) que vacía las aberturas en el
   * dibujo de la placa y las paredes interiores de cada agujero, que se dibujan encima.
   */
  function agujeros(c, rects, prof) {
    const id = `an-a${semilla}-${clips++}`;
    const huecos = rects.map(({ s0, t0, s1, t1, r = 0.6 }) => k.pathOf(k.roundedPlan({ x: s0, y: t0, w: s1 - s0, d: t1 - t0, r }, r > 0 ? 4 : 1).map(([s, t]) => at(c.p(s, t))), true)).join("");
    const paredes = rects.map((r) => hueco(c, r, prof, { claseFondo: "an-nada" })).join("");
    return { abre: `<clipPath id="${id}"><path clip-rule="evenodd" d="M-2000 -2000H4000V4000H-2000Z${huecos}"/></clipPath><g clip-path="url(#${id})">`, cierra: "</g>", paredes };
  }

  /** Rejilla de ventilación: ranuras cerradas en una cara. */
  function ranuras(c, s0, s1, t0, t1, paso = 3, ancho = 1.2, tono = "faint") {
    const out = [];
    for (let s = s0; s + ancho <= s1 + 1e-6; s += paso) out.push(rect(s, t0, s + ancho, t1, ancho / 2, 3));
    return enCara(c, out.join(""), { tone: tono });
  }
  /** Tornillos: anillo y punto, en una cara. */
  function tornillos(c, pts, r = 1) {
    return enCara(c, pts.map(([s, t]) => k.pathOf(k.circleRing(s, t, r, 12), true)).join(""), { tone: "lo" }) + D(pts.map(([s, t]) => at(c.p(s, t))), { size: 0.45 });
  }
  /** Placa de características con tres líneas que representan texto impreso. */
  function placa(c, s0, t0, w, h) {
    const lineas = [0.28, 0.5, 0.72].map((f, i) => `M${(s0 + 2).toFixed(1)} ${(t0 + h * f).toFixed(1)}H${(s0 + 2 + (w - 4) * [0.8, 0.55, 0.68][i]).toFixed(1)}`).join("");
    return `<g transform="${c.m}"><path class="an-placa" d="${rect(s0, t0, s0 + w, t0 + h, 0.6)}"/>${L(rect(s0, t0, s0 + w, t0 + h, 0.6), { tone: "lo" })}${L(lineas, { tone: "lo", free: true })}</g>`;
  }
  /** LED: punto en una cara; los encendidos laten. */
  function leds(c, pts, { latido = false, tono = "hi" } = {}) {
    return `<g class="an-led${latido ? " an-late" : ""}">${D(pts.map(([s, t]) => at(c.p(s, t, 0.05))), { size: 0.55, tone: tono, pulse: latido })}</g>`;
  }

  /** Banco: placa base sobre patas, ranura, tornillos, regla y placa de datos (soporte fijo). */
  function banco(plan, { grosor = 6, pata = 4, regla = true } = {}) {
    fondo.push(`<path class="iso-halo" d="${k.haloOf(plan, -grosor - pata, grosor, P)}"/>`);
    const esquinas = k.corners(plan, 14).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
    for (const [x, y] of esquinas) {
      cil("base", x, y, 5, -grosor - pata, 1.4, { tono: "lo", nombre: "stand.pata-base", pasos: 24 });
      cil("base", x, y, 3.8, -grosor - pata + 1.4, pata - 1.4, { tono: "mid", nombre: "stand.pata", pasos: 24 });
    }
    const tornos = k.corners(plan, 7);
    let extra = L(k.planOutline(k.insetPlan(plan, 3.5), 0, P), { tone: "faint" });
    extra += L(tornos.map(([x, y]) => k.ring(x, y, 1.6, 0, P, 14)).join(""), { tone: "lo" }) + D(tornos.map(([x, y]) => at([x, y, 0])), { size: 0.45 });
    if (regla) {
      const tira = { x: plan.x + 18, y: plan.y + plan.d - 9, w: Math.min(150, plan.w * 0.45), d: 5, r: 0.8 };
      extra += S(k.slabOf(tira, 0, 0.5, P, 3), { tone: "lo", crease: "none" });
      const t = k.topTicks(tira.x + 2.5, tira.x + tira.w - 2.5, 2.5, 5, tira.y + 0.4, 0.5, [1.4, 2.8], P);
      extra += L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" });
      const pl = { x: plan.x + plan.w - 52, y: plan.y + plan.d - 11, w: 34, d: 7, r: 0.8 };
      extra += S(k.slabOf(pl, 0, 0.6, P, 3), { tone: "lo", crease: "none" });
      extra += L([24, 17].map((w, i) => k.lineOnTop([pl.x + 3, pl.y + 2.4 + i * 2.4], [pl.x + 3 + w, pl.y + 2.4 + i * 2.4], 0.6, P)).join(""), { tone: "lo", free: true });
      extra += D([at([pl.x + pl.w - 2.5, pl.y + pl.d / 2, 0.6])], { size: 0.45 });
    }
    losa("base", plan, -grosor, grosor, { tono: "mid", bisel: 1.2, pasos: 8, nombre: "stand.banco", extra, sesgo: -40 });
  }

  /** Cierra la figura: ordena por profundidad real y devuelve SVG, HTML de la tarjeta y datos vivos. */
  function emitir({ id, fig, titulo, pista, leyenda, pie, etiqueta, lectura, permitir = {} }) {
    A.settle(R, P);
    R.items.sort((a, b) => a.key - b.key);
    const grupos = R.items.map((it, i) => {
      const [mx, my, mz] = it.move;
      return `<g class="it" data-piece="${it.piece}"${it.ride !== it.piece ? ` data-ride="${it.ride}"` : ""} data-k="${it.key.toFixed(2)}" data-m="${mx.toFixed(1)},${my.toFixed(1)},${mz.toFixed(1)}" data-i="${i}">${it.svg}</g>`;
    });
    const unidad = (v) => { const o = at([0, 0, 0]), p = at(v); return [+(p[0] - o[0]).toFixed(4), +(p[1] - o[1]).toFixed(4)]; };
    const svg = k.figureSvg({ width: ancho, height: alto, label: etiqueta, body: `${fondo.join("")}<g class="an-piezas">${grupos.join("")}</g>` });
    const botones = leyenda.map((p, i) => `<button type="button" class="an-parte" data-part="${p}"><span class="an-num">${String(i + 1).padStart(2, "0")}</span>${esc(piezas[p].nombre)}</button>`).join("");
    const html =
      `<figure class="iso-figure an-fig" data-fig="${id}"><div class="iso-plate"><div class="iso-plate-corners" aria-hidden="true">` +
      `<span class="iso-plate-corner" data-corner="fig">${esc(fig)}</span><span class="iso-plate-corner" data-corner="title">${esc(titulo)}</span>` +
      `<span class="iso-plate-corner" data-corner="readout" data-readout>${esc(lectura)}</span></div>` +
      `<div class="an-escenario" tabindex="0" role="slider" aria-label="${esc(etiqueta)} Pase el puntero o use las flechas para elegir una pieza; Espacio o un clic despieza y vuelve a montar." aria-valuemin="0" aria-valuemax="${leyenda.length}" aria-valuenow="0" aria-valuetext="Montado">${svg}</div>` +
      `<div class="an-controles"><button type="button" class="an-despiezar" data-despiezar><span class="an-lampara" aria-hidden="true"></span><span data-despiezar-texto>Despiezar</span></button><span class="an-pista">${esc(pista)}</span></div>` +
      `</div><figcaption class="iso-legend"><span class="an-partes">${botones}</span><span class="iso-caption">${esc(pie)}</span></figcaption></figure>`;
    const datos = {
      id, EX: unidad([1, 0, 0]), EY: unidad([0, 1, 0]), EZ: unidad([0, 0, 1]), V: V.map((x) => +x.toFixed(5)),
      piezas: Object.fromEntries(Object.entries(piezas).map(([p, v]) => [p, { nombre: v.nombre, dice: v.dice, ...(v.desvanece ? { desvanece: v.desvanece } : {}) }])),
      orden: leyenda, stagger: orden, spring: resorte, lectura,
    };
    return { id, titulo, html, datos, items: R.items.length, auditar: (opciones = {}) => A.auditOrExit(R, P, { ...permitir, ...opciones }) };
  }

  function auditar(opciones = {}) {
    return A.auditOrExit(R, P, opciones);
  }

  return { P, R, V, at, S, L, D, k, A, G, fondo, losa, caja, prisma, prismaEje, ventana, cil, disco, cable, item, cara, frente, lado, arriba, enCara, rect, hueco, agujeros, ranuras, tornillos, placa, leds, banco, emitir, auditar };
}
figura.semilla = 0;

function cascoConvexo(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const abajo = [], arriba = [];
  for (const q of p) { while (abajo.length >= 2 && cruz(abajo[abajo.length - 2], abajo[abajo.length - 1], q) <= 0) abajo.pop(); abajo.push(q); }
  for (const q of p.reverse()) { while (arriba.length >= 2 && cruz(arriba[arriba.length - 2], arriba[arriba.length - 1], q) <= 0) arriba.pop(); arriba.push(q); }
  return [...abajo.slice(0, -1), ...arriba.slice(0, -1)];
}

export const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
