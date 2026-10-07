// ============================================================
// ENLACE IÓNICO — CELDA UNIDAD 3D
// ------------------------------------------------------------
// Proyección en perspectiva dibujada sobre el canvas 2D de p5
// (sin WEBGL): esferas sombreadas ordenadas por profundidad,
// enlaces entre vecinos y aristas de la celda. Se gira
// arrastrando; un clic en un ion resalta su entorno.
// ============================================================

let ionicView         = '3d';   // '3d' | '2d'
let ionic3D           = null;   // buildCrystal3D(ionicStructure)
let ionic3DExt        = null;   // red ampliada (vecinos fuera de la celda)
let ionic3DYaw        = -0.55;
let ionic3DPitch      = 0.38;
let ionic3DAutoRotate = true;
let ionic3DDrag       = null;   // { x, y, moved } mientras se arrastra
let ionic3DSelected   = -1;     // índice del ion resaltado (-1: ninguno)
let ionic3DGhosts     = [];     // vecinos del ion resaltado fuera de la celda
let ionic3DProj       = [];     // proyección del último fotograma (para clics)
let ionic3DCam        = null;   // cámara del último fotograma
let elChkAutoRotate   = null;

const ION_BALL_SCALE = 0.55; // radio dibujado / radio iónico (modelo de bolas y varillas)

// Carga como superíndice Unicode: 2 → ²⁺, -1 → ⁻
function chargeSuperscript(q) {
    const abs = Math.abs(q);
    return (abs > 1 ? '⁰¹²³⁴⁵⁶⁷⁸⁹'[abs] : '') + (q > 0 ? '⁺' : '⁻');
}

function initIonicCrystal3D() {
    ionic3D         = buildCrystal3D(ionicStructure);
    ionic3DYaw      = -0.55;
    // Las láminas se aprecian mejor casi de canto
    ionic3DPitch    = ionicStructure.id === 'cdcl2' ? 0.12 : 0.38;
    ionic3DExt      = null;
    ionic3DSelected = -1;
    ionic3DGhosts   = [];
    ionic3DProj     = [];
    ionic3DDrag     = null;
}

function ionicIonRadius(kind) {
    return (kind === 'cat' ? ionicStructure.cat.radius : ionicStructure.an.radius) * ION_BALL_SCALE;
}

// ── Proyección ────────────────────────────────────────────────
function _ionic3DCamera() {
    const btmReserve = 66;
    const ext   = ionic3D.radius + ionicIonRadius('an');
    const D     = ext * 4;                       // distancia de la cámara
    const avail = min(width * 0.92, (height - btmReserve) * 1.0);
    return {
        cx: width / 2,
        cy: (height - btmReserve) / 2 + 6,
        scale: (avail / (2 * ext)) * (D - ext) / D, // el punto más cercano cabe
        D,
        cy_: cos(ionic3DYaw), sy_: sin(ionic3DYaw),
        cp: cos(ionic3DPitch), sp: sin(ionic3DPitch),
    };
}

// x, y, z (Å; z vertical) → { sx, sy, depth, f }
function _ionic3DProject(x, y, z, cam) {
    const x1 = x * cam.cy_ - y * cam.sy_;
    const y1 = x * cam.sy_ + y * cam.cy_;
    const depth = y1 * cam.cp + z * cam.sp;     // > 0: más lejos
    const up    = z * cam.cp - y1 * cam.sp;
    const f     = cam.D / (cam.D + depth);
    return { sx: cam.cx + x1 * cam.scale * f, sy: cam.cy - up * cam.scale * f, depth, f };
}

// ── Bucle de dibujo ───────────────────────────────────────────
function drawIonicCrystal3D() {
    if (!ionic3D) return;
    if (ionic3DAutoRotate && !ionic3DDrag) ionic3DYaw += 0.0045;

    const cam  = ionic3DCam = _ionic3DCamera();
    const ions = ionic3D.ions;
    const ext  = ionic3D.radius;
    ionic3DProj = ions.map(p => _ionic3DProject(p.x, p.y, p.z, cam));

    // Entorno resaltado: el ion elegido y sus vecinos
    const hasSel = ionic3DSelected >= 0;
    const inEnv  = new Set();
    if (hasSel) {
        inEnv.add(ionic3DSelected);
        for (const [i, j] of ionic3D.bonds) {
            if (i === ionic3DSelected) inEnv.add(j);
            if (j === ionic3DSelected) inEnv.add(i);
        }
    }
    // Atenuación por profundidad (los iones del fondo se ven más apagados)
    const shade = d => map(d, -ext, ext, 1, 0.45, true);

    // Aristas de la celda (detrás de todo, discontinuas)
    stroke(148, 163, 184, 70);
    strokeWeight(1.2);
    drawingContext.setLineDash([5, 5]);
    for (const [a, b] of ionic3D.edges) {
        const pa = _ionic3DProject(a[0], a[1], a[2], cam);
        const pb = _ionic3DProject(b[0], b[1], b[2], cam);
        line(pa.sx, pa.sy, pb.sx, pb.sy);
    }
    drawingContext.setLineDash([]);

    // Enlaces y esferas, del fondo hacia delante
    const items = [];
    for (const [i, j] of ionic3D.bonds) {
        items.push({ type: 'bond', i, j, depth: (ionic3DProj[i].depth + ionic3DProj[j].depth) / 2 + 0.01 });
    }
    for (let i = 0; i < ions.length; i++) items.push({ type: 'ion', i, depth: ionic3DProj[i].depth });
    const ghosts = ionic3DGhosts.map(g => ({ g, p: _ionic3DProject(g.x, g.y, g.z, cam) }));
    for (const gh of ghosts) items.push({ type: 'ghost', gh, depth: gh.p.depth });
    items.sort((a, b) => b.depth - a.depth);

    const selP = hasSel ? ionic3DProj[ionic3DSelected] : null;
    for (const it of items) {
        if (it.type === 'bond') {
            const pa = ionic3DProj[it.i], pb = ionic3DProj[it.j];
            const lit = hasSel && (it.i === ionic3DSelected || it.j === ionic3DSelected);
            const k = shade(it.depth);
            if (lit) { stroke(251, 191, 36, 230); strokeWeight(3.2 * pa.f); }
            else     { stroke(203, 213, 225, (hasSel ? 40 : 150) * k); strokeWeight(2.4 * pa.f); }
            line(pa.sx, pa.sy, pb.sx, pb.sy);
        } else if (it.type === 'ghost') {
            const { g, p } = it.gh;
            stroke(251, 191, 36, 200);
            strokeWeight(3.2 * p.f);
            line(selP.sx, selP.sy, p.sx, p.sy);
            _drawIon3DSphere(p, g.kind, 0.9, 0.35, true);
        } else {
            const dim = hasSel && !inEnv.has(it.i) ? 0.18 : 1;
            _drawIon3DSphere(ionic3DProj[it.i], ions[it.i].kind, shade(it.depth), dim, false);
        }
    }

    // Anillo sobre el ion elegido
    if (hasSel) {
        const r = ionicIonRadius(ions[ionic3DSelected].kind) * cam.scale * selP.f;
        noFill(); stroke(251, 191, 36, 220); strokeWeight(2);
        drawingContext.setLineDash([4, 3]);
        circle(selP.sx, selP.sy, r * 2 + 12);
        drawingContext.setLineDash([]);
    }

    _drawIonic3DHud(hasSel);
}

function _drawIon3DSphere(p, kind, light, alphaK, ghost) {
    const isCat = kind === 'cat';
    const col   = color(isCat ? ionicCatColor : ionicAnColor);
    const cR = red(col), cG = green(col), cB = blue(col);
    const r  = ionicIonRadius(kind) * ionic3DCam.scale * p.f;
    const a  = 255 * alphaK;

    if (ghost) {
        // Vecino fuera de la celda: esfera translúcida con borde discontinuo
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

    // Símbolo y carga si la esfera es suficientemente grande
    if (r >= 11 && alphaK > 0.5) {
        const sym = isCat ? ionicCatSym : ionicAnSym;
        const sup = chargeSupStr(isCat ? ionicCatCharge : ionicAnCharge).replace('-', '−');
        const symSz = constrain(r * 0.62, 9, 16), supSz = symSz * 0.68;
        textStyle(BOLD);
        textSize(symSz); const symW = textWidth(sym);
        textSize(supSz); const supW = textWidth(sup);
        const tX = p.sx - (symW + supW + 1) / 2;
        fill(15, 23, 42, a * min(1, light + 0.2));
        textAlign(LEFT, CENTER);
        textSize(symSz); text(sym, tX, p.sy);
        textSize(supSz); text(sup, tX + symW + 1, p.sy - symSz * 0.32);
        textStyle(NORMAL);
        textAlign(CENTER, CENTER);
    }
}

// Ayuda superior y leyenda de iones
function _drawIonic3DHud(hasSel) {
    noStroke();
    fill(100, 116, 139);
    textAlign(CENTER, TOP);
    textSize(11);
    text(hasSel ? 'Haz clic en el fondo para quitar el resaltado'
                : 'Arrastra para girar · Haz clic en un ion para ver sus vecinos',
         width / 2, 14);

    const items = [
        { kind: 'cat', sym: ionicCatSym, q: ionicCatCharge, lbl: 'catión' },
        { kind: 'an',  sym: ionicAnSym,  q: ionicAnCharge,  lbl: 'anión'  },
    ];
    let y = 18;
    textAlign(LEFT, CENTER);
    for (const it of items) {
        const c = color(it.kind === 'cat' ? ionicCatColor : ionicAnColor);
        fill(c);
        circle(24, y + 8, 12);
        fill(203, 213, 225);
        textSize(12); textStyle(BOLD);
        const name = it.sym + chargeSuperscript(it.q);
        text(name, 36, y + 8);
        const nameW = textWidth(name);
        textStyle(NORMAL);
        fill(100, 116, 139);
        text(it.lbl, 36 + nameW + 8, y + 8);
        y += 20;
    }
}

// ── Selección del entorno de un ion ──────────────────────────
function _ionic3DPick(mx, my) {
    const cam = _ionic3DCamera();
    let best = -1, bestDepth = Infinity;
    for (let i = 0; i < ionic3DProj.length; i++) {
        const p = ionic3DProj[i];
        const r = ionicIonRadius(ionic3D.ions[i].kind) * cam.scale * p.f;
        if (dist(mx, my, p.sx, p.sy) <= r && p.depth < bestDepth) { best = i; bestDepth = p.depth; }
    }
    return best;
}

function selectIonic3DIon(idx) {
    ionic3DSelected = idx;
    ionic3DGhosts   = [];
    if (idx < 0) return;
    // Vecinos que quedan fuera de la región dibujada (para ver el IC completo)
    if (!ionic3DExt) {
        ionic3DExt = buildCrystal3D(Object.assign({}, ionicStructure, {
            range3D: ionicStructure.range3D.map(r => [r[0] - 1, r[1] + 1]),
        }));
    }
    const sel  = ionic3D.ions[idx];
    const dMax = ionic3D.dMin * 1.12;
    for (const q of ionic3DExt.ions) {
        if (q.kind === sel.kind) continue;
        if (Math.hypot(q.x - sel.x, q.y - sel.y, q.z - sel.z) > dMax) continue;
        const shown = ionic3D.ions.some(p => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 1e-3);
        if (!shown) ionic3DGhosts.push(q);
    }
}

// ── Interacción (llamada desde los manejadores de p5) ─────────
function ionic3DActive() {
    return currentMode === 'IONIC' && ionicCrystalMode && ionicView === '3d' && ionic3D;
}

function _overCrystalButtons() {
    for (const r of [_crystalBackBtnBounds, _crystalPauseBtnBounds]) {
        if (r && mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) return true;
    }
    return false;
}

function ionic3DMousePressed() {
    if (!ionic3DActive()) return;
    if (mouseX < 0 || mouseY < 0 || mouseX > width || mouseY > height) return;
    if (_overCrystalButtons()) return;
    ionic3DDrag = { x: mouseX, y: mouseY, moved: false };
}

function ionic3DMouseDragged() {
    if (!ionic3DDrag) return true;
    const dx = mouseX - ionic3DDrag.x, dy = mouseY - ionic3DDrag.y;
    if (!ionic3DDrag.moved && abs(dx) + abs(dy) < 4) return false;
    ionic3DDrag.moved = true;
    ionic3DYaw  += dx * 0.01;
    ionic3DPitch = constrain(ionic3DPitch + dy * 0.01, -1.45, 1.45);
    ionic3DDrag.x = mouseX; ionic3DDrag.y = mouseY;
    if (ionic3DAutoRotate) {
        ionic3DAutoRotate = false;
        if (elChkAutoRotate) elChkAutoRotate.elt.checked = false;
    }
    if (!isLooping()) redraw();
    return false; // evita el desplazamiento de la página en pantallas táctiles
}

function ionic3DMouseReleased() {
    if (!ionic3DDrag) return;
    const wasClick = !ionic3DDrag.moved;
    ionic3DDrag = null;
    if (wasClick) {
        selectIonic3DIon(_ionic3DPick(mouseX, mouseY));
        if (!isLooping()) redraw();
    }
}
