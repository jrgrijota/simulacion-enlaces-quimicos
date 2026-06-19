// ============================================================
// DATOS QUÍMICOS
// ============================================================
const SHELL_RADII = [36, 60, 84, 108];
const BOND_COLOR  = '#F59E0B';

// ============================================================
// DATOS PARA ENLACE METÁLICO
// ============================================================
const METALLIC_METALS = {
    Na: { valence: 1, charge: 1, color: '#F43F5E', name: 'Sodio',    mp:   98 },
    K:  { valence: 1, charge: 1, color: '#C084FC', name: 'Potasio',  mp:   64 },
    Mg: { valence: 2, charge: 2, color: '#34D399', name: 'Magnesio', mp:  650 },
    Ca: { valence: 2, charge: 2, color: '#67E8F9', name: 'Calcio',   mp:  842 },
    Al: { valence: 3, charge: 3, color: '#A78BFA', name: 'Aluminio', mp:  660 },
};
const LATTICE_COLS = 5;
const LATTICE_ROWS = 4;

const ELEMENTS = {
    H:    { Z: 1,  config: [1],            nobleTarget: 2, isMetal: false, color: '#38BDF8', name: 'Hidrógeno' },
    C:    { Z: 6,  config: [2, 4],         nobleTarget: 8, isMetal: false, color: '#A8A29E', name: 'Carbono'   },
    N:    { Z: 7,  config: [2, 5],         nobleTarget: 8, isMetal: false, color: '#818CF8', name: 'Nitrógeno' },
    O:    { Z: 8,  config: [2, 6],         nobleTarget: 8, isMetal: false, color: '#FB923C', name: 'Oxígeno'   },
    F:    { Z: 9,  config: [2, 7],         nobleTarget: 8, isMetal: false, color: '#FBBF24', name: 'Flúor'     },
    Li:   { Z: 3,  config: [2, 1],         nobleTarget: 2, isMetal: true,  color: '#A78BFA', name: 'Litio'     },
    Na:   { Z: 11, config: [2, 8, 1],      nobleTarget: 8, isMetal: true,  color: '#F43F5E', name: 'Sodio'     },
    Mg:   { Z: 12, config: [2, 8, 2],      nobleTarget: 8, isMetal: true,  color: '#34D399', name: 'Magnesio'  },
    S:    { Z: 16, config: [2, 8, 6],      nobleTarget: 8, isMetal: false, color: '#A3E635', name: 'Azufre'    },
    Cl:   { Z: 17, config: [2, 8, 7],      nobleTarget: 8, isMetal: false, color: '#F472B6', name: 'Cloro'     },
    K:    { Z: 19, config: [2, 8, 8, 1],   nobleTarget: 8, isMetal: true,  color: '#C084FC', name: 'Potasio'   },
    Ca:   { Z: 20, config: [2, 8, 8, 2],   nobleTarget: 8, isMetal: true,  color: '#67E8F9', name: 'Calcio'    },
    NONE: { Z: 0,  config: [],             nobleTarget: 0, isMetal: false, color: '#475569', name: '—'         }
};

// ============================================================
// ESTADO GLOBAL
// ============================================================
let currentMode    = 'IONIC';
let atoms          = [];
let uiContainer;
let bondFormed     = false;
let bondProgress   = 0;
let origPositions  = [];
let atomSelects    = [];
let elResultCard   = null;
let elResultBody   = null;
let covalentBonds  = [];   // [{atomA, atomB, eA, eB}] — pares compartidos

// Metallic bond mode state
let metallicMetal  = 'Na';
let latticeAtoms   = [];
let freeElectrons  = [];
let metallicPhase  = 'normal'; // 'normal' | 'voltage' | 'deform'
let deformOffset   = 0;
let deformTarget   = 0;
let deformDone     = false;
let latticeSpacing = 85;
let latticeStartX  = 0;
let latticeStartY  = 0;
let elBtnVoltage   = null;
let elBtnDeform    = null;
let elMetallicInfo = null;

// ============================================================
// HELPERS
// ============================================================
function chargeStr(q) {
    if (q === 0) return '0';
    let sign = q > 0 ? '+' : '−';
    let abs  = Math.abs(q);
    return abs === 1 ? sign : abs + sign;
}

// Superíndice para mostrar dentro del núcleo (p5 canvas, no HTML)
function chargeSupStr(q) {
    if (q === 0) return '';
    let sign = q > 0 ? '+' : '-';
    let abs  = Math.abs(q);
    return abs === 1 ? sign : abs + sign;
}

function maxElectronRadius(atomList) {
    let r = 0;
    for (let a of atomList) {
        if (a.symbol !== 'NONE') {
            // Use native shell count to get max orbit, even if electrons = 0
            let shells = a.data.config.length;
            if (shells > 0) r = Math.max(r, SHELL_RADII[shells - 1]);
        }
    }
    return r || SHELL_RADII[2];
}

// ============================================================
// p5.js LIFECYCLE
// ============================================================
function setup() {
    let cont = document.getElementById('sim-frame');
    let cnv  = createCanvas(cont.offsetWidth, cont.offsetHeight);
    cnv.parent('sim-frame');
    uiContainer = select('#ui-overlay');
    select('#mode-select').changed(handleModeChange);
    initSimulation();
}

function draw() {
    background('#0F172A');
    if (currentMode === 'IONIC') {
        updateBondAnim();
        drawForces();
        for (let a of atoms) { a.update(); a.draw(); }
        drawEmptySlots();
        drawAtomLabels();
        if (bondFormed) drawBondEffect();
    } else if (currentMode === 'METALLIC') {
        drawMetallic();
    } else if (currentMode === 'COVALENT') {
        updateBondAnim();
        for (let a of atoms) { a.update(); a.draw(); }
        drawCovalentLenses();
        drawEmptySlots();
        drawCovalentLabels();
        if (bondFormed) drawBondEffect();
    } else {
        drawComingSoon();
    }
}

function windowResized() {
    let cont = document.getElementById('sim-frame');
    resizeCanvas(cont.offsetWidth, cont.offsetHeight);
    initSimulation();
}

function handleModeChange() {
    currentMode = this.value();
    let ctrlRow = document.getElementById('atom-controls-row');
    let showRow = currentMode === 'IONIC' || currentMode === 'COVALENT';
    if (ctrlRow) ctrlRow.style.display = showRow ? 'flex' : 'none';
    let frame = document.getElementById('sim-frame');
    if (frame) resizeCanvas(frame.offsetWidth, frame.offsetHeight);
    initSimulation();
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
const INFO_IONIC = `
    <p><b>1.</b> Elige un <em>metal</em> y un <em>no metal</em> en las ranuras A / B / C.</p>
    <p><b>2.</b> Pulsa <em>Ceder e⁻</em> para transferir electrones de valencia del metal al no metal.</p>
    <p><b>3.</b> Cuando los iones tienen cargas opuestas y configuración de gas noble (<b>octeto</b> o <b>dueto</b>), la atracción de <b>Coulomb</b> forma el enlace.</p>
    <p>Prueba con <b>NaCl</b>, <b>MgCl₂</b> o <b>Na₂O</b>.</p>
`;
const INFO_COVALENT = `
    <p><b>1.</b> Elige dos <em>no metales</em> en las ranuras A y B (o A, B y C para moléculas triatómicas).</p>
    <p><b>2.</b> Pulsa <em>Compartir</em> para que cada átomo aporte un electrón al par compartido.</p>
    <p><b>3.</b> Las órbitas de la capa de valencia se solapan: el par de electrones compartido orbita dentro de la <b>zona de intersección</b> y cuenta para el octeto de ambos átomos.</p>
    <p>Prueba con <b>H₂</b>, <b>Cl₂</b>, <b>O₂</b> (doble enlace) o <b>HCl</b>. Para <b>H₂O</b> usa las tres ranuras: A=H, B=O, C=H.</p>
`;

function updateModeInfo() {
    let el = document.getElementById('mode-info');
    if (!el) return;
    if (currentMode === 'COVALENT') el.innerHTML = INFO_COVALENT;
    else if (currentMode === 'IONIC') el.innerHTML = INFO_IONIC;
    else el.innerHTML = '<p>Selecciona <em>Enlace Iónico</em> o <em>Enlace Covalente</em> para comenzar.</p>';
}

function togglePause() {
    let btn = document.getElementById('pause-btn');
    if (isLooping()) {
        noLoop();
        if (btn) { btn.textContent = '▶ Reanudar'; btn.classList.add('btn-primary'); }
    } else {
        loop();
        if (btn) { btn.textContent = '⏸ Pausar'; btn.classList.remove('btn-primary'); }
    }
}

function initSimulation() {
    if (!isLooping()) {
        loop();
        let btn = document.getElementById('pause-btn');
        if (btn) { btn.textContent = '⏸ Pausar'; btn.classList.remove('btn-primary'); }
    }

    uiContainer.html('');
    ['ctrl-0', 'ctrl-1', 'ctrl-2'].forEach(id => {
        let el = select(`#${id}`);
        if (el) el.html('');
    });
    ['bond-01', 'bond-12'].forEach(id => {
        let el = document.getElementById(id);
        if (el) { el.innerHTML = ''; el.style.display = 'none'; }
    });

    atoms          = [];
    atomSelects    = [];
    elResultCard   = null;
    elResultBody   = null;
    bondFormed     = false;
    bondProgress   = 0;
    metallicPhase  = 'normal';
    deformOffset   = 0;
    deformTarget   = 0;
    deformDone     = false;
    elBtnVoltage   = null;
    elBtnDeform    = null;
    elMetallicInfo = null;

    updateModeInfo();

    let ctrlRow = select('#atom-controls-row');
    let showRow = currentMode === 'IONIC' || currentMode === 'COVALENT';
    if (ctrlRow) ctrlRow.style('display', showRow ? 'flex' : 'none');

    updateModeInfoCard(currentMode);

    if (currentMode === 'IONIC') {
        let cx = width / 2, cy = constrain(height * 0.44, 100, 230);
        origPositions = [
            createVector(cx - width * 0.26, cy),
            createVector(cx,                cy),
            createVector(cx + width * 0.26, cy)
        ];
        for (let i = 0; i < 3; i++) {
            atoms.push(new Atom(origPositions[i].x, origPositions[i].y, i));
        }
        atoms[0].setElement('Na');
        atoms[1].setElement('Cl');
        atoms[2].setElement('NONE');
        buildIonicUI();
    } else if (currentMode === 'METALLIC') {
        initMetallicSimulation();
        buildMetallicUI();
    } else if (currentMode === 'COVALENT') {
        covalentBonds = [];
        let cx = width / 2, cy = constrain(height * 0.44, 100, 230);
        origPositions = [
            createVector(cx - width * 0.26, cy),
            createVector(cx,                cy),
            createVector(cx + width * 0.26, cy)
        ];
        for (let i = 0; i < 3; i++) {
            atoms.push(new Atom(origPositions[i].x, origPositions[i].y, i));
        }
        atoms[0].setElement('H');
        atoms[1].setElement('H');
        atoms[2].setElement('NONE');
        buildCovalentUI();
    }
}

function resetAtomPositions() {
    for (let i = 0; i < atoms.length; i++) {
        if (origPositions[i]) {
            atoms[i].pos       = origPositions[i].copy();
            atoms[i].targetPos = origPositions[i].copy();
        }
    }
}

function resetSimulation() {
    bondFormed   = false;
    bondProgress = 0;
    resetAtomPositions();
    atoms[0].setElement('Na');
    atoms[1].setElement('Cl');
    atoms[2].setElement('NONE');
    for (let i = 0; i < 3; i++) {
        if (atomSelects[i]) atomSelects[i].value(atoms[i].symbol);
    }
    if (elResultCard) elResultCard.style('display', 'none');
    updateUIState();
}

function resetCovalentSimulation() {
    bondFormed    = false;
    bondProgress  = 0;
    covalentBonds = [];
    resetAtomPositions();
    atoms[0].setElement('H');
    atoms[1].setElement('H');
    atoms[2].setElement('NONE');
    for (let i = 0; i < 3; i++) {
        if (atomSelects[i]) atomSelects[i].value(atoms[i].symbol);
    }
    if (elResultCard) elResultCard.style('display', 'none');
    updateUIState();
}

// ============================================================
// UI DOM
// ============================================================
function buildIonicUI() {
    // ── Sidebar: botón de reinicio ──
    let resetRow = createDiv().class('reset-row');
    let resetBtn = createButton('↺ Reiniciar simulación');
    resetBtn.mousePressed(resetSimulation);
    resetRow.child(resetBtn);
    uiContainer.child(resetRow);

    // ── Sidebar: card de resultado ──
    elResultCard = createDiv().class('card');
    elResultCard.style('display', 'none');
    elResultCard.child(createDiv('✔ Enlace formado').class('result-header'));
    elResultBody = createDiv().class('card-body-static');
    elResultCard.child(elResultBody);
    uiContainer.child(elResultCard);

    // ── Columnas de control bajo el canvas ──
    const labels = ['Átomo A', 'Átomo B', 'Átomo C'];
    for (let i = 0; i < 3; i++) {
        let ctrl = select(`#ctrl-${i}`);

        ctrl.child(createDiv(labels[i]).class('atom-ctrl-label'));

        let sel = createSelect();
        sel.option('— Vacío —', 'NONE');
        for (let sym in ELEMENTS) {
            if (sym === 'NONE') continue;
            let el        = ELEMENTS[sym];
            let typeLabel = el.isMetal ? 'Metal' : 'No metal';
            sel.option(`${sym} - ${el.name} (${typeLabel})`, sym);
        }
        sel.value(atoms[i].symbol);
        atomSelects[i] = sel;
        sel.changed(() => {
            bondFormed   = false;
            bondProgress = 0;
            resetAtomPositions();
            if (elResultCard) elResultCard.style('display', 'none');
            for (let j = 0; j < atoms.length; j++) {
                if (j !== i) { atoms[j].buildElectrons(); atoms[j].calcCharge(); }
            }
            atoms[i].setElement(sel.value());
            updateUIState();
        });
        ctrl.child(sel);

        ctrl.child(createDiv().class('status-box').id(`data-${i}`));

        let btnBox = createDiv().class('btn-group');
        if (i === 0) {
            let b = createButton('e⁻ → B').id('btn-0r');
            b.mousePressed(() => transferElectron(0, 1));
            btnBox.child(b);
        } else if (i === 1) {
            let bL = createButton('← A').id('btn-1l');
            bL.mousePressed(() => transferElectron(1, 0));
            let bR = createButton('C →').id('btn-1r');
            bR.mousePressed(() => transferElectron(1, 2));
            btnBox.child(bL);
            btnBox.child(bR);
        } else {
            let b = createButton('B ← e⁻').id('btn-2l');
            b.mousePressed(() => transferElectron(2, 1));
            btnBox.child(b);
        }
        ctrl.child(btnBox);
    }

    updateUIState();
}

// ============================================================
// UI COVALENTE
// ============================================================
function buildCovalentUI() {
    // Sidebar: reset
    let resetRow = createDiv().class('reset-row');
    let resetBtn = createButton('↺ Reiniciar simulación');
    resetBtn.mousePressed(resetCovalentSimulation);
    resetRow.child(resetBtn);
    uiContainer.child(resetRow);

    // Sidebar: result card
    elResultCard = createDiv().class('card');
    elResultCard.style('display', 'none');
    elResultCard.child(createDiv('✔ Enlace formado').class('result-header'));
    elResultBody = createDiv().class('card-body-static');
    elResultCard.child(elResultBody);
    uiContainer.child(elResultCard);

    // Columnas de control bajo el canvas
    const labels = ['Átomo A', 'Átomo B', 'Átomo C'];
    for (let i = 0; i < 3; i++) {
        let ctrl = select(`#ctrl-${i}`);
        ctrl.child(createDiv(labels[i]).class('atom-ctrl-label'));

        let sel = createSelect();
        sel.option('— Vacío —', 'NONE');
        for (let sym in ELEMENTS) {
            if (sym === 'NONE') continue;
            if (ELEMENTS[sym].isMetal) continue;
            sel.option(`${sym} - ${ELEMENTS[sym].name}`, sym);
        }
        sel.value(atoms[i].symbol);
        atomSelects[i] = sel;
        sel.changed(() => {
            bondFormed    = false;
            bondProgress  = 0;
            covalentBonds = [];
            resetAtomPositions();
            if (elResultCard) elResultCard.style('display', 'none');
            for (let j = 0; j < atoms.length; j++) {
                if (j !== i) { atoms[j].buildElectrons(); }
            }
            atoms[i].setElement(sel.value());
            updateUIState();
        });
        ctrl.child(sel);
        ctrl.child(createDiv().class('status-box').id(`data-${i}`));
    }

    // Botones de compartir: en los conectores entre columnas
    let conn01 = select('#bond-01');
    conn01.html('');
    let btn01 = createButton('');
    btn01.elt.innerHTML = '<span style="font-size:13px">⇄</span><br>Compartir';
    btn01.id('btn-cov-01');
    btn01.class('bond-connector-btn');
    btn01.mousePressed(() => shareElectron(0, 1));
    conn01.child(btn01);
    let rec01 = createButton('');
    rec01.elt.innerHTML = '<span style="font-size:11px">↩</span><br>Recuperar';
    rec01.id('btn-rec-01');
    rec01.class('bond-connector-btn bond-recover-btn');
    rec01.mousePressed(() => unshareElectron(0, 1));
    conn01.child(rec01);

    let conn12 = select('#bond-12');
    conn12.html('');
    let btn12 = createButton('');
    btn12.elt.innerHTML = '<span style="font-size:13px">⇄</span><br>Compartir';
    btn12.id('btn-cov-12');
    btn12.class('bond-connector-btn');
    btn12.mousePressed(() => shareElectron(1, 2));
    conn12.child(btn12);
    let rec12 = createButton('');
    rec12.elt.innerHTML = '<span style="font-size:11px">↩</span><br>Recuperar';
    rec12.id('btn-rec-12');
    rec12.class('bond-connector-btn bond-recover-btn');
    rec12.mousePressed(() => unshareElectron(1, 2));
    conn12.child(rec12);

    updateUIState();
}

// ============================================================
// LÓGICA ENLACE COVALENTE
// ============================================================
function shareElectron(idxA, idxB) {
    let atomA = atoms[idxA], atomB = atoms[idxB];
    if (atomA.symbol === 'NONE' || atomB.symbol === 'NONE') return;
    if (bondFormed) return;

    let vsA  = atomA.nativeMaxShell();
    let vsB  = atomB.nativeMaxShell();
    // Cada átomo aporta un electrón no compartido de su capa de valencia
    let eA = atomA.electrons.find(e => e.shell === vsA && !e.shared);
    let eB = atomB.electrons.find(e => e.shell === vsB && !e.shared);
    if (!eA || !eB) return; // alguno no tiene electrones libres para compartir

    eA.shared = true;  eA.sharedWith = idxB;
    eA.angle  = 0;
    eB.shared = true;  eB.sharedWith = idxA;
    eB.angle  = PI;
    covalentBonds.push({ atomA: idxA, atomB: idxB, eA, eB });

    // Acercar los átomos hasta que sus capas de valencia se solapen.
    // El átomo 1 (centro) es el ancla; los exteriores (0 y 2) se mueven hacia él.
    let outerIdx = (idxA === 1) ? idxB : idxA;
    let innerIdx = (idxA === 1) ? idxA : idxB;
    let rOuter   = SHELL_RADII[atoms[outerIdx].nativeMaxShell()];
    let rInner   = SHELL_RADII[atoms[innerIdx].nativeMaxShell()];
    let dTarget  = (rOuter + rInner) * 0.75;
    let ddx = atoms[outerIdx].pos.x - atoms[innerIdx].pos.x;
    let ddy = atoms[outerIdx].pos.y - atoms[innerIdx].pos.y;
    let dist = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dist > 0) {
        let nx = ddx / dist, ny = ddy / dist;
        atoms[outerIdx].targetPos = createVector(
            atoms[innerIdx].pos.x + nx * dTarget,
            atoms[innerIdx].pos.y + ny * dTarget
        );
    }

    updateUIState();
    checkCovalentBondFormed();
}

function unshareElectron(idxA, idxB) {
    let bondIdx = covalentBonds.findIndex(b =>
        (b.atomA === idxA && b.atomB === idxB) ||
        (b.atomA === idxB && b.atomB === idxA)
    );
    if (bondIdx === -1) return;

    let bond = covalentBonds[bondIdx];
    bond.eA.shared     = false;
    bond.eA.sharedWith = undefined;
    bond.eA.color      = bond.eA.baseColor;
    bond.eB.shared     = false;
    bond.eB.sharedWith = undefined;
    bond.eB.color      = bond.eB.baseColor;
    covalentBonds.splice(bondIdx, 1);

    bondFormed   = false;
    bondProgress = 0;
    if (elResultCard) elResultCard.style('display', 'none');

    // Mover de vuelta solo los átomos que ya no tienen ningún enlace activo
    for (let i = 0; i < atoms.length; i++) {
        let hasAnyBond = covalentBonds.some(b => b.atomA === i || b.atomB === i);
        if (!hasAnyBond && origPositions[i]) {
            atoms[i].targetPos = origPositions[i].copy();
        }
    }

    updateUIState();
}

function canRecoverCovalent(idxA, idxB) {
    return covalentBonds.some(b =>
        (b.atomA === idxA && b.atomB === idxB) ||
        (b.atomA === idxB && b.atomB === idxA)
    );
}

function canShareCovalent(idxA, idxB) {
    let atomA = atoms[idxA], atomB = atoms[idxB];
    if (!atomA || !atomB) return false;
    if (atomA.symbol === 'NONE' || atomB.symbol === 'NONE') return false;
    if (bondFormed) return false;
    let vsA = atomA.nativeMaxShell();
    let vsB = atomB.nativeMaxShell();
    let freeA = atomA.electrons.some(e => e.shell === vsA && !e.shared);
    let freeB = atomB.electrons.some(e => e.shell === vsB && !e.shared);
    return freeA && freeB;
}

function checkCovalentBondFormed() {
    let active = atoms.filter(a => a.symbol !== 'NONE');
    if (active.length < 2) return;
    if (!active.every(a => a.isStableCovalent())) return;

    bondFormed = true;
    let activeIdx = atoms.reduce((acc, a, i) => a.symbol !== 'NONE' ? [...acc, i] : acc, []);
    let n  = activeIdx.length;
    let cx = width / 2;
    let cy = constrain(height * 0.44, 100, 230);

    // Posicionar los átomos centrados en pantalla pero manteniendo la distancia de enlace
    // (radio_A + radio_B) × 0.75 para que la lenteja siga siendo visible.
    if (n === 2) {
        let i0 = activeIdx[0], i1 = activeIdx[1];
        let r0 = SHELL_RADII[atoms[i0].nativeMaxShell()];
        let r1 = SHELL_RADII[atoms[i1].nativeMaxShell()];
        let d  = (r0 + r1) * 0.75;
        atoms[i0].targetPos = createVector(cx - d / 2, cy);
        atoms[i1].targetPos = createVector(cx + d / 2, cy);
    } else if (n === 3) {
        let i0 = activeIdx[0], i1 = activeIdx[1], i2 = activeIdx[2];
        let r0 = SHELL_RADII[atoms[i0].nativeMaxShell()];
        let r1 = SHELL_RADII[atoms[i1].nativeMaxShell()];
        let r2 = SHELL_RADII[atoms[i2].nativeMaxShell()];
        let d01 = (r0 + r1) * 0.75;
        let d12 = (r1 + r2) * 0.75;
        // Átomo central en cx; izquierda a -d01, derecha a +d12
        atoms[i0].targetPos = createVector(cx - d01, cy);
        atoms[i1].targetPos = createVector(cx,       cy);
        atoms[i2].targetPos = createVector(cx + d12, cy);
    }

    if (elResultCard && elResultBody) {
        elResultCard.style('display', 'block');
        elResultBody.html(`
            <div class="compound-formula">${getCompoundName()}</div>
            <div class="result-detail">Enlace covalente · Par de electrones compartido</div>
        `);
    }
}

// ============================================================
// ZONA DE INTERSECCIÓN (lenteja covalente)
// ============================================================
function drawCovalentLenses() {
    for (let bond of covalentBonds) {
        let atomA = atoms[bond.atomA];
        let atomB = atoms[bond.atomB];
        if (!atomA || !atomB || atomA.symbol === 'NONE' || atomB.symbol === 'NONE') continue;

        let ax  = atomA.pos.x, ay = atomA.pos.y;
        let bx  = atomB.pos.x, by = atomB.pos.y;
        let ddx = bx - ax, ddy = by - ay;
        let d   = sqrt(ddx * ddx + ddy * ddy);
        if (d < 1) continue;

        let ang  = atan2(ddy, ddx);
        let rA   = SHELL_RADII[atomA.nativeMaxShell()];
        let rB   = SHELL_RADII[atomB.nativeMaxShell()];
        let xc   = (d * d + rA * rA - rB * rB) / (2 * d);
        let hSq  = rA * rA - xc * xc;
        let aMax = min(rA - xc, rB - (d - xc));
        if (hSq <= 0 || aMax <= 1) continue;

        let h    = sqrt(hSq);
        let semi = aMax * 0.85;

        // Centro de la elipse en coordenadas globales
        let cx = ax + xc * cos(ang);
        let cy = ay + xc * sin(ang);

        push();
        translate(cx, cy);
        rotate(ang);
        // Relleno muy tenue
        noStroke();
        fill(232, 121, 249, 22);
        ellipse(0, 0, semi * 2, h * 2);
        // Borde sutil
        noFill();
        stroke(232, 121, 249, 55);
        strokeWeight(1);
        ellipse(0, 0, semi * 2, h * 2);
        pop();
    }
}

// ============================================================
// ETIQUETAS COVALENTES EN CANVAS
// ============================================================
function drawCovalentLabels() {
    if (bondFormed && bondProgress > 0.85) return;
    for (let a of atoms) {
        if (a.symbol === 'NONE') continue;
        let maxShell = a.nativeMaxShell();
        let baseY    = a.pos.y + SHELL_RADII[maxShell] + 16;
        let eCount   = a.effectiveValenceCount();
        let target   = a.data.nobleTarget;
        let stable   = a.isStableCovalent();

        noStroke();
        textAlign(CENTER, CENTER);
        textStyle(BOLD);
        textSize(15);
        fill('#CBD5E1');
        text(a.symbol, a.pos.x, baseY);
        textSize(11);
        fill(stable ? color('#10B981') : color('#64748B'));
        text(`${eCount} / ${target} e⁻`, a.pos.x, baseY + 18);
        if (stable) {
            textSize(14);
            fill('#10B981');
            text('✔', a.pos.x, baseY + 34);
        }
        textStyle(NORMAL);
    }
}

// ============================================================
// CLASE ATOM
// ============================================================
class Atom {
    constructor(x, y, index) {
        this.pos       = createVector(x, y);
        this.targetPos = createVector(x, y);
        this.index     = index;
        this.symbol    = 'NONE';
        this.data      = ELEMENTS['NONE'];
        this.electrons = [];
        this.netCharge = 0;
    }

    setElement(sym) {
        this.symbol = sym;
        this.data   = ELEMENTS[sym];
        this.buildElectrons();
        this.calcCharge();
    }

    buildElectrons() {
        this.electrons = [];
        if (this.symbol === 'NONE') return;
        for (let n = 0; n < this.data.config.length; n++) {
            let numE  = this.data.config[n];
            let speed = max(0.008, 0.022 - n * 0.005);
            for (let e = 0; e < numE; e++) {
                this.electrons.push({
                    shell:      n,
                    radius:     SHELL_RADII[n],
                    angle:      map(e, 0, numE, 0, TWO_PI),
                    speed:      speed,
                    baseColor:  this.data.color,
                    color:      this.data.color,
                    shared:     false,
                    sharedWith: null   // índice del otro átomo si está compartido
                });
            }
        }
    }

    calcCharge() {
        if (this.symbol === 'NONE') { this.netCharge = 0; return; }
        this.netCharge = this.data.Z - this.electrons.length;
    }

    valenceShell() {
        if (!this.electrons.length) return -1;
        return Math.max(...this.electrons.map(e => e.shell));
    }

    // Outermost shell based on native config (for drawing orbits even with 0 electrons)
    nativeMaxShell() {
        return this.data.config.length - 1;
    }

    valenceCount() {
        let vs = this.valenceShell();
        return vs < 0 ? 0 : this.electrons.filter(e => e.shell === vs).length;
    }

    isStable() {
        if (this.symbol === 'NONE') return null;
        return this.valenceCount() === this.data.nobleTarget;
    }

    // Cuenta electrones efectivos en enlace covalente:
    // propios en la capa de valencia + los del par compartido aportados por el compañero.
    effectiveValenceCount() {
        if (this.symbol === 'NONE') return 0;
        let vs        = this.nativeMaxShell();
        let ownVal    = this.electrons.filter(e => e.shell === vs).length;
        let fromParts = 0;
        for (let a of atoms) {
            if (a === this) continue;
            for (let e of a.electrons) {
                if (e.shared && e.sharedWith === this.index) fromParts++;
            }
        }
        return ownVal + fromParts;
    }

    isStableCovalent() {
        if (this.symbol === 'NONE') return null;
        return this.effectiveValenceCount() === this.data.nobleTarget;
    }

    update() {
        this.pos.x = lerp(this.pos.x, this.targetPos.x, 0.05);
        this.pos.y = lerp(this.pos.y, this.targetPos.y, 0.05);
        for (let e of this.electrons) {
            // Electrones compartidos recorren la lemniscata algo más rápido
            e.angle += (currentMode === 'COVALENT' && e.shared) ? e.speed * 1.6 : e.speed;
            if (currentMode === 'COVALENT') {
                // Electrón compartido: color neutro distinto de ambos átomos
                e.color = e.shared ? '#E879F9' : e.baseColor;
            } else {
                if (bondFormed) {
                    let t   = min(bondProgress * 1.6, 1);
                    e.color = lerpColor(color(e.baseColor), color(BOND_COLOR), t);
                } else {
                    e.color = e.baseColor;
                }
            }
        }
    }

    draw() {
        if (this.symbol === 'NONE') return;

        // Always draw all native shells (even if empty after electron transfer)
        let maxShell = this.nativeMaxShell();

        noFill();
        strokeWeight(1);
        for (let s = 0; s <= maxShell; s++) {
            stroke(71, 85, 105);
            drawingContext.setLineDash([4, 5]);
            ellipse(this.pos.x, this.pos.y, SHELL_RADII[s] * 2, SHELL_RADII[s] * 2);
        }
        drawingContext.setLineDash([]);

        // Nucleus
        noStroke();
        fill(15, 23, 42, 200);
        circle(this.pos.x, this.pos.y, 52);
        fill('#E2E8F0');
        circle(this.pos.x, this.pos.y, 44);

        // Symbol + ion charge inside nucleus
        fill('#0F172A');
        textAlign(CENTER, CENTER);
        textStyle(BOLD);

        let qSup = chargeSupStr(this.netCharge);
        if (qSup === '') {
            // Neutral: just symbol centered
            textSize(13);
            text(this.symbol, this.pos.x, this.pos.y);
        } else {
            // Ion: symbol + superscript charge
            textSize(12);
            let symW = textWidth(this.symbol);
            textSize(8);
            let supW = textWidth(qSup);
            let totalW = symW + supW + 1;
            let startX = this.pos.x - totalW / 2;

            textSize(12);
            textAlign(LEFT, CENTER);
            text(this.symbol, startX, this.pos.y);

            // Charge color for superscript
            let qCol = this.netCharge > 0 ? color('#EF4444') : color('#38BDF8');
            fill(red(qCol), green(qCol), blue(qCol));
            textSize(8);
            text(qSup, startX + symW + 1, this.pos.y - 5);
        }
        textStyle(NORMAL);
        textAlign(CENTER, CENTER);

        // Electrons
        for (let e of this.electrons) {
            let ex, ey;
            if (currentMode === 'COVALENT' && e.shared) {
                // Elipse dentro de la zona de intersección.
                // IMPORTANTE: ambos electrones del par usan el mismo sistema de referencia
                // (siempre desde el átomo de índice más bajo → eje A→B consistente),
                // evitando que la transformación de coordenadas los coloque en el mismo punto.
                let partnerIdx = e.sharedWith;
                let partner    = atoms[partnerIdx];
                if (partner && partner.symbol !== 'NONE') {
                    let isLower  = this.index < partnerIdx;
                    let atomLow  = isLower ? this    : partner;
                    let atomHigh = isLower ? partner : this;
                    let ax  = atomLow.pos.x,  ay  = atomLow.pos.y;
                    let bx  = atomHigh.pos.x, by  = atomHigh.pos.y;
                    let ddx = bx - ax, ddy = by - ay;
                    let d   = sqrt(ddx * ddx + ddy * ddy);
                    if (d > 1) {
                        let ang  = atan2(ddy, ddx);
                        let rA   = SHELL_RADII[atomLow.nativeMaxShell()];
                        let rB   = SHELL_RADII[atomHigh.nativeMaxShell()];
                        let xc   = (d * d + rA * rA - rB * rB) / (2 * d);
                        let hSq  = rA * rA - xc * xc;
                        let aMax = min(rA - xc, rB - (d - xc));
                        if (hSq > 0 && aMax > 1) {
                            let h    = sqrt(hSq);
                            let semi = aMax * 0.85;
                            let lx   = xc + semi * cos(e.angle);
                            let ly   = h   * sin(e.angle);
                            ex = ax + lx * cos(ang) - ly * sin(ang);
                            ey = ay + lx * sin(ang) + ly * cos(ang);
                        } else {
                            ex = this.pos.x + cos(e.angle) * e.radius;
                            ey = this.pos.y + sin(e.angle) * e.radius;
                        }
                    } else {
                        ex = this.pos.x + cos(e.angle) * e.radius;
                        ey = this.pos.y + sin(e.angle) * e.radius;
                    }
                } else {
                    ex = this.pos.x + cos(e.angle) * e.radius;
                    ey = this.pos.y + sin(e.angle) * e.radius;
                }
            } else {
                ex = this.pos.x + cos(e.angle) * e.radius;
                ey = this.pos.y + sin(e.angle) * e.radius;
            }
            let c = color(e.color);
            noStroke();
            fill(red(c), green(c), blue(c), 55);
            circle(ex, ey, 18);
            fill(c);
            circle(ex, ey, 9);
        }
    }
}

// ============================================================
// PLACEHOLDER PARA SLOTS VACÍOS
// ============================================================
function drawEmptySlots() {
    const R = 44;
    for (let a of atoms) {
        if (a.symbol !== 'NONE') continue;
        let x = a.pos.x, y = a.pos.y;
        noFill();
        stroke(59, 130, 246, 80);
        strokeWeight(1.5);
        drawingContext.setLineDash([6, 6]);
        ellipse(x, y, R * 2, R * 2);
        drawingContext.setLineDash([]);
        noStroke();
        fill(30, 35, 60, 100);
        circle(x, y, 44);
        noStroke();
        fill(59, 130, 246, 100);
        textAlign(CENTER, CENTER);
        textSize(20);
        text('+', x, y);
    }
}

// ============================================================
// ETIQUETAS EN CANVAS (debajo del átomo)
// ============================================================
function drawAtomLabels() {
    if (bondFormed && bondProgress > 0.85) return;
    for (let a of atoms) {
        if (a.symbol === 'NONE') continue;
        let maxShell = a.nativeMaxShell();
        let baseY    = a.pos.y + SHELL_RADII[maxShell] + 16;
        let q        = a.netCharge;
        let qStr     = chargeStr(q);
        let qColor   = q < 0 ? color('#38BDF8') : (q > 0 ? color('#F87171') : color('#10B981'));

        noStroke();
        textAlign(CENTER, CENTER);
        textStyle(BOLD);
        textSize(15);
        fill('#CBD5E1');
        text(a.symbol, a.pos.x, baseY);
        textSize(14);
        fill(qColor);
        text(qStr, a.pos.x, baseY + 20);
        textStyle(NORMAL);
    }
}

// ============================================================
// TRANSFERENCIA DE ELECTRONES
// ============================================================
function transferElectron(fromIdx, toIdx) {
    let from = atoms[fromIdx];
    let to   = atoms[toIdx];
    if (from.symbol === 'NONE' || to.symbol === 'NONE') return;
    if (from.electrons.length === 0) return;

    // Si había un enlace, se deshace al ceder el electrón
    if (bondFormed) {
        bondFormed   = false;
        bondProgress = 0;
        resetAtomPositions();
        if (elResultCard) elResultCard.style('display', 'none');
    }

    let maxS = from.valenceShell();
    if (maxS < 0) return;
    let eIdx = from.electrons.findIndex(e => e.shell === maxS);
    if (eIdx < 0) return;

    let el      = from.electrons.splice(eIdx, 1)[0];
    let toShell = to.electrons.length > 0 ? to.valenceShell() : 0;
    el.shell    = toShell;
    el.radius   = SHELL_RADII[toShell];
    el.angle    = random(TWO_PI);
    el.speed    = max(0.008, 0.022 - toShell * 0.005);
    to.electrons.push(el);

    from.calcCharge();
    to.calcCharge();
    updateUIState();
    checkBondFormed();
}

// ============================================================
// LÓGICA DE ENLACE
// ============================================================
function checkBondFormed() {
    let active = atoms.filter(a => a.symbol !== 'NONE');
    if (active.length < 2) return;
    if (!active.every(a => a.isStable())) return;

    for (let i = 0; i < atoms.length - 1; i++) {
        let a1 = atoms[i], a2 = atoms[i + 1];
        if (a1.symbol === 'NONE' || a2.symbol === 'NONE') continue;
        if (a1.netCharge * a2.netCharge >= 0) return;
    }

    bondFormed = true;
    let activeIdx = atoms.reduce((acc, a, i) => a.symbol !== 'NONE' ? [...acc, i] : acc, []);
    let n         = activeIdx.length;
    let spacing   = 140;
    let cx        = width  / 2;
    let cy        = constrain(height * 0.44, 100, 230);
    for (let k = 0; k < n; k++) {
        atoms[activeIdx[k]].targetPos = createVector(cx + (k - (n - 1) / 2) * spacing, cy);
    }

    if (elResultCard && elResultBody) {
        let ionParts = active.map(a => {
            let sign = a.netCharge >= 0 ? '+' : '−';
            let abs  = Math.abs(a.netCharge);
            let sup  = abs === 1 ? sign : abs + sign;
            return `${a.symbol}<sup style="font-size:0.72em">${sup}</sup>`;
        });
        elResultCard.style('display', 'block');
        elResultBody.html(`
            <div class="compound-formula">${getCompoundName()}</div>
            <div class="result-detail">Enlace iónico · Atracción de Coulomb</div>
            <div class="result-ions">${ionParts.join(' &nbsp;+&nbsp; ')}</div>
        `);
    }
}

function updateBondAnim() {
    if (bondFormed && bondProgress < 1) {
        bondProgress = min(bondProgress + 0.012, 1);
    }
}

// ============================================================
// ACTUALIZACIÓN DEL ESTADO UI
// ============================================================
function updateUIState() {
    if (currentMode === 'COVALENT') {
        updateUIStateCovalent();
    } else {
        updateUIStateIonic();
    }
}

function updateUIStateIonic() {
    for (let i = 0; i < 3; i++) {
        let a   = atoms[i];
        let box = select(`#data-${i}`);
        if (!box) continue;

        if (a.symbol === 'NONE') {
            box.html('<div class="ui-empty">— ranura vacía —</div>');
        } else {
            let q      = a.netCharge;
            let qStr   = chargeStr(q);
            let qColor = q < 0 ? '#38BDF8' : q > 0 ? '#F87171' : '#10B981';
            let vCount = a.valenceCount();
            let target = a.data.nobleTarget;
            let stable = a.isStable();

            let diffHtml = '';
            if (!stable) {
                if (a.data.isMetal) {
                    diffHtml = `<div class="check-fail">Debe ceder ${a.valenceCount()} e⁻</div>`;
                } else {
                    let toGain = target - vCount;
                    diffHtml = toGain > 0
                        ? `<div class="check-fail">Debe ganar ${toGain} e⁻</div>`
                        : `<div class="check-fail">Exceso de ${Math.abs(toGain)} e⁻</div>`;
                }
            }

            let ruleName  = target === 2 ? 'Dueto' : 'Octeto';
            let checkHtml = stable
                ? `<div class="check-pass">✔ ${ruleName} alcanzado</div>`
                : `<div class="check-fail">✖ Configuración inestable</div>`;

            box.html(`
                <div>Carga: <b style="color:${qColor}">${qStr}</b></div>
                <div>e⁻ valencia: ${vCount} / ${target}</div>
                ${diffHtml}
                <div style="margin-top:3px">${checkHtml}</div>
            `);
        }
    }
    updateButtonStates();
}

function updateUIStateCovalent() {
    for (let i = 0; i < 3; i++) {
        let a   = atoms[i];
        let box = select(`#data-${i}`);
        if (!box) continue;

        if (a.symbol === 'NONE') {
            box.html('<div class="ui-empty">— ranura vacía —</div>');
        } else {
            let eEff     = a.effectiveValenceCount();
            let target   = a.data.nobleTarget;
            let stable   = a.isStableCovalent();
            let ruleName = target === 2 ? 'Dueto' : 'Octeto';
            let need     = target - eEff;
            let bonds    = covalentBonds.filter(b => b.atomA === i || b.atomB === i).length;

            let needHtml = stable ? '' :
                `<div class="check-fail">Faltan ${need} e⁻ para ${ruleName.toLowerCase()}</div>`;
            let checkHtml = stable
                ? `<div class="check-pass">✔ ${ruleName} alcanzado</div>`
                : `<div class="check-fail">✖ ${ruleName} no alcanzado</div>`;
            let bondsHtml = bonds > 0
                ? `<div>Enlaces formados: <b>${bonds}</b></div>` : '';

            box.html(`
                <div>e⁻ efectivos: <b>${eEff} / ${target}</b></div>
                ${bondsHtml}
                ${needHtml}
                <div style="margin-top:3px">${checkHtml}</div>
            `);
        }
    }
    // Mostrar/ocultar conectores y habilitar/deshabilitar sus botones
    let conn01 = document.getElementById('bond-01');
    let conn12 = document.getElementById('bond-12');
    let both01 = atoms[0].symbol !== 'NONE' && atoms[1].symbol !== 'NONE';
    let both12 = atoms[1].symbol !== 'NONE' && atoms[2].symbol !== 'NONE';
    if (conn01) conn01.style.display = both01 ? 'flex' : 'none';
    if (conn12) conn12.style.display = both12 ? 'flex' : 'none';
    setBtn('btn-cov-01', canShareCovalent(0, 1));
    setBtn('btn-cov-12', canShareCovalent(1, 2));
    setBtn('btn-rec-01', canRecoverCovalent(0, 1));
    setBtn('btn-rec-12', canRecoverCovalent(1, 2));
}

// ============================================================
// ESTADO DE BOTONES
// ============================================================
function updateButtonStates() {
    setBtn('btn-0r', canTransfer(0, 1));
    setBtn('btn-1l', canTransfer(1, 0));
    setBtn('btn-1r', canTransfer(1, 2));
    setBtn('btn-2l', canTransfer(2, 1));
}

function canTransfer(fromIdx, toIdx) {
    let from = atoms[fromIdx], to = atoms[toIdx];
    if (!from || !to) return false;
    if (from.symbol === 'NONE' || to.symbol === 'NONE') return false;
    if (from.electrons.length === 0) return false;
    if (from.valenceShell() < 0) return false;
    return true;
}

function setBtn(id, enabled) {
    let b = select(`#${id}`);
    if (!b) return;
    if (enabled) b.removeAttribute('disabled');
    else         b.attribute('disabled', '');
}

// ============================================================
// FUERZAS ELECTROSTÁTICAS
// ============================================================
function drawForces() {
    let atomCY = constrain(height * 0.44, 100, 230);
    let maxR   = maxElectronRadius(atoms);
    // Keep force line clearly above the bond rect (which has top at atomCY - maxR - 24)
    let lineY  = max(atomCY - maxR - 48, 14);

    for (let i = 0; i < atoms.length - 1; i++) {
        let a1 = atoms[i], a2 = atoms[i + 1];
        if (a1.symbol === 'NONE' || a2.symbol === 'NONE') continue;

        let midX     = (a1.pos.x + a2.pos.x) / 2;
        let attracts = a1.netCharge * a2.netCharge < 0;

        if (attracts) {
            stroke('#FBBF24');
            strokeWeight(2);
            drawingContext.setLineDash([8, 6]);
            line(a1.pos.x, lineY, a2.pos.x, lineY);
            drawingContext.setLineDash([]);

            let q1x = a1.pos.x + (a2.pos.x - a1.pos.x) * 0.28;
            let q2x = a1.pos.x + (a2.pos.x - a1.pos.x) * 0.72;
            drawArrowHead(a1.pos.x, lineY, q1x, lineY, '#FBBF24');
            drawArrowHead(a2.pos.x, lineY, q2x, lineY, '#FBBF24');

            noStroke();
            fill('#FBBF24');
            textAlign(CENTER, BOTTOM);
            textSize(11);
            text('⚡ Atracción electrostática', midX, lineY - 4);
            fill('#10B981');
            textSize(15);
            textAlign(CENTER, TOP);
            text('✔', midX, lineY + 3);
        } else {
            noStroke();
            fill('#64748B');
            textAlign(CENTER, BOTTOM);
            textSize(11);
            text('Sin atracción electrostática', midX, lineY - 4);
            fill('#EF4444');
            textSize(15);
            textAlign(CENTER, TOP);
            text('✖', midX, lineY + 3);
        }
    }
}

function drawArrowHead(x1, y1, x2, y2, col) {
    let ang  = atan2(y2 - y1, x2 - x1);
    let size = 9;
    fill(col);
    noStroke();
    push();
    translate(x2, y2);
    rotate(ang);
    triangle(-size, size / 2, -size, -size / 2, 0, 0);
    pop();
}

// ============================================================
// EFECTO VISUAL DEL ENLACE
// ============================================================
function drawBondEffect() {
    let active = atoms.filter(a => a.symbol !== 'NONE');
    if (active.length < 2) return;

    let maxR = maxElectronRadius(active);
    let pad  = maxR + 24;
    let minX = Math.min(...active.map(a => a.pos.x)) - pad;
    let maxX = Math.max(...active.map(a => a.pos.x)) + pad;
    let minY = Math.min(...active.map(a => a.pos.y)) - pad;
    let maxY = Math.max(...active.map(a => a.pos.y)) + pad;
    let alpha = map(bondProgress, 0, 1, 0, 255);

    noStroke();
    fill(16, 185, 129, alpha * 0.09);
    rect(minX, minY, maxX - minX, maxY - minY, 20);

    noFill();
    stroke(16, 185, 129, alpha);
    strokeWeight(3);
    rect(minX, minY, maxX - minX, maxY - minY, 20);

    if (bondProgress > 0.75) {
        let a3 = map(bondProgress, 0.75, 1, 0, 255);
        let bx = width / 2, by = height * 0.82;
        noStroke();
        fill(16, 185, 129, a3 * 0.18);
        rect(bx - 180, by - 20, 360, 40, 10);
        fill(16, 185, 129, a3);
        textAlign(CENTER, CENTER);
        textSize(17);
        textStyle(BOLD);
        let msg = currentMode === 'COVALENT' ? '¡Enlace covalente formado!' : '¡Enlace iónico formado!';
        text(msg, bx, by);
        textStyle(NORMAL);
    }
}

// ============================================================
// PANTALLA "PRÓXIMAMENTE" (solo para modos sin implementar)
// ============================================================
function drawComingSoon() {
    let bw = 310, bh = 84;
    let bx = (width - bw) / 2, by = (height - bh) / 2;
    noStroke();
    fill(30, 35, 52);
    rect(bx, by, bw, bh, 12);
    stroke('#2b3147');
    strokeWeight(1.5);
    noFill();
    rect(bx, by, bw, bh, 12);
    drawingContext.setLineDash([]);
    noStroke();
    fill('#64748B');
    textAlign(CENTER, CENTER);
    textSize(13);
    text('Esta modalidad está en desarrollo', width / 2, height / 2 - 13);
    fill('#475569');
    textSize(11);
    text('Selecciona Enlace Iónico para comenzar', width / 2, height / 2 + 13);
}

// ============================================================
// TARJETA DE INFORMACIÓN POR MODO
// ============================================================
function updateModeInfoCard(mode) {
    let content = document.getElementById('mode-info-content');
    if (!content) return;
    if (mode === 'IONIC') {
        content.innerHTML = `
            <p><b>1.</b> Elige un <em>metal</em> y un <em>no metal</em> en las ranuras A / B / C.</p>
            <p><b>2.</b> Pulsa <em>Ceder e⁻</em> para transferir electrones de valencia.</p>
            <p><b>3.</b> Cuando los iones tienen cargas opuestas y configuración de gas noble (<b>octeto</b> o <b>dueto</b>), la atracción de <b>Coulomb</b> forma el enlace.</p>
            <p>Prueba con <b>MgCl₂</b>, <b>Na₂O</b> o <b>KF</b> usando las tres ranuras.</p>`;
    } else if (mode === 'METALLIC') {
        content.innerHTML = `
            <p><b>1.</b> Los átomos metálicos <em>ceden</em> sus e⁻ de valencia a un <em>mar compartido</em>.</p>
            <p><b>2.</b> La red de <b>cationes</b> y el <b>mar de e⁻</b> se atraen: eso <em>es</em> el enlace metálico.</p>
            <p>Pulsa <em>Aplicar voltaje</em> para ver la <b>conductividad</b>, o <em>Deformar red</em> para la <b>maleabilidad</b>.</p>`;
    } else {
        content.innerHTML = `<p>Selecciona un modo para comenzar.</p>`;
    }
}

// ============================================================
// ENLACE METÁLICO — INICIALIZACIÓN
// ============================================================
function initMetallicSimulation() {
    latticeAtoms  = [];
    freeElectrons = [];

    let colSp = (width  * 0.60) / (LATTICE_COLS - 1);
    let rowSp = (height * 0.58) / (LATTICE_ROWS - 1);
    latticeSpacing = constrain(min(colSp, rowSp), 60, 92);

    let totalW    = (LATTICE_COLS - 1) * latticeSpacing;
    let totalH    = (LATTICE_ROWS - 1) * latticeSpacing;
    latticeStartX = width  / 2 - totalW / 2;
    latticeStartY = height / 2 - totalH / 2;

    for (let r = 0; r < LATTICE_ROWS; r++) {
        for (let c = 0; c < LATTICE_COLS; c++) {
            latticeAtoms.push({
                baseX: latticeStartX + c * latticeSpacing,
                y:     latticeStartY + r * latticeSpacing,
                row: r, col: c,
            });
        }
    }

    const metal = METALLIC_METALS[metallicMetal];
    const numE  = LATTICE_COLS * LATTICE_ROWS * metal.valence;
    const pad   = latticeSpacing * 0.6;
    const minX  = latticeStartX - pad;
    const maxX  = latticeStartX + (LATTICE_COLS - 1) * latticeSpacing + pad;
    const minY  = latticeStartY - pad;
    const maxY  = latticeStartY + (LATTICE_ROWS - 1) * latticeSpacing + pad;

    for (let i = 0; i < numE; i++) {
        let spd = random(0.8, 1.8), ang = random(TWO_PI);
        freeElectrons.push({
            x: random(minX, maxX), y: random(minY, maxY),
            vx: cos(ang) * spd,   vy: sin(ang) * spd,
        });
    }
}

// ============================================================
// ENLACE METÁLICO — UI
// ============================================================
function buildMetallicUI() {
    let metallicMetalSel = null;

    // Reiniciar
    let resetRow = createDiv().class('reset-row');
    let resetBtn = createButton('↺ Reiniciar simulación');
    resetBtn.mousePressed(() => {
        if (metallicMetalSel) metallicMetal = metallicMetalSel.value();
        metallicPhase = 'normal';
        deformOffset  = 0; deformTarget = 0; deformDone = false;
        initMetallicSimulation();
        if (elBtnVoltage) elBtnVoltage.html('⚡ Aplicar voltaje');
        if (elBtnDeform)  elBtnDeform.html('↔ Deformar red');
        refreshMetallicInfo();
    });
    resetRow.child(resetBtn);
    uiContainer.child(resetRow);

    // Selector de metal
    let selCard  = createDiv().class('card');
    selCard.child(createDiv('Metal').class('atom-card-label'));
    let selBody  = createDiv().class('card-body-static');
    metallicMetalSel = createSelect();
    for (let sym in METALLIC_METALS) {
        let m = METALLIC_METALS[sym];
        metallicMetalSel.option(`${sym} — ${m.name}  (${m.valence} e⁻ val.)`, sym);
    }
    metallicMetalSel.value(metallicMetal);
    metallicMetalSel.changed(() => {
        metallicMetal = metallicMetalSel.value();
        metallicPhase = 'normal';
        deformOffset  = 0; deformTarget = 0; deformDone = false;
        initMetallicSimulation();
        if (elBtnVoltage) elBtnVoltage.html('⚡ Aplicar voltaje');
        if (elBtnDeform)  elBtnDeform.html('↔ Deformar red');
        refreshMetallicInfo();
    });
    selBody.child(metallicMetalSel);
    selCard.child(selBody);
    uiContainer.child(selCard);

    // Estado del enlace
    let infoCard = createDiv().class('card');
    infoCard.child(createDiv('Estado del enlace').class('atom-card-label'));
    elMetallicInfo = createDiv().class('card-body-static');
    infoCard.child(elMetallicInfo);
    uiContainer.child(infoCard);

    // Experimentos
    let actCard = createDiv().class('card');
    actCard.child(createDiv('Experimentos').class('atom-card-label'));
    let actBody = createDiv().class('card-body-static');

    elBtnVoltage = createButton('⚡ Aplicar voltaje');
    elBtnVoltage.class('btn-primary');
    elBtnVoltage.style('width', '100%').style('margin-bottom', '5px');
    elBtnVoltage.mousePressed(() => {
        if (metallicPhase === 'voltage') {
            metallicPhase = 'normal';
            for (let e of freeElectrons) {
                let spd = random(0.8, 1.8), ang = random(TWO_PI);
                e.vx = cos(ang) * spd; e.vy = sin(ang) * spd;
            }
            elBtnVoltage.html('⚡ Aplicar voltaje');
        } else {
            metallicPhase = 'voltage';
            deformOffset  = 0; deformTarget = 0; deformDone = false;
            for (let e of freeElectrons) {
                e.vx = random(0.8, 2.2); e.vy = random(-0.5, 0.5);
            }
            elBtnVoltage.html('■ Quitar voltaje');
            if (elBtnDeform) elBtnDeform.html('↔ Deformar red');
        }
        refreshMetallicInfo();
    });
    actBody.child(elBtnVoltage);

    elBtnDeform = createButton('↔ Deformar red');
    elBtnDeform.style('width', '100%');
    elBtnDeform.mousePressed(() => {
        if (metallicPhase === 'deform') {
            metallicPhase = 'normal';
            deformOffset  = 0; deformTarget = 0; deformDone = false;
            elBtnDeform.html('↔ Deformar red');
        } else {
            metallicPhase = 'deform';
            deformTarget  = latticeSpacing * 0.5;
            deformDone    = false;
            elBtnVoltage.html('⚡ Aplicar voltaje');
            elBtnDeform.html('↺ Restaurar red');
        }
        refreshMetallicInfo();
    });
    actBody.child(elBtnDeform);

    actCard.child(actBody);
    uiContainer.child(actCard);

    refreshMetallicInfo();
}

function refreshMetallicInfo() {
    if (!elMetallicInfo) return;
    const metal    = METALLIC_METALS[metallicMetal];
    const numE     = LATTICE_COLS * LATTICE_ROWS * metal.valence;
    const phaseMap = {
        normal:  `<span style="color:#10B981">Normal (equilibrio)</span>`,
        voltage: `<span style="color:#FBBF24">⚡ Voltaje aplicado</span>`,
        deform:  `<span style="color:#F59E0B">↔ Deformando red</span>`,
    };
    elMetallicInfo.html(`
        <div>Metal: <b style="color:${metal.color}">${metallicMetal} — ${metal.name}</b></div>
        <div>e⁻ de valencia: <b>${metal.valence}</b> por átomo</div>
        <div>Catión: <b>${metallicMetal}<sup>${metal.charge}+</sup></b></div>
        <div>e⁻ en el mar: <b>${numE}</b></div>
        <div style="margin-top:4px">Estado: ${phaseMap[metallicPhase] || '—'}</div>
    `);
}

// ============================================================
// ENLACE METÁLICO — BUCLE DE DIBUJO
// ============================================================
function drawMetallic() {
    updateMetallicElectrons();
    updateDeformAnim();
    drawMetallicSeaBg();
    drawLatticeAtoms();
    drawFreeElectrons();
    drawMetallicOverlay();
}

function updateMetallicElectrons() {
    const pad  = latticeSpacing * 0.65;
    const minX = latticeStartX - pad;
    const maxX = latticeStartX + (LATTICE_COLS - 1) * latticeSpacing + pad;
    const minY = latticeStartY - pad;
    const maxY = latticeStartY + (LATTICE_ROWS - 1) * latticeSpacing + pad;

    for (let e of freeElectrons) {
        if (metallicPhase === 'voltage') {
            e.vx += 0.045;
            if (e.vx > 2.8) e.vx = 2.8;
        } else {
            if (random() < 0.012) {
                e.vx += random(-0.4, 0.4);
                e.vy += random(-0.4, 0.4);
            }
            let spd = sqrt(e.vx * e.vx + e.vy * e.vy);
            if (spd > 2.2) { e.vx = e.vx / spd * 2.2; e.vy = e.vy / spd * 2.2; }
            if (spd < 0.3) { e.vx *= 1.3; e.vy *= 1.3; }
        }

        e.x += e.vx;
        e.y += e.vy;

        if (metallicPhase === 'voltage') {
            if (e.x > maxX) e.x = minX;
            if (e.x < minX) e.x = maxX;
            if (e.y < minY || e.y > maxY) { e.vy *= -1; e.y = constrain(e.y, minY, maxY); }
        } else {
            if (e.x < minX || e.x > maxX) { e.vx *= -1; e.x = constrain(e.x, minX, maxX); }
            if (e.y < minY || e.y > maxY) { e.vy *= -1; e.y = constrain(e.y, minY, maxY); }
        }
    }
}

function updateDeformAnim() {
    if (metallicPhase !== 'deform' || deformDone) return;
    deformOffset = lerp(deformOffset, deformTarget, 0.025);
    if (abs(deformOffset - deformTarget) < 0.8) {
        deformOffset = deformTarget;
        deformDone   = true;
    }
}

// ── Fondo del mar de electrones ──────────────────────────────
function drawMetallicSeaBg() {
    const metal  = METALLIC_METALS[metallicMetal];
    const c      = color(metal.color);
    const cR = red(c), cG = green(c), cB = blue(c);
    const pad    = latticeSpacing * 0.65;
    const rx     = latticeStartX - pad;
    const ry     = latticeStartY - pad;
    const rw     = (LATTICE_COLS - 1) * latticeSpacing + pad * 2;
    const rh     = (LATTICE_ROWS - 1) * latticeSpacing + pad * 2;
    const pulse  = sin(frameCount * 0.022) * 0.5 + 0.5;

    noStroke();
    fill(cR, cG, cB, 11 + pulse * 7);
    rect(rx, ry, rw, rh, 16);

    noFill();
    stroke(cR, cG, cB, 52 + pulse * 32);
    strokeWeight(1.5);
    rect(rx, ry, rw, rh, 16);
}

// ── Red cristalina de cationes ────────────────────────────────
function drawLatticeAtoms() {
    const metal   = METALLIC_METALS[metallicMetal];
    const c       = color(metal.color);
    const cR = red(c), cG = green(c), cB = blue(c);
    const nucSize = max(latticeSpacing * 0.40, 26);
    const orbitR  = latticeSpacing * 0.36;
    const sup     = metal.charge === 1 ? '+' : metal.charge + '+';

    for (let atom of latticeAtoms) {
        let ax = atom.baseX;
        if (metallicPhase === 'deform' && atom.row < 2) ax += deformOffset;

        // Órbita (punteada)
        noFill();
        stroke(cR, cG, cB, 28);
        strokeWeight(1);
        drawingContext.setLineDash([3, 4]);
        ellipse(ax, atom.y, orbitR * 2, orbitR * 2);
        drawingContext.setLineDash([]);

        // Halo
        noStroke();
        fill(cR, cG, cB, 16);
        circle(ax, atom.y, nucSize + 12);

        // Núcleo
        fill(cR, cG, cB, 215);
        circle(ax, atom.y, nucSize);

        // Símbolo + carga
        fill('#0F172A');
        textStyle(BOLD);
        let symSize = max(nucSize * 0.34, 10);
        let supSize = max(nucSize * 0.22, 7);
        textSize(symSize);
        textAlign(LEFT, CENTER);
        let symW  = textWidth(metallicMetal);
        textSize(supSize);
        let supW  = textWidth(sup);
        let tX    = ax - (symW + supW + 1) / 2;
        textSize(symSize);
        text(metallicMetal, tX, atom.y);
        textSize(supSize);
        text(sup, tX + symW + 1, atom.y - max(nucSize * 0.11, 4));
        textStyle(NORMAL);
        textAlign(CENTER, CENTER);
    }
}

// ── Mar de electrones libres ──────────────────────────────────
function drawFreeElectrons() {
    noStroke();
    for (let e of freeElectrons) {
        fill(80, 160, 255, 30);
        circle(e.x, e.y, 22);
        fill(140, 200, 255, 75);
        circle(e.x, e.y, 13);
        fill(215, 235, 255);
        circle(e.x, e.y, 6);
    }
}

// ── Indicadores de experimento ────────────────────────────────
function drawMetallicOverlay() {
    if      (metallicPhase === 'voltage') drawVoltageOverlay();
    else if (metallicPhase === 'deform')  drawDeformOverlay();
}

function drawVoltageOverlay() {
    const pad    = latticeSpacing * 0.65;
    const rightX = latticeStartX + (LATTICE_COLS - 1) * latticeSpacing + pad + 32;
    const leftX  = latticeStartX - pad - 32;
    const midY   = latticeStartY + ((LATTICE_ROWS - 1) * latticeSpacing) / 2;
    const topY   = latticeStartY - pad;
    const botY   = latticeStartY + (LATTICE_ROWS - 1) * latticeSpacing + pad;

    // Electrodos
    noStroke();
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(22);
    fill('#EF4444');
    text('+', rightX, midY);
    fill('#38BDF8');
    text('−', leftX, midY);
    textStyle(NORMAL);

    // Etiquetas
    fill('#94A3B8');
    textAlign(CENTER, BOTTOM);
    textSize(11);
    text('e⁻  →', width / 2, topY - 6);
    fill('#FBBF24');
    text('←  I  (corriente convencional)', width / 2, topY - 20);

    // Mensaje inferior
    noStroke();
    fill(16, 185, 129, 220);
    textAlign(CENTER, CENTER);
    textSize(14);
    textStyle(BOLD);
    text('⚡ Conductividad eléctrica', width / 2, botY + 22);
    textStyle(NORMAL);
}

function drawDeformOverlay() {
    const pad     = latticeSpacing * 0.65;
    const leftX   = latticeStartX - pad;
    const botY    = latticeStartY + (LATTICE_ROWS - 1) * latticeSpacing + pad;
    const shearY  = latticeStartY + latticeSpacing * 1.5; // entre fila 1 y fila 2

    // Flecha de fuerza sobre la mitad superior
    let arrowEnd   = leftX - 8;
    let arrowStart = arrowEnd - 42;
    stroke('#F59E0B');
    strokeWeight(2.5);
    line(arrowStart, shearY - latticeSpacing * 0.5, arrowEnd, shearY - latticeSpacing * 0.5);
    push();
    translate(arrowEnd, shearY - latticeSpacing * 0.5);
    fill('#F59E0B');
    noStroke();
    triangle(-9, 5, -9, -5, 0, 0);
    pop();
    noStroke();
    fill('#F59E0B');
    textAlign(RIGHT, CENTER);
    textSize(11);
    text('Fuerza', arrowStart - 4, shearY - latticeSpacing * 0.5);

    // Línea de plano de cizalladura
    let regX = latticeStartX - pad;
    let regW = (LATTICE_COLS - 1) * latticeSpacing + pad * 2 + deformOffset;
    stroke(148, 163, 184, 90);
    strokeWeight(1);
    drawingContext.setLineDash([5, 4]);
    line(regX, shearY, regX + regW, shearY);
    drawingContext.setLineDash([]);

    // Mensaje cuando la deformación termina
    if (deformDone) {
        noStroke();
        fill(16, 185, 129, 220);
        textAlign(CENTER, CENTER);
        textSize(14);
        textStyle(BOLD);
        text('El enlace no se rompe — maleabilidad', width / 2, botY + 22);
        textStyle(NORMAL);
    }
}

// ============================================================
// NOMBRE DEL COMPUESTO
// ============================================================
// Orden de citación IUPAC (Red Book, tabla IR-4.2): menor índice = se cita antes
const IUPAC_ORDER = ['B','Si','C','Sb','As','P','N','H','Te','Se','S','O','I','Br','Cl','F'];

function iupacIndex(sym) {
    let i = IUPAC_ORDER.indexOf(sym);
    return i === -1 ? 999 : i;
}

function getCompoundName() {
    let syms = atoms.filter(a => a.symbol !== 'NONE').map(a => a.symbol);
    let counts = {};
    syms.forEach(s => counts[s] = (counts[s] || 0) + 1);
    let metals    = [...new Set(syms.filter(s =>  ELEMENTS[s].isMetal))];
    let nonMetals = [...new Set(syms.filter(s => !ELEMENTS[s].isMetal))];
    // Ordenar no-metales según secuencia IUPAC
    nonMetals.sort((a, b) => iupacIndex(a) - iupacIndex(b));
    let result = '';
    for (let m  of metals)    result += m  + (counts[m]  > 1 ? toSub(counts[m])  : '');
    for (let nm of nonMetals) result += nm + (counts[nm] > 1 ? toSub(counts[nm]) : '');
    return result || syms.join('');
}

function toSub(n) {
    return String(n).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
}
