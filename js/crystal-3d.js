// ============================================================
// VISOR 3D DE CRISTALES
// ------------------------------------------------------------
// Proyección en perspectiva dibujada sobre el canvas 2D de p5
// (sin WEBGL): esferas sombreadas ordenadas por profundidad,
// enlaces y aristas de la celda. Se gira arrastrando; un clic
// en una partícula resalta su entorno.
//
// El visor dibuja una "escena" genérica:
//   atoms   [{ x, y, z, sp, ox?, oy?, oz? }]  (Å; z vertical;
//           o* = desplazamiento opcional, p. ej. vibración térmica)
//   bonds   [{ i, j, d0, weak? }]   weak: unión débil (discontinua)
//   edges   [[p, q]]                aristas de la celda
//   species { clave: { sym, sup, color, r, label } }  r: radio dibujado (Å)
//   legend  [claves]   unit: 'ion' | 'átomo'   pitch: inclinación inicial
//   radius  radio de la región   ghosts(i): vecinos fuera de la región
// Lo usan el enlace iónico (red cristalina) y el covalente
// (cristales covalentes y moleculares).
// ============================================================

let crystal3DScene      = null;
let crystal3DYaw        = -0.55;
let crystal3DPitch      = 0.38;
let crystal3DAutoRotate = true;
let crystal3DDrag       = null;   // { x, y, moved } mientras se arrastra
let crystal3DSelected   = -1;     // partícula resaltada (-1: ninguna)
let crystal3DGhosts     = [];     // vecinos de la resaltada fuera de la región
let crystal3DProj       = [];     // proyección del último fotograma (para clics)
let crystal3DCam        = null;   // cámara del último fotograma
let elChkAutoRotate     = null;

function setCrystal3DScene(scene) {
    crystal3DScene    = scene;
    crystal3DYaw      = -0.55;
    crystal3DPitch    = scene.pitch !== undefined ? scene.pitch : 0.38;
    crystal3DSelected = -1;
    crystal3DGhosts   = [];
    crystal3DProj     = [];
    crystal3DDrag     = null;
}

// Carga como superíndice Unicode: 2 → ²⁺, -1 → ⁻
function chargeSuperscript(q) {
    const abs = Math.abs(q);
    return (abs > 1 ? '⁰¹²³⁴⁵⁶⁷⁸⁹'[abs] : '') + (q > 0 ? '⁺' : '⁻');
}

// ── Proyección ────────────────────────────────────────────────
function _crystal3DCamera() {
    const sc = crystal3DScene;
    const btmReserve = 66;
    let rMax = 0;
    for (const k in sc.species) rMax = Math.max(rMax, sc.species[k].r);
    const ext   = sc.radius + rMax;
    const D     = ext * 4;                       // distancia de la cámara
    const avail = min(width * 0.92, (height - btmReserve) * 1.0);
    return {
        cx: width / 2,
        cy: (height - btmReserve) / 2 + 6,
        scale: (avail / (2 * ext)) * (D - ext) / D, // el punto más cercano cabe
        D,
        cy_: cos(crystal3DYaw), sy_: sin(crystal3DYaw),
        cp: cos(crystal3DPitch), sp: sin(crystal3DPitch),
    };
}

// x, y, z (Å; z vertical) → { sx, sy, depth, f }
function _crystal3DProject(x, y, z, cam) {
    const x1 = x * cam.cy_ - y * cam.sy_;
    const y1 = x * cam.sy_ + y * cam.cy_;
    const depth = y1 * cam.cp + z * cam.sp;     // > 0: más lejos
    const up    = z * cam.cp - y1 * cam.sp;
    const f     = cam.D / (cam.D + depth);
    return { sx: cam.cx + x1 * cam.scale * f, sy: cam.cy - up * cam.scale * f, depth, f };
}

function _atomPos(p) {
    return [p.x + (p.ox || 0), p.y + (p.oy || 0), p.z + (p.oz || 0)];
}

// ── Bucle de dibujo ───────────────────────────────────────────
function drawCrystal3D() {
    const sc = crystal3DScene;
    if (!sc) return;
    if (crystal3DAutoRotate && !crystal3DDrag) crystal3DYaw += 0.0045;

    const cam   = crystal3DCam = _crystal3DCamera();
    const atoms = sc.atoms;
    const ext   = sc.radius;
    crystal3DProj = atoms.map(p => { const [x, y, z] = _atomPos(p); return _crystal3DProject(x, y, z, cam); });

    // Entorno resaltado: la partícula elegida y sus vecinas (enlaces fuertes)
    const hasSel = crystal3DSelected >= 0;
    const inEnv  = new Set();
    if (hasSel) {
        inEnv.add(crystal3DSelected);
        for (const b of sc.bonds) {
            if (b.weak) continue;
            if (b.i === crystal3DSelected) inEnv.add(b.j);
            if (b.j === crystal3DSelected) inEnv.add(b.i);
        }
    }
    // Atenuación por profundidad (las partículas del fondo se ven más apagadas)
    const shade = d => map(d, -ext, ext, 1, 0.45, true);

    // Aristas de la celda (detrás de todo, discontinuas)
    stroke(148, 163, 184, 70);
    strokeWeight(1.2);
    drawingContext.setLineDash([5, 5]);
    for (const [a, b] of sc.edges) {
        const pa = _crystal3DProject(a[0], a[1], a[2], cam);
        const pb = _crystal3DProject(b[0], b[1], b[2], cam);
        line(pa.sx, pa.sy, pb.sx, pb.sy);
    }
    drawingContext.setLineDash([]);

    // Enlaces y esferas, del fondo hacia delante
    const items = [];
    for (const b of sc.bonds) {
        // Un enlace estirado se debilita y acaba desapareciendo (se rompe)
        let k = 1;
        if (b.d0 && (atoms[b.i].ox !== undefined || atoms[b.j].ox !== undefined)) {
            const pa = _atomPos(atoms[b.i]), pb = _atomPos(atoms[b.j]);
            const s = Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]) / b.d0;
            k = constrain(map(s, 1.12, 1.4, 1, 0), 0, 1);
        }
        if (k <= 0) continue;
        items.push({ type: 'bond', b, k, depth: (crystal3DProj[b.i].depth + crystal3DProj[b.j].depth) / 2 + 0.01 });
    }
    for (let i = 0; i < atoms.length; i++) items.push({ type: 'atom', i, depth: crystal3DProj[i].depth });
    for (const g of crystal3DGhosts) {
        items.push({ type: 'ghost', g, p: _crystal3DProject(g.x, g.y, g.z, cam), depth: 0 });
        items[items.length - 1].depth = items[items.length - 1].p.depth;
    }
    items.sort((a, b) => b.depth - a.depth);

    const selP = hasSel ? crystal3DProj[crystal3DSelected] : null;
    for (const it of items) {
        if (it.type === 'bond') {
            const { b } = it;
            const pa = crystal3DProj[b.i], pb = crystal3DProj[b.j];
            const lit = hasSel && !b.weak && (b.i === crystal3DSelected || b.j === crystal3DSelected);
            const k = shade(it.depth) * it.k;
            if (b.weak) {
                stroke(148, 163, 184, (hasSel ? 25 : 90) * k);
                strokeWeight(1.2 * pa.f);
                drawingContext.setLineDash([3, 4]);
                line(pa.sx, pa.sy, pb.sx, pb.sy);
                drawingContext.setLineDash([]);
            } else if (lit) {
                stroke(251, 191, 36, 230 * it.k); strokeWeight(3.2 * pa.f);
                _bondLine(pa, pb, b.double);
            } else {
                stroke(203, 213, 225, (hasSel ? 40 : 150) * k); strokeWeight(2.4 * pa.f);
                _bondLine(pa, pb, b.double);
            }
        } else if (it.type === 'ghost') {
            stroke(251, 191, 36, 200);
            strokeWeight(3.2 * it.p.f);
            line(selP.sx, selP.sy, it.p.sx, it.p.sy);
            _drawCrystal3DSphere(it.p, it.g.sp, 0.9, 0.35, true);
        } else {
            const dim = hasSel && !inEnv.has(it.i) ? 0.18 : 1;
            _drawCrystal3DSphere(crystal3DProj[it.i], atoms[it.i].sp, shade(it.depth), dim, false);
        }
    }

    // Anillo sobre la partícula elegida
    if (hasSel) {
        const r = sc.species[atoms[crystal3DSelected].sp].r * cam.scale * selP.f;
        noFill(); stroke(251, 191, 36, 220); strokeWeight(2);
        drawingContext.setLineDash([4, 3]);
        circle(selP.sx, selP.sy, r * 2 + 12);
        drawingContext.setLineDash([]);
    }

    _drawCrystal3DHud(hasSel);
}

// Enlace simple o doble (dos líneas paralelas en pantalla)
function _bondLine(pa, pb, double) {
    if (!double) { line(pa.sx, pa.sy, pb.sx, pb.sy); return; }
    const dx = pb.sx - pa.sx, dy = pb.sy - pa.sy, L = Math.hypot(dx, dy) || 1;
    const o = 2.6 * pa.f, nx = -dy / L * o, ny = dx / L * o;
    line(pa.sx + nx, pa.sy + ny, pb.sx + nx, pb.sy + ny);
    line(pa.sx - nx, pa.sy - ny, pb.sx - nx, pb.sy - ny);
}

function _drawCrystal3DSphere(p, spKey, light, alphaK, ghost) {
    const sp  = crystal3DScene.species[spKey];
    const col = color(sp.color);
    const cR = red(col), cG = green(col), cB = blue(col);
    const r  = sp.r * crystal3DCam.scale * p.f;
    const a  = 255 * alphaK;

    if (ghost) {
        // Vecino fuera de la región: esfera translúcida con borde discontinuo
        fill(cR, cG, cB, 70);
        stroke(cR, cG, cB, 200);
        strokeWeight(1.2);
        drawingContext.setLineDash([3, 3]);
        circle(p.sx, p.sy, r * 2);
        drawingContext.setLineDash([]);
        return;
    }

    // Esfera con brillo (gradiente radial)
    const ctx = drawingContext;
    const g = ctx.createRadialGradient(p.sx - r * 0.35, p.sy - r * 0.4, r * 0.08, p.sx, p.sy, r);
    const L = (v, k) => Math.round(Math.min(255, v * k));
    g.addColorStop(0,    `rgba(${L(cR + 90, light)},${L(cG + 90, light)},${L(cB + 90, light)},${alphaK})`);
    g.addColorStop(0.55, `rgba(${L(cR, light)},${L(cG, light)},${L(cB, light)},${alphaK})`);
    g.addColorStop(1,    `rgba(${L(cR * 0.45, light)},${L(cG * 0.45, light)},${L(cB * 0.45, light)},${alphaK})`);
    noStroke();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
    ctx.fill();

    // Símbolo (y carga) si la esfera es suficientemente grande
    if (r >= 11 && alphaK > 0.5) {
        const symSz = constrain(r * 0.62, 9, 16), supSz = symSz * 0.68;
        textStyle(BOLD);
        textSize(symSz); const symW = textWidth(sp.sym);
        textSize(supSz); const supW = sp.sup ? textWidth(sp.sup) : 0;
        const tX = p.sx - (symW + supW + (sp.sup ? 1 : 0)) / 2;
        fill(15, 23, 42, a * min(1, light + 0.2));
        textAlign(LEFT, CENTER);
        textSize(symSz); text(sp.sym, tX, p.sy);
        if (sp.sup) { textSize(supSz); text(sp.sup, tX + symW + 1, p.sy - symSz * 0.32); }
        textStyle(NORMAL);
        textAlign(CENTER, CENTER);
    }
}

// Ayuda superior y leyenda de especies
function _drawCrystal3DHud(hasSel) {
    const sc = crystal3DScene;
    noStroke();
    fill(100, 116, 139);
    textAlign(CENTER, TOP);
    textSize(11);
    text(hasSel ? 'Haz clic en el fondo para quitar el resaltado'
                : `Arrastra para girar · Haz clic en un ${sc.unit || 'átomo'} para ver sus vecinos`,
         width / 2, 14);

    let y = 18;
    textAlign(LEFT, CENTER);
    for (const key of sc.legend) {
        const sp = sc.species[key];
        fill(color(sp.color));
        circle(24, y + 8, 12);
        fill(203, 213, 225);
        textSize(12); textStyle(BOLD);
        const name = sp.sym + (sp.supUnicode || '');
        text(name, 36, y + 8);
        const nameW = textWidth(name);
        textStyle(NORMAL);
        fill(100, 116, 139);
        text(sp.label, 36 + nameW + 8, y + 8);
        y += 20;
    }
}

// ── Selección del entorno ─────────────────────────────────────
function _crystal3DPick(mx, my) {
    const sc = crystal3DScene;
    const cam = _crystal3DCamera();
    let best = -1, bestDepth = Infinity;
    for (let i = 0; i < crystal3DProj.length; i++) {
        const p = crystal3DProj[i];
        const r = sc.species[sc.atoms[i].sp].r * cam.scale * p.f;
        if (dist(mx, my, p.sx, p.sy) <= max(r, 6) && p.depth < bestDepth) { best = i; bestDepth = p.depth; }
    }
    return best;
}

function selectCrystal3DAtom(idx) {
    crystal3DSelected = idx;
    crystal3DGhosts   = [];
    if (idx < 0 || !crystal3DScene || !crystal3DScene.ghosts) return;
    crystal3DGhosts = crystal3DScene.ghosts(idx);
}

// Vecinos de atoms[idx] que no están en la región dibujada, buscados en una
// versión ampliada de la red (para ver el índice de coordinación completo)
function sceneGhosts(scene, extAtoms, idx, isNeighbor) {
    const sel = scene.atoms[idx];
    const out = [];
    for (const q of extAtoms) {
        if (!isNeighbor(sel, q)) continue;
        const shown = scene.atoms.some(p => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 1e-3);
        if (!shown) out.push(q);
    }
    return out;
}

// ── Interacción (llamada desde los manejadores de p5) ─────────
function crystal3DActive() {
    if (!crystal3DScene) return false;
    if (currentMode === 'IONIC')    return ionicCrystalMode && ionicView === '3d';
    if (currentMode === 'COVALENT') return typeof covCrystalMode !== 'undefined' && covCrystalMode;
    return false;
}

function _overCrystalButtons() {
    for (const r of [_crystalBackBtnBounds, _crystalPauseBtnBounds]) {
        if (r && mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) return true;
    }
    return false;
}

function crystal3DMousePressed() {
    if (!crystal3DActive()) return;
    if (mouseX < 0 || mouseY < 0 || mouseX > width || mouseY > height) return;
    if (_overCrystalButtons()) return;
    crystal3DDrag = { x: mouseX, y: mouseY, moved: false };
}

function crystal3DMouseDragged() {
    if (!crystal3DDrag) return true;
    const dx = mouseX - crystal3DDrag.x, dy = mouseY - crystal3DDrag.y;
    if (!crystal3DDrag.moved && abs(dx) + abs(dy) < 4) return false;
    crystal3DDrag.moved = true;
    crystal3DYaw  += dx * 0.01;
    crystal3DPitch = constrain(crystal3DPitch + dy * 0.01, -1.45, 1.45);
    crystal3DDrag.x = mouseX; crystal3DDrag.y = mouseY;
    if (crystal3DAutoRotate) {
        crystal3DAutoRotate = false;
        if (elChkAutoRotate) elChkAutoRotate.elt.checked = false;
    }
    if (!isLooping()) redraw();
    return false; // evita el desplazamiento de la página en pantallas táctiles
}

function crystal3DMouseReleased() {
    if (!crystal3DDrag) return;
    const wasClick = !crystal3DDrag.moved;
    crystal3DDrag = null;
    if (wasClick) {
        selectCrystal3DAtom(_crystal3DPick(mouseX, mouseY));
        if (!isLooping()) redraw();
    }
}

// Casilla "Giro automático" (compartida por los modos iónico y covalente)
function createAutoRotateCheckbox(parent) {
    let row = createDiv();
    row.style('display', 'flex').style('align-items', 'center').style('gap', '8px')
       .style('cursor', 'pointer').style('padding', '2px 0');
    elChkAutoRotate = createElement('input');
    elChkAutoRotate.attribute('type', 'checkbox');
    elChkAutoRotate.attribute('id', 'chk-autorotate');
    elChkAutoRotate.style('width', '14px').style('height', '14px').style('cursor', 'pointer')
                   .style('accent-color', 'var(--accent)');
    elChkAutoRotate.elt.checked = crystal3DAutoRotate;
    let lbl = createElement('label', 'Giro automático');
    lbl.attribute('for', 'chk-autorotate');
    lbl.style('font-size', '11.5px').style('color', 'var(--text-label)')
       .style('cursor', 'pointer').style('user-select', 'none');
    row.child(elChkAutoRotate); row.child(lbl);
    parent.child(row);
    elChkAutoRotate.elt.addEventListener('change', () => { crystal3DAutoRotate = elChkAutoRotate.elt.checked; });
}

// ============================================================
// ADAPTADOR: RED CRISTALINA IÓNICA
// ============================================================
let ionicView  = '3d';   // '3d' | '2d'
let ionic3D    = null;   // buildCrystal3D(ionicStructure)
let ionic3DExt = null;   // red ampliada (vecinos fuera de la celda)

const ION_BALL_SCALE = 0.55; // radio dibujado / radio iónico (modelo de bolas y varillas)

function initIonicCrystal3D() {
    ionic3D    = buildCrystal3D(ionicStructure);
    ionic3DExt = null;
    const sup = q => chargeSupStr(q).replace('-', '−');
    const scene = {
        atoms: ionic3D.ions.map(p => ({ x: p.x, y: p.y, z: p.z, sp: p.kind })),
        bonds: ionic3D.bonds.map(([i, j]) => ({ i, j })),
        edges: ionic3D.edges,
        radius: ionic3D.radius,
        species: {
            cat: { sym: ionicCatSym, sup: sup(ionicCatCharge), supUnicode: chargeSuperscript(ionicCatCharge),
                   color: ionicCatColor, r: ionicStructure.cat.radius * ION_BALL_SCALE, label: 'catión' },
            an:  { sym: ionicAnSym,  sup: sup(ionicAnCharge),  supUnicode: chargeSuperscript(ionicAnCharge),
                   color: ionicAnColor,  r: ionicStructure.an.radius * ION_BALL_SCALE,  label: 'anión' },
        },
        legend: ['cat', 'an'],
        unit: 'ion',
        // Las láminas se aprecian mejor casi de canto
        pitch: ionicStructure.id === 'cdcl2' ? 0.12 : 0.38,
        ghosts(idx) {
            if (!ionic3DExt) {
                ionic3DExt = buildCrystal3D(Object.assign({}, ionicStructure, {
                    range3D: ionicStructure.range3D.map(r => [r[0] - 1, r[1] + 1]),
                }));
            }
            const dMax = ionic3D.dMin * 1.12;
            return sceneGhosts(scene, ionic3DExt.ions.map(q => ({ x: q.x, y: q.y, z: q.z, sp: q.kind })), idx,
                (a, q) => q.sp !== a.sp && Math.hypot(q.x - a.x, q.y - a.y, q.z - a.z) <= dMax);
        },
    };
    setCrystal3DScene(scene);
}
