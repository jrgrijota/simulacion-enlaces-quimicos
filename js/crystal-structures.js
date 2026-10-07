// ============================================================
// ESTRUCTURAS CRISTALINAS IÓNICAS
// ------------------------------------------------------------
// Datos y geometría (sin dependencias de p5) de las redes reales
// que forman los compuestos iónicos que se pueden construir en la
// simulación. Unidades de longitud: Å.
//
//  · Tipo NaCl (sal gema) ......... MX  (LiF, NaCl, KCl, MgO, CaS…)
//  · Tipo antifluorita ............ M₂X (Li₂O, Na₂O, Na₂S, K₂S…)
//  · Tipo fluorita ................ MX₂ (CaF₂)
//  · Tipo rutilo .................. MX₂ (MgF₂, MgH₂; CaCl₂ distorsionada)
//  · Tipo CdCl₂ (laminar) ......... MX₂ (MgCl₂)
// ============================================================

// Radios iónicos de Shannon (Å, índice de coordinación 6)
const IONIC_RADII = {
    Li: 0.76, Na: 1.02, K: 1.38, Mg: 0.72, Ca: 1.00,
    H:  1.40, F:  1.33, Cl: 1.81, O:  1.40, S:  1.84, N: 1.46,
};

const _SQRT2 = Math.SQRT2;
const _SQRT3 = Math.sqrt(3);

// Posiciones de una red FCC y de sus huecos (coordenadas fraccionarias)
const _FCC      = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
const _FCC_OCT  = [[0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5], [0.5, 0.5, 0.5]];
const _FCC_TET  = [];
for (const x of [0.25, 0.75]) for (const y of [0.25, 0.75]) for (const z of [0.25, 0.75]) _FCC_TET.push([x, y, z]);

// Aniones del rutilo (y = x) o de su variante deformada tipo CaCl₂ (y ≠ x)
function _rutileAnions(x, y = x) {
    return [[x, y, 0], [1 - x, 1 - y, 0], [0.5 + x, 0.5 - y, 0.5], [0.5 - x, 0.5 + y, 0.5]];
}

// ── Capas 2D ─────────────────────────────────────────────────
// Cada capa es un motivo rectangular (w × h, en Å) con posiciones
// fraccionarias (u, v) que se repite en uRange × vRange.
// La proporción catión:anión de la capa es la del compuesto.

// Cara del cubo de la red tipo NaCl: tablero de ajedrez.
function _layerRockSalt(a) {
    return {
        w: a, h: a,
        sites: [
            { u: 0,   v: 0,   kind: 'cat' }, { u: 0.5, v: 0.5, kind: 'cat' },
            { u: 0.5, v: 0,   kind: 'an'  }, { u: 0,   v: 0.5, kind: 'an'  },
        ],
        uRange: [0, 3], vRange: [0, 1.5],
    };
}

// Capa de la fluorita vista a lo largo de una arista del cubo (girada 45°):
// cada ion "central" (0,0) rodeado por 4 iones del otro tipo y cada uno
// de estos, entre 2 centrales. kindCenter es el ion con IC = 8.
function _layerFluorite(a, kindCenter) {
    const other = kindCenter === 'cat' ? 'an' : 'cat';
    const p = a / _SQRT2;
    return {
        w: p, h: p,
        sites: [
            { u: 0,   v: 0,   kind: kindCenter },
            { u: 0.5, v: 0,   kind: other },
            { u: 0,   v: 0.5, kind: other },
        ],
        uRange: [0, 3.5], vRange: [0, 1.5],
    };
}

// Rutilo proyectado a lo largo del eje c y girado 45°: las filas siguen la
// diagonal [110], perpendicular a un plano espejo del cristal, de modo que
// la cizalladura sigue un sistema de deslizamiento real ({110}<1-10>) y la
// red en reposo está en equilibrio por simetría. Cada posición guarda su
// altura real (z, fracción de c) para que la física use distancias 3D.
function _layerRutile(a, b, c, x, y) {
    const am = (a + b) / 2;
    const base = [
        { u: 0, v: 0, z: 0, kind: 'cat' }, { u: 0.5, v: 0.5, z: 0.5, kind: 'cat' },
        ..._rutileAnions(x, y).map(([u, v, z]) => ({ u, v, z, kind: 'an' })),
    ];
    // Celda girada: u' = (u + v)/2, v' = (v − u)/2 (fracciones de a√2)
    const eps = 1e-6, sites = [], seen = new Set();
    for (const p of base) for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
        let u = (p.u + i + p.v + j) / 2, v = (p.v + j - p.u - i) / 2;
        if (u < -eps || u >= 1 - eps || v < -eps || v >= 1 - eps) continue;
        u = Math.abs(u) < eps ? 0 : u; v = Math.abs(v) < eps ? 0 : v;
        const key = u.toFixed(4) + ',' + v.toFixed(4);
        if (seen.has(key)) continue;
        seen.add(key);
        sites.push({ u, v, z: p.z, kind: p.kind });
    }
    return {
        w: am * _SQRT2, h: am * _SQRT2,
        depth: c,
        sites,
        // Rango elegido para que la capa tenga exactamente 1 catión : 2 aniones
        uRange: [-0.32, 1.68], vRange: [-0.32, 0.68],
    };
}

// CdCl₂ visto de canto (proyección a lo largo de a₁ + a₂): láminas X–M–X
// separadas por huecos. z es la profundidad real (fracción de a); al avanzar
// un periodo a lo largo de la capa la profundidad se desplaza ½ (depthShift).
function _layerCdCl2(a, c) {
    return {
        w: a * _SQRT3 / 2, h: c,
        depth: a, depthShift: 0.5,
        sites: [
            { u: 0,     v: 0,      z: 0,   kind: 'cat' },
            { u: 1 / 3, v: 1 / 3,  z: 0.5, kind: 'cat' },
            { u: 2 / 3, v: 2 / 3,  z: 0.5, kind: 'cat' },
            { u: 1 / 3, v: 1 / 12, z: 0.5, kind: 'an' }, { u: 2 / 3, v: 11 / 12, z: 0.5, kind: 'an' },
            { u: 0,     v: 3 / 12, z: 0,   kind: 'an' }, { u: 2 / 3, v: 5 / 12,  z: 0.5, kind: 'an' },
            { u: 1 / 3, v: 7 / 12, z: 0.5, kind: 'an' }, { u: 0,     v: 9 / 12,  z: 0,   kind: 'an' },
        ],
        uRange: [0, 6], vRange: [-1 / 12, 9 / 12],
    };
}

// ── Tipos de estructura ──────────────────────────────────────
// build(rc, ra, params) → { cellType, a, c, sites3D, range3D, layer }
const CRYSTAL_STRUCTURE_TYPES = {
    rocksalt: {
        name: 'Tipo cloruro de sodio',
        lattice: 'Red cúbica centrada en las caras (FCC)',
        cn: { cat: 6, an: 6 },
        build(rc, ra) {
            const a = 2 * (rc + ra);
            return {
                cellType: 'cubic', a, c: a,
                sites3D: [
                    ..._FCC.map(f => ({ f, kind: 'cat' })),
                    ..._FCC_OCT.map(f => ({ f, kind: 'an' })),
                ],
                range3D: [[0, 1], [0, 1], [0, 1]],
                layer: _layerRockSalt(a),
            };
        },
    },
    antifluorite: {
        name: 'Tipo antifluorita',
        lattice: 'Red cúbica centrada en las caras (FCC) de aniones',
        cn: { cat: 4, an: 8 },
        build(rc, ra) {
            const a = 4 * (rc + ra) / _SQRT3;
            return {
                cellType: 'cubic', a, c: a,
                sites3D: [
                    ..._FCC.map(f => ({ f, kind: 'an' })),
                    ..._FCC_TET.map(f => ({ f, kind: 'cat' })),
                ],
                range3D: [[0, 1], [0, 1], [0, 1]],
                layer: _layerFluorite(a, 'an'),
            };
        },
    },
    fluorite: {
        name: 'Tipo fluorita',
        lattice: 'Red cúbica centrada en las caras (FCC) de cationes',
        cn: { cat: 8, an: 4 },
        build(rc, ra) {
            const a = 4 * (rc + ra) / _SQRT3;
            return {
                cellType: 'cubic', a, c: a,
                sites3D: [
                    ..._FCC.map(f => ({ f, kind: 'cat' })),
                    ..._FCC_TET.map(f => ({ f, kind: 'an' })),
                ],
                range3D: [[0, 1], [0, 1], [0, 1]],
                layer: _layerFluorite(a, 'cat'),
            };
        },
    },
    rutile: {
        name: 'Tipo rutilo',
        lattice: 'Red tetragonal',
        cn: { cat: 6, an: 3 },
        build(rc, ra, p) {
            // p.b / p.y solo en la variante deformada (CaCl₂, ortorrómbica)
            const a = p.a, b = p.b || p.a, c = p.c, x = p.x, y = p.y || p.x;
            return {
                cellType: b === a ? 'tetragonal' : 'orthorhombic', a, b, c,
                sites3D: [
                    { f: [0, 0, 0], kind: 'cat' }, { f: [0.5, 0.5, 0.5], kind: 'cat' },
                    ..._rutileAnions(x, y).map(f => ({ f, kind: 'an' })),
                ],
                range3D: [[0, 1], [0, 1], [0, 1]],
                layer: _layerRutile(a, b, c, x, y),
            };
        },
    },
    cacl2: {
        name: 'Tipo cloruro de calcio (rutilo deformado)',
        lattice: 'Red ortorrómbica',
        cn: { cat: 6, an: 3 },
        build(rc, ra, p) {
            const geo = CRYSTAL_STRUCTURE_TYPES.rutile.build(rc, ra, p);
            // La capa 2D usa el rutilo ideal equivalente: con la deformación
            // real, el modelo plano de la cizalladura no tiene equilibrio estable
            const am = (p.a + p.b) / 2, xm = (p.x + p.y) / 2;
            geo.layer = _layerRutile(am, am, p.c, xm, xm);
            geo.layerNote = 'La capa 2D se dibuja como un rutilo sin deformar.';
            return geo;
        },
    },
    cdcl2: {
        name: 'Tipo cloruro de cadmio (laminar)',
        lattice: 'Láminas de iones apiladas',
        cn: { cat: 6, an: 3 },
        build(rc, ra, p) {
            const a = p.a, c = p.c;
            // R-3m (ejes hexagonales): M en 3a (0,0,0); X en 6c (0,0,±¼)
            const base = [
                { f: [0, 0, 0],     kind: 'cat' },
                { f: [0, 0, 0.25],  kind: 'an' },
                { f: [0, 0, -0.25], kind: 'an' },
            ];
            const sites3D = [];
            for (const t of [[0, 0, 0], [2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 2 / 3]]) {
                for (const s of base) {
                    sites3D.push({ f: s.f.map((v, i) => v + t[i]), kind: s.kind });
                }
            }
            return {
                cellType: 'hexagonal', a, c, sites3D,
                layered: true, // láminas neutras unidas por fuerzas de van der Waals
                // Dos láminas completas X–M–X con el hueco entre ellas
                range3D: [[0, 2], [0, 2], [-1 / 12, 5 / 12]],
                layer: _layerCdCl2(a, c),
            };
        },
    },
};

// Compuestos con estructura no derivable de la proporción (Å)
const _SPECIAL_STRUCTURES = {
    MgF2:  { type: 'rutile', params: { a: 4.62, c: 3.05, x: 0.303 } },
    MgH2:  { type: 'rutile', params: { a: 4.50, c: 3.01, x: 0.304 } },
    CaCl2: { type: 'cacl2',  params: { a: 6.24, b: 6.43, c: 4.17, x: 0.275, y: 0.325 } },
    MgCl2: { type: 'cdcl2',  params: { a: 3.64, c: 17.67 } },
    CaH2:  { type: 'fluorite', approx: true,
             note: 'Su red real es más compleja; se muestra una red tipo fluorita como aproximación.' },
};

function _gcd(a, b) { return b ? _gcd(b, a % b) : a; }

// Elige la estructura cristalina real del compuesto.
//   cations / anions: [{ sym, charge }] (uno por átomo de la fórmula)
// Devuelve null si la proporción no corresponde a ninguna red conocida.
function selectIonicStructure(cations, anions) {
    if (!cations.length || !anions.length) return null;
    const g    = _gcd(cations.length, anions.length);
    const nCat = cations.length / g, nAn = anions.length / g;
    const cat  = cations[0], an = anions[0];
    const mixed = cations.some(c => c.sym !== cat.sym) || anions.some(a => a.sym !== an.sym);

    let typeId, params = {}, approx = false, note = '';
    const formula = cat.sym + (nCat > 1 ? nCat : '') + an.sym + (nAn > 1 ? nAn : '');
    const special = _SPECIAL_STRUCTURES[formula];
    if (special && !mixed) {
        typeId = special.type;
        params = special.params || {};
        approx = !!special.approx;
        note   = special.note || '';
    } else if (nCat === 1 && nAn === 1) typeId = 'rocksalt';
    else if (nCat === 2 && nAn === 1)   typeId = 'antifluorite';
    else if (nCat === 1 && nAn === 2)   typeId = 'fluorite';
    else return null;

    if (mixed) {
        approx = true;
        note   = 'Compuesto con iones distintos del mismo signo: se representa la red con un solo tipo de catión y de anión.';
    }

    const type = CRYSTAL_STRUCTURE_TYPES[typeId];
    const rc   = IONIC_RADII[cat.sym] || 1.0;
    const ra   = IONIC_RADII[an.sym]  || 1.6;
    const geo  = type.build(rc, ra, params);
    return {
        id: typeId, name: type.name, lattice: type.lattice,
        cn: type.cn, approx, note,
        ratio: { cat: nCat, an: nAn },
        cat: { sym: cat.sym, charge: cat.charge, radius: rc },
        an:  { sym: an.sym,  charge: an.charge,  radius: ra },
        ...geo,
    };
}

// ── Geometría 3D ─────────────────────────────────────────────
function _cellVectors(s) {
    if (s.cellType === 'hexagonal') {
        return [[s.a, 0, 0], [-s.a / 2, s.a * _SQRT3 / 2, 0], [0, 0, s.c]];
    }
    return [[s.a, 0, 0], [0, s.b || s.a, 0], [0, 0, s.c]];
}

function _fracToCart(f, V) {
    return [0, 1, 2].map(i => f[0] * V[0][i] + f[1] * V[1][i] + f[2] * V[2][i]);
}

// Genera los iones de la región visible (celda unidad o bloque de láminas),
// las aristas de la celda y los enlaces entre vecinos más próximos.
// Coordenadas cartesianas centradas en el origen; z = eje vertical (c).
function buildCrystal3D(s) {
    const V   = _cellVectors(s);
    const R   = s.range3D;
    const eps = 1e-6;
    const ions = [];
    const seen = new Set();
    for (const site of s.sites3D) {
        const shifts = [0, 1, 2].map(i => {
            const out = [];
            for (let n = Math.floor(R[i][0] - site.f[i]) - 1; n <= Math.ceil(R[i][1] - site.f[i]) + 1; n++) {
                const v = site.f[i] + n;
                if (v >= R[i][0] - eps && v <= R[i][1] + eps) out.push(v);
            }
            return out;
        });
        for (const x of shifts[0]) for (const y of shifts[1]) for (const z of shifts[2]) {
            const key = [x, y, z].map(v => v.toFixed(4)).join(',');
            if (seen.has(key)) continue;
            seen.add(key);
            const [cx, cy, cz] = _fracToCart([x, y, z], V);
            ions.push({ x: cx, y: cy, z: cz, kind: site.kind, frac: [x, y, z] });
        }
    }

    // Centrar en el origen
    const ctr = _fracToCart(R.map(r => (r[0] + r[1]) / 2), V);
    for (const p of ions) { p.x -= ctr[0]; p.y -= ctr[1]; p.z -= ctr[2]; }

    // Enlaces catión–anión a la distancia de vecinos más próximos
    let dMin = Infinity;
    const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    for (const p of ions) if (p.kind === 'cat') for (const q of ions) {
        if (q.kind === 'an') dMin = Math.min(dMin, dist(p, q));
    }
    const bonds = [];
    for (let i = 0; i < ions.length; i++) for (let j = i + 1; j < ions.length; j++) {
        if (ions[i].kind === ions[j].kind) continue;
        if (dist(ions[i], ions[j]) <= dMin * 1.12) bonds.push([i, j]);
    }

    // Aristas del paralelepípedo visible
    const corners = [];
    for (const i of [0, 1]) for (const j of [0, 1]) for (const k of [0, 1]) {
        const [cx, cy, cz] = _fracToCart([R[0][i], R[1][j], R[2][k]], V);
        corners.push([cx - ctr[0], cy - ctr[1], cz - ctr[2]]);
    }
    const edges = [];
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
        const d = (i ^ j);
        if (d === 1 || d === 2 || d === 4) edges.push([corners[i], corners[j]]);
    }

    let radius = 0;
    for (const p of ions) radius = Math.max(radius, Math.hypot(p.x, p.y, p.z));
    return { ions, bonds, edges, dMin, radius };
}

// ── Capa 2D ──────────────────────────────────────────────────
// Devuelve los iones de la capa (x a la derecha, y hacia abajo, en Å),
// las filas ordenadas y la distancia catión–anión mínima.
function buildCrystalLayer(s) {
    const L = s.layer;
    const eps = 1e-6;
    const ions = [];
    const seen = new Set();
    for (const site of L.sites) {
        for (let i = Math.floor(L.uRange[0]) - 1; i <= Math.ceil(L.uRange[1]) + 1; i++) {
            for (let j = Math.floor(L.vRange[0]) - 1; j <= Math.ceil(L.vRange[1]) + 1; j++) {
                const u = site.u + i, v = site.v + j;
                if (u < L.uRange[0] - eps || u > L.uRange[1] + eps) continue;
                if (v < L.vRange[0] - eps || v > L.vRange[1] + eps) continue;
                const key = u.toFixed(4) + ',' + v.toFixed(4);
                if (seen.has(key)) continue;
                seen.add(key);
                ions.push({ x: (u - L.uRange[0]) * L.w, y: (v - L.vRange[0]) * L.h, kind: site.kind });
            }
        }
    }
    const width  = (L.uRange[1] - L.uRange[0]) * L.w;
    const height = (L.vRange[1] - L.vRange[0]) * L.h;

    // Filas (posiciones y distintas)
    const ys = [...new Set(ions.map(p => p.y.toFixed(3)))].map(Number).sort((a, b) => a - b);
    for (const p of ions) p.row = ys.findIndex(y => Math.abs(y - p.y) < 2e-3);

    let dMin = Infinity;
    for (const p of ions) if (p.kind === 'cat') for (const q of ions) {
        if (q.kind === 'an') dMin = Math.min(dMin, Math.hypot(p.x - q.x, p.y - q.y));
    }

    // Carga por periodo de cada fila (para cortar solo entre bloques neutros)
    const qOf = kind => (kind === 'cat' ? s.cat.charge : s.an.charge);
    const rowQ = ys.map(() => 0);
    for (const site of L.sites) {
        for (let j = Math.floor(L.vRange[0]) - 1; j <= Math.ceil(L.vRange[1]) + 1; j++) {
            const v = site.v + j;
            if (v < L.vRange[0] - eps || v > L.vRange[1] + eps) continue;
            const y = (v - L.vRange[0]) * L.h;
            rowQ[ys.findIndex(yy => Math.abs(yy - y) < 2e-3)] += qOf(site.kind);
        }
    }
    const shear = _findShearPlane(ions, ys, L.w, dMin, rowQ);
    return { ions, rowYs: ys, width, height, dMin, period: L.w, shear };
}

// Plano de cizalladura: entre los cortes que dejan dos bloques neutros, el
// hueco más ancho entre filas (el más centrado en caso de empate). Desplazamiento: el que deja iones de igual carga lo más
// cerca posible a ambos lados del plano.
function _findShearPlane(ions, ys, period, dMin, rowQ) {
    if (ys.length < 2) return null;
    const mid = (ys[0] + ys[ys.length - 1]) / 2;
    let best = 0, bestGap = -1, bestDist = Infinity, qTop = 0;
    for (let k = 0; k < ys.length - 1; k++) {
        qTop += rowQ[k];
        if (qTop !== 0) continue; // el bloque superior debe ser neutro
        const gap = ys[k + 1] - ys[k];
        const dMid = Math.abs((ys[k] + ys[k + 1]) / 2 - mid);
        if (gap > bestGap + 0.02 || (Math.abs(gap - bestGap) <= 0.02 && dMid < bestDist)) {
            best = k; bestGap = gap; bestDist = dMid;
        }
    }
    const splitRow = best; // filas 0..splitRow forman el bloque superior
    const top = ions.filter(p => p.row <= splitRow);
    const bot = ions.filter(p => p.row >  splitRow);

    // Solo importan las filas que bordean el plano y sus vecinas
    const near = (p) => Math.abs(p.y - (ys[splitRow] + ys[splitRow + 1]) / 2) < 2.5 * dMin;
    const topN = top.filter(near), botN = bot.filter(near);

    let bestShift = period / 2, bestLike = Infinity;
    const steps = 48;
    for (let s = 1; s < steps; s++) {
        const shift = (s / steps) * period;
        let dLike = Infinity;
        for (const p of topN) for (const q of botN) {
            if (p.kind !== q.kind) continue;
            // distancia horizontal mínima considerando la periodicidad
            let dx = (p.x + shift - q.x) % period;
            if (dx < 0) dx += period;
            dx = Math.min(dx, period - dx);
            dLike = Math.min(dLike, Math.hypot(dx, p.y - q.y));
        }
        if (dLike < bestLike - 1e-6) { bestLike = dLike; bestShift = shift; }
    }
    return {
        splitRow,
        planeY: (ys[splitRow] + ys[splitRow + 1]) / 2,
        shift: bestShift,
    };
}
