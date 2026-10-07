// ============================================================
// CRISTALES COVALENTES Y MOLECULARES
// ------------------------------------------------------------
// Datos y geometría (sin dependencias de p5) de los cristales que
// muestra el enlace covalente. Unidades de longitud: Å.
//
//  · Diamante (C) ........ red covalente 3D: cada C unido a 4 C
//  · Grafito (C) ......... láminas covalentes unidas por fuerzas débiles
//  · Sílice, SiO₂ ........ red covalente 3D: cada Si unido a 4 O
//                          (β-cristobalita idealizada)
//  · Hielo seco, CO₂ ..... cristal molecular: moléculas O=C=O unidas
//                          por fuerzas intermoleculares débiles
// ============================================================

const COV_SPECIES = {
    C:  { sym: 'C',  color: '#A8A29E', label: 'carbono' },
    Si: { sym: 'Si', color: '#C4B5FD', label: 'silicio' },
    O:  { sym: 'O',  color: '#FB923C', label: 'oxígeno' },
};

const _FCC_C = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
const _TETRA_DIRS = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];

// Sitios del diamante: FCC + FCC desplazada (¼, ¼, ¼)
function _diamondSites(sp) {
    return [
        ..._FCC_C.map(f => ({ f, sp })),
        ..._FCC_C.map(f => ({ f: f.map(v => v + 0.25), sp })),
    ];
}

const COVALENT_CRYSTALS = {
    diamond: {
        name: 'Diamante',
        formula: 'C',
        kind: 'network',
        cell: 'cubic', a: 3.567,
        sites: _diamondSites('C'),
        range: [[0, 1], [0, 1], [0, 1]],
        radii: { C: 0.36 },
        bonds: [{ a: 'C', b: 'C', max: 1.7 }],
        cn: 'Cada átomo de C está unido a <b>4 C</b> formando un tetraedro.',
        bondText: 'Todo el cristal es una única red de enlaces covalentes en las tres direcciones.',
        props: ['El material natural más duro', 'No conduce la electricidad', 'Punto de fusión ≈ 3550 °C'],
        transition: { T: 3550, verb: 'funde' },
        conducts: false,
    },
    graphite: {
        name: 'Grafito',
        formula: 'C',
        kind: 'layered',
        cell: 'hexagonal', a: 2.464, c: 6.711,
        sites: [
            { f: [0, 0, 0.25], sp: 'C' }, { f: [0, 0, 0.75], sp: 'C' },
            { f: [1 / 3, 2 / 3, 0.25], sp: 'C' }, { f: [2 / 3, 1 / 3, 0.75], sp: 'C' },
        ],
        // Tres láminas
        range: [[0, 3], [0, 3], [0.25, 1.25]],
        radii: { C: 0.34 },
        bonds: [
            { a: 'C', b: 'C', max: 1.5 },
            // Entre láminas: solo fuerzas débiles (se dibujan discontinuas)
            { a: 'C', b: 'C', min: 3.3, max: 3.4, weak: true },
        ],
        pitch: 0.55,
        cn: 'Cada átomo de C está unido a <b>3 C</b> formando hexágonos en láminas planas.',
        bondText: 'Las láminas están unidas entre sí solo por fuerzas débiles (líneas discontinuas).',
        props: ['Blando: las láminas se separan (por eso escribe un lápiz)',
                'Conduce la electricidad: el 4.º electrón de cada C se mueve por la lámina',
                'Sublima a ≈ 3650 °C'],
        transition: { T: 3650, verb: 'sublima' },
        conducts: true,
    },
    silica: {
        name: 'Sílice (SiO₂)',
        formula: 'SiO₂',
        kind: 'network',
        cell: 'cubic', a: 7.16,
        sites: [
            ..._diamondSites('Si'),
            // Un O en el punto medio de cada enlace Si–Si del diamante
            ..._FCC_C.flatMap(f => _TETRA_DIRS.map(d => ({ f: f.map((v, i) => v + d[i] / 8), sp: 'O' }))),
        ],
        range: [[0, 1], [0, 1], [0, 1]],
        radii: { Si: 0.46, O: 0.4 },
        bonds: [{ a: 'Si', b: 'O', max: 1.8 }],
        cn: 'Cada Si está unido a <b>4 O</b> (tetraedro) y cada O a <b>2 Si</b>.',
        bondText: 'SiO₂ indica la proporción de átomos: no hay moléculas, todo es una red covalente.',
        props: ['Muy duro (raya el vidrio)', 'No conduce la electricidad', 'Punto de fusión ≈ 1713 °C'],
        transition: { T: 1713, verb: 'funde' },
        conducts: false,
        note: 'Se muestra la cristobalita, una forma de la sílice más sencilla que el cuarzo; las dos están formadas por los mismos tetraedros SiO₄.',
    },
    dryice: {
        name: 'Hielo seco (CO₂ sólido)',
        formula: 'CO₂',
        kind: 'molecular',
        cell: 'cubic', a: 5.624,
        // Moléculas O=C=O centradas en una red FCC, orientadas según las
        // diagonales del cubo (grupo Pa-3, x = 0.1185)
        molecules: [
            { c: [0, 0, 0],     axis: [1, 1, 1] },
            { c: [0.5, 0.5, 0], axis: [1, -1, -1] },
            { c: [0.5, 0, 0.5], axis: [-1, -1, 1] },
            { c: [0, 0.5, 0.5], axis: [-1, 1, -1] },
        ],
        molX: 0.1185,
        range: [[0, 1], [0, 1], [0, 1]],
        radii: { C: 0.42, O: 0.48 },
        bonds: [{ a: 'C', b: 'O', max: 1.3, double: true }],
        // Fuerzas intermoleculares entre moléculas vecinas (centros a a/√2)
        molBondMax: 4.1,
        cn: 'Cada C está unido a <b>2 O</b> por enlaces dobles: moléculas O=C=O.',
        bondText: 'Las moléculas no están enlazadas entre sí: las mantienen juntas fuerzas intermoleculares débiles (líneas discontinuas).',
        props: ['Blando', 'No conduce la electricidad', 'Sublima a −78 °C: pasa de sólido a gas sin fundir'],
        transition: { T: -78, verb: 'sublima' },
        conducts: false,
    },
};

function _covCellVectors(d) {
    if (d.cell === 'hexagonal') {
        return [[d.a, 0, 0], [-d.a / 2, d.a * Math.sqrt(3) / 2, 0], [0, 0, d.c]];
    }
    return [[d.a, 0, 0], [0, d.a, 0], [0, 0, d.a]];
}

function _covToCart(f, V) {
    return [0, 1, 2].map(i => f[0] * V[0][i] + f[1] * V[1][i] + f[2] * V[2][i]);
}

// Átomos de la región R (rango fraccionario por eje), sin centrar.
// En los cristales moleculares se incluyen moléculas completas cuyo centro
// esté en la región.
function _covAtoms(d, R) {
    const V = _covCellVectors(d);
    const eps = 1e-6;
    const inR = f => f.every((v, i) => v >= R[i][0] - eps && v <= R[i][1] + eps);
    const images = f => {
        const out = [];
        const lo = R.map((r, i) => Math.floor(r[0] - f[i]) - 1);
        const hi = R.map((r, i) => Math.ceil(r[1] - f[i]) + 1);
        for (let a = lo[0]; a <= hi[0]; a++) for (let b = lo[1]; b <= hi[1]; b++) for (let c = lo[2]; c <= hi[2]; c++) {
            const g = [f[0] + a, f[1] + b, f[2] + c];
            if (inR(g)) out.push(g);
        }
        return out;
    };
    const atoms = [];
    const seen = new Set();
    const add = (f, sp, mol) => {
        const key = f.map(v => v.toFixed(4)).join(',');
        if (seen.has(key)) return;
        seen.add(key);
        const [x, y, z] = _covToCart(f, V);
        atoms.push({ x, y, z, sp, mol });
    };
    if (d.molecules) {
        let mol = 0;
        for (const m of d.molecules) {
            for (const c of images(m.c)) {
                add(c, 'C', mol);
                for (const s of [1, -1]) add(c.map((v, i) => v + s * d.molX * m.axis[i]), 'O', mol);
                mol++;
            }
        }
    } else {
        for (const site of d.sites) for (const f of images(site.f)) add(f, site.sp);
    }
    return { atoms, V };
}

function _covBondRule(d, p, q) {
    const r = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    for (const rule of d.bonds) {
        const pair = (p.sp === rule.a && q.sp === rule.b) || (p.sp === rule.b && q.sp === rule.a);
        if (pair && r <= rule.max && r >= (rule.min || 0)) {
            // Las uniones débiles del grafito son entre láminas (casi verticales)
            if (rule.weak && Math.abs(p.z - q.z) < 0.9 * r) continue;
            return { r, weak: !!rule.weak, double: !!rule.double };
        }
    }
    return null;
}

// Escena para el visor 3D (js/crystal-3d.js)
function buildCovalentScene(id) {
    const d = COVALENT_CRYSTALS[id];
    const { atoms, V } = _covAtoms(d, d.range);

    // Centrar en el origen
    const ctr = _covToCart(d.range.map(r => (r[0] + r[1]) / 2), V);
    for (const p of atoms) { p.x -= ctr[0]; p.y -= ctr[1]; p.z -= ctr[2]; }

    const bonds = [];
    for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
        const b = _covBondRule(d, atoms[i], atoms[j]);
        if (b) bonds.push({ i, j, d0: b.r, weak: b.weak, double: b.double });
    }
    // Cristal molecular: fuerzas intermoleculares entre centros de moléculas vecinas
    if (d.molecules) {
        const centers = atoms.map((p, i) => i).filter(i => atoms[i].sp === 'C');
        for (let a = 0; a < centers.length; a++) for (let b = a + 1; b < centers.length; b++) {
            const p = atoms[centers[a]], q = atoms[centers[b]];
            const r = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
            if (r <= d.molBondMax) bonds.push({ i: centers[a], j: centers[b], d0: r, weak: true });
        }
    }

    // Aristas de la región
    const R = d.range;
    const corners = [];
    for (const i of [0, 1]) for (const j of [0, 1]) for (const k of [0, 1]) {
        const c = _covToCart([R[0][i], R[1][j], R[2][k]], V);
        corners.push([c[0] - ctr[0], c[1] - ctr[1], c[2] - ctr[2]]);
    }
    const edges = [];
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
        const x = i ^ j;
        if (x === 1 || x === 2 || x === 4) edges.push([corners[i], corners[j]]);
    }

    let radius = 0;
    for (const p of atoms) radius = Math.max(radius, Math.hypot(p.x, p.y, p.z));

    const species = {};
    for (const p of atoms) {
        if (!species[p.sp]) species[p.sp] = Object.assign({ r: d.radii[p.sp] }, COV_SPECIES[p.sp]);
    }

    let ext = null;
    const scene = {
        atoms, bonds, edges, radius, species,
        legend: Object.keys(species),
        unit: 'átomo',
        pitch: d.pitch !== undefined ? d.pitch : 0.38,
        // Vecinos enlazados que quedan fuera de la región (región ampliada)
        ghosts(idx) {
            if (!ext) {
                ext = _covAtoms(d, R.map(r => [r[0] - 1, r[1] + 1])).atoms;
                for (const p of ext) { p.x -= ctr[0]; p.y -= ctr[1]; p.z -= ctr[2]; }
            }
            return sceneGhosts(scene, ext, idx, (a, q) => {
                const b = _covBondRule(d, a, q);
                return b && !b.weak;
            });
        },
    };
    return scene;
}
