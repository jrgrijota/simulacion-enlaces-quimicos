// ============================================================
// DATOS QUÍMICOS
// ============================================================
const SHELL_RADII = [36, 60, 84, 108];
const BOND_COLOR             = '#F59E0B';
const TRANSFERRED_ELEC_COLOR = '#94A3B8';
let   _BOND_COLOR_OBJ        = null; // initialized in setup() once p5 is ready
let   _COVALENT_COLOR_OBJ    = null;
let   _TRANSFERRED_COLOR_OBJ = null;

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

// Ionic crystal lattice state
let ionicCrystalMode      = false;
let ionicCrystalPhase     = 'normal'; // 'normal' | 'voltage' | 'shear'
let ionicStructure        = null; // estructura real (selectIonicStructure)
let ionicLayer            = null; // capa 2D de la red (buildCrystalLayer)
let ionicLayerScale       = 1;    // px por Å en la vista 2D
let ionicCrystalW         = 0;    // tamaño de la capa en px
let ionicCrystalH         = 0;
let ionicCrystalSpacing   = 72;   // distancia catión–anión en px
let ionicCrystalStartX    = 0;
let ionicCrystalStartY    = 0;
let ionicCrystalAtoms     = [];
let ionicCrystalPairs     = [];   // [ionA, ionB] vecinos catión–anión (atracción)
let ionicCrystalRowArrays = []; // cached per-row slices for fast access
let ionicCatSym         = '';
let ionicCatColor       = '';
let ionicCatCharge      = 0;
let ionicAnSym          = '';
let ionicAnColor        = '';
let ionicAnCharge       = 0;
let ionicShearModel     = null;  // modelo físico de la interfaz (js/crystal-shear.js)
let ionicShearState     = null;  // dinámica del bloque superior
let ionicShearFrac      = 0;     // fuerza aplicada / resistencia del cristal
let ionicShearOpen      = 0;     // apertura de la grieta tras la rotura (px)
const SHEAR_SLIDER_MAX  = 150;   // el slider llega al 150 % de la resistencia
let ionicVibTime        = 0;
let ionicShowShearForces  = false;
let ionicShowElectrons    = false;
let ionicCatElecConfig    = []; // [{shell, transferred}] snapshot at crystal entry
let ionicAnElecConfig     = [];
let _crystalBtnBounds      = null; // set each frame when the canvas button is visible
let _crystalBackBtnBounds  = null;
let _crystalPauseBtnBounds = null;
let elBtnCrystalView    = null;
let elBtnIonicVoltage2  = null;
let elBtnIonicShear2    = null;
let elSliderShear       = null;
let elSliderShearLabel  = null;
let elIonicCrystalInfo  = null;

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
// Tamaño lógico del lienzo: el del marco. En pantallas estrechas no baja de
// 720×540, porque los átomos se dibujan con radios de capa fijos y no caben en
// menos; entonces el lienzo se escala solo visualmente (ver @media en style.css).
const MIN_CANVAS_W = 720;
function frameCanvasSize() {
    let frame = document.getElementById('sim-frame');
    if (frame.offsetWidth < MIN_CANVAS_W) return { w: MIN_CANVAS_W, h: MIN_CANVAS_W * 3 / 4 };
    return { w: frame.offsetWidth, h: frame.offsetHeight };
}
function fitCanvasToFrame() {
    let s = frameCanvasSize();
    resizeCanvas(s.w, s.h);
}

function setup() {
    let s    = frameCanvasSize();
    let cnv  = createCanvas(s.w, s.h);
    cnv.parent('sim-frame');
    frameRate(60);
    _BOND_COLOR_OBJ        = color(BOND_COLOR);
    _COVALENT_COLOR_OBJ    = color('#E879F9');
    _TRANSFERRED_COLOR_OBJ = color(TRANSFERRED_ELEC_COLOR);
    uiContainer = select('#ui-overlay');
    select('#mode-select').changed(handleModeChange);
    initSimulation();
}

function draw() {
    background('#0F172A');
    if (currentMode === 'IONIC') {
        if (ionicCrystalMode) {
            drawIonicCrystal();
        } else {
            updateBondAnim();
            drawForces();
            for (let a of atoms) { a.update(); a.draw(); }
            drawEmptySlots();
            drawAtomLabels();
            if (bondFormed) drawBondEffect();
        }
    } else if (currentMode === 'METALLIC') {
        drawMetallic();
    } else if (currentMode === 'COVALENT' && covCrystalMode) {
        drawCovalentCrystal(); // js/covalent-crystal-mode.js
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
    fitCanvasToFrame();
    repositionForNewSize();
}

// Recalculates positions after resize without destroying simulation state
function repositionForNewSize() {
    if (currentMode === 'IONIC' && !ionicCrystalMode) {
        let cx = width / 2, cy = constrain(height * 0.44, 100, 230);
        origPositions = [
            createVector(cx - width * 0.26, cy),
            createVector(cx,                cy),
            createVector(cx + width * 0.26, cy)
        ];
        if (!bondFormed) {
            for (let i = 0; i < atoms.length; i++) {
                if (origPositions[i]) {
                    atoms[i].pos.set(origPositions[i]);
                    atoms[i].targetPos.set(origPositions[i]);
                }
            }
        }
    } else if (currentMode === 'IONIC' && ionicCrystalMode) {
        initIonicCrystalGrid(); // recalculates base positions; phase/offsets preserved
    } else if (currentMode === 'COVALENT') {
        let cx = width / 2, cy = constrain(height * 0.44, 100, 230);
        origPositions = [
            createVector(cx - width * 0.26, cy),
            createVector(cx,                cy),
            createVector(cx + width * 0.26, cy)
        ];
        if (covalentBonds.length === 0) {
            for (let i = 0; i < atoms.length; i++) {
                if (origPositions[i]) {
                    atoms[i].pos.set(origPositions[i]);
                    atoms[i].targetPos.set(origPositions[i]);
                }
            }
        }
    } else if (currentMode === 'METALLIC') {
        // Preserve experiment state, reinit grid with new canvas dimensions
        let ph = metallicPhase, dO = deformOffset, dT = deformTarget, dD = deformDone;
        initMetallicSimulation();
        metallicPhase = ph; deformOffset = dO; deformTarget = dT; deformDone = dD;
    }
}

function handleModeChange() {
    currentMode = this.value();
    let ctrlRow = document.getElementById('atom-controls-row');
    let showRow = currentMode === 'IONIC' || currentMode === 'COVALENT';
    if (ctrlRow) ctrlRow.style.display = showRow ? 'flex' : 'none';
    fitCanvasToFrame();
    initSimulation();
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

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

// Vacía los controles de átomo bajo el canvas (selectores, carga, botones)
function clearAtomControls() {
    ['ctrl-0', 'ctrl-1', 'ctrl-2'].forEach(id => {
        let el = select(`#${id}`);
        if (el) el.html('');
    });
    ['bond-01', 'bond-12'].forEach(id => {
        let el = document.getElementById(id);
        if (el) { el.innerHTML = ''; el.style.display = 'none'; }
    });
}

function initSimulation() {
    if (!isLooping()) {
        loop();
        let btn = document.getElementById('pause-btn');
        if (btn) { btn.textContent = '⏸ Pausar'; btn.classList.remove('btn-primary'); }
    }

    uiContainer.html('');
    clearAtomControls();
    // Las vistas de red ocultan el botón de pausa de la barra lateral
    let pauseBtnEl = document.getElementById('pause-btn');
    if (pauseBtnEl) pauseBtnEl.style.display = '';

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
    elBtnVoltage        = null;
    elBtnDeform         = null;
    elMetallicInfo      = null;
    ionicCrystalMode    = false;
    covCrystalMode      = false;
    ionicCrystalPhase   = 'normal';
    ionicShearModel     = null;
    ionicShearState     = null;
    ionicShearFrac      = 0;
    ionicShearOpen      = 0;
    ionicVibTime          = 0;

    ionicShowShearForces   = false;
    ionicShowElectrons     = false;
    ionicCatElecConfig     = [];
    ionicAnElecConfig      = [];
    ionicCrystalAtoms      = [];
    ionicCrystalRowArrays  = [];
    _crystalBackBtnBounds  = null;
    _crystalPauseBtnBounds = null;
    elBtnCrystalView       = null;
    elBtnIonicVoltage2     = null;
    elBtnIonicShear2       = null;
    elSliderShear          = null;
    elSliderShearLabel     = null;
    elIonicCrystalInfo     = null;

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
    for (let i = 0; i < atoms.length; i++) {
        atoms[i].buildElectrons();
        atoms[i].calcCharge();
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
    // También se llama al volver de la red cristalina: vaciar antes para no
    // duplicar selectores ni cajas de carga (ids data-*)
    clearAtomControls();

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

    // El botón "Ver red cristalina" se dibuja en el canvas (ver drawBondEffect)

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
            let b = createButton('Cede un electrón a B').id('btn-0r');
            b.mousePressed(() => transferElectron(0, 1));
            btnBox.child(b);
        } else if (i === 1) {
            let bL = createButton('Cede un electrón a A').id('btn-1l');
            bL.mousePressed(() => transferElectron(1, 0));
            let bR = createButton('Cede un electrón a C').id('btn-1r');
            bR.mousePressed(() => transferElectron(1, 2));
            btnBox.child(bL);
            btnBox.child(bR);
        } else {
            let b = createButton('Cede un electrón a B').id('btn-2l');
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
    // También se llama al volver de los cristales: vaciar antes para no
    // duplicar selectores ni cajas de estado
    clearAtomControls();

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

    // Sidebar: acceso a los cristales covalentes (js/covalent-crystal-mode.js)
    let cCard = createDiv().class('card');
    cCard.child(createDiv('Sólidos covalentes').class('atom-card-label'));
    let cBody = createDiv().class('card-body-static');
    let cBtn = createButton('🔷 Ver cristales covalentes');
    cBtn.class('btn-primary');
    cBtn.style('width', '100%');
    cBtn.mousePressed(enterCovalentCrystal);
    cBody.child(cBtn);
    let cHint = createDiv('Diamante, grafito, sílice y hielo seco');
    cHint.style('font-size', '10.5px').style('color', 'var(--text-muted)')
         .style('text-align', 'center').style('margin-top', '5px');
    cBody.child(cHint);
    cCard.child(cBody);
    uiContainer.child(cCard);

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
    let dat01 = createButton('');
    dat01.elt.innerHTML = '<span style="font-size:13px">→</span><br>Dativo';
    dat01.id('btn-dat-01');
    dat01.class('bond-connector-btn bond-dative-btn');
    dat01.mousePressed(() => shareElectronDative(0, 1));
    conn01.child(dat01);
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
    let dat12 = createButton('');
    dat12.elt.innerHTML = '<span style="font-size:13px">→</span><br>Dativo';
    dat12.id('btn-dat-12');
    dat12.class('bond-connector-btn bond-dative-btn');
    dat12.mousePressed(() => shareElectronDative(1, 2));
    conn12.child(dat12);
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

// Returns the covalent bond distance between two atoms such that their
// valence shells overlap but neither valence shell reaches the inner shell of the other.
function covalentBondDist(idxA, idxB) {
    let a   = atoms[idxA], b   = atoms[idxB];
    let msA = a.nativeMaxShell(), msB = b.nativeMaxShell();
    let rA  = SHELL_RADII[msA],   rB  = SHELL_RADII[msB];
    let dBase = (rA + rB) * 0.75;
    // Enforce: valence of A must not reach inner shell of B (and vice versa)
    let dMin = max(
        msB > 0 ? rA + SHELL_RADII[msB - 1] + 2 : 0,
        msA > 0 ? rB + SHELL_RADII[msA - 1] + 2 : 0
    );
    return max(dBase, dMin);
}

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
    eA.angle  = random(TWO_PI);
    eB.shared = true;  eB.sharedWith = idxA;
    eB.angle  = eA.angle + PI;
    // Equalize orbital speed so both electrons stay π apart as they orbit the lens
    const sharedSpeed = (eA.speed + eB.speed) * 0.5;
    eA._origSpeed = eA.speed;  eA.speed = sharedSpeed;
    eB._origSpeed = eB.speed;  eB.speed = sharedSpeed;
    covalentBonds.push({ atomA: idxA, atomB: idxB, eA, eB });

    // Acercar los átomos hasta que sus capas de valencia se solapen.
    // El átomo 1 (centro) es el ancla; los exteriores (0 y 2) se mueven hacia él.
    let outerIdx = (idxA === 1) ? idxB : idxA;
    let innerIdx = (idxA === 1) ? idxA : idxB;
    let dTarget  = covalentBondDist(outerIdx, innerIdx);
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
    bond.eA.dative     = false;
    bond.eA.color      = bond.eA.baseColor;
    if (bond.eA._origSpeed !== undefined) { bond.eA.speed = bond.eA._origSpeed; delete bond.eA._origSpeed; }
    bond.eB.shared     = false;
    bond.eB.sharedWith = undefined;
    bond.eB.dative     = false;
    bond.eB.color      = bond.eB.baseColor;
    if (bond.eB._origSpeed !== undefined) { bond.eB.speed = bond.eB._origSpeed; delete bond.eB._origSpeed; }
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

// ----- ENLACE DATIVO (COORDINADO) -----
// A diferencia del covalente normal, el par compartido lo aporta ENTERO un solo
// átomo (el dador, desde un par solitario); el otro (el aceptor) solo pone un
// orbital vacío. Ej.: en el SO₂, el azufre cede un par a uno de los oxígenos (S→O).

// Decide quién es dador (tiene par solitario libre) y quién aceptor (le faltan
// exactamente 2 e⁻ para el octeto). Devuelve {donor, acceptor} o null.
function resolveDative(idxA, idxB) {
    let a = atoms[idxA], b = atoms[idxB];
    if (!a || !b) return null;
    if (a.symbol === 'NONE' || b.symbol === 'NONE') return null;
    if (bondFormed) return null;
    // Prueba cada átomo como dador; prioriza la dirección idxA→idxB.
    for (let [dIdx, accIdx] of [[idxA, idxB], [idxB, idxA]]) {
        let donor = atoms[dIdx], acc = atoms[accIdx];
        let vsD   = donor.nativeMaxShell();
        let freeD = donor.electrons.filter(e => e.shell === vsD && !e.shared).length;
        let accNeed = acc.data.nobleTarget - acc.effectiveValenceCount();
        if (freeD >= 2 && accNeed >= 2) return { donor: dIdx, acceptor: accIdx };
    }
    return null;
}

function canShareDative(idxA, idxB) {
    return resolveDative(idxA, idxB) !== null;
}

function shareElectronDative(idxA, idxB) {
    if (bondFormed) return;
    let res = resolveDative(idxA, idxB);
    if (!res) return;
    let { donor, acceptor } = res;
    let donorA = atoms[donor];

    // El dador aporta DOS electrones (un par solitario) de su capa de valencia.
    let vsD    = donorA.nativeMaxShell();
    let freeEs = donorA.electrons.filter(e => e.shell === vsD && !e.shared);
    if (freeEs.length < 2) return;
    let eD1 = freeEs[0], eD2 = freeEs[1];

    // Ambos quedan compartidos CON EL ACEPTOR (que así suma +2 en su octeto).
    eD1.shared = true; eD1.sharedWith = acceptor; eD1.dative = true; eD1.angle = random(TWO_PI);
    eD2.shared = true; eD2.sharedWith = acceptor; eD2.dative = true; eD2.angle = eD1.angle + PI;
    const sharedSpeed = (eD1.speed + eD2.speed) * 0.5;
    eD1._origSpeed = eD1.speed; eD1.speed = sharedSpeed;
    eD2._origSpeed = eD2.speed; eD2.speed = sharedSpeed;
    covalentBonds.push({ atomA: donor, atomB: acceptor, eA: eD1, eB: eD2, dative: true, donor, acceptor });

    // Acercar el átomo exterior hacia el central (índice 1), igual que en el covalente.
    let outerIdx = (idxA === 1) ? idxB : idxA;
    let innerIdx = (idxA === 1) ? idxA : idxB;
    let dTarget  = covalentBondDist(outerIdx, innerIdx);
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
        let d  = covalentBondDist(i0, i1);
        atoms[i0].targetPos = createVector(cx - d / 2, cy);
        atoms[i1].targetPos = createVector(cx + d / 2, cy);
    } else if (n === 3) {
        let i0 = activeIdx[0], i1 = activeIdx[1], i2 = activeIdx[2];
        let d01 = covalentBondDist(i0, i1);
        let d12 = covalentBondDist(i1, i2);
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
        if (bond.dative) {
            // Enlace dativo: lenteja tintada con el color del dador + flecha dador→aceptor.
            let dc = atoms[bond.donor] ? color(atoms[bond.donor].data.color) : color(232, 121, 249);
            noStroke();
            fill(red(dc), green(dc), blue(dc), 30);
            ellipse(0, 0, semi * 2, h * 2);
            noFill();
            stroke(red(dc), green(dc), blue(dc), 90);
            strokeWeight(1);
            ellipse(0, 0, semi * 2, h * 2);
            // Flecha a lo largo del eje de enlace, apuntando al aceptor (+x local).
            let tip = semi * 0.95;
            stroke(red(dc), green(dc), blue(dc), 230);
            strokeWeight(1.6);
            line(-semi * 0.95, 0, tip, 0);
            line(tip, 0, tip - 5, -4);
            line(tip, 0, tip - 5,  4);
        } else {
            // Relleno muy tenue
            noStroke();
            fill(232, 121, 249, 22);
            ellipse(0, 0, semi * 2, h * 2);
            // Borde sutil
            noFill();
            stroke(232, 121, 249, 55);
            strokeWeight(1);
            ellipse(0, 0, semi * 2, h * 2);
        }
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
                const baseCol    = this.data.color;
                const baseColObj = color(baseCol);
                this.electrons.push({
                    shell:        n,
                    radius:       SHELL_RADII[n],
                    angle:        map(e, 0, numE, 0, TWO_PI),
                    speed:        speed,
                    baseColor:    baseCol,
                    baseColorObj: baseColObj,
                    color:        baseColObj, // always a p5.Color after first update
                    shared:       false,
                    sharedWith:   null
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
                // Covalente: color neutro distinto de ambos átomos.
                // Dativo: ambos e⁻ conservan el color del dador (se ve de dónde salen).
                e.color = e.shared ? (e.dative ? e.baseColorObj : _COVALENT_COLOR_OBJ) : e.baseColorObj;
            } else {
                if (bondFormed) {
                    let t      = min(bondProgress * 1.6, 1);
                    let target = e.transferred ? _TRANSFERRED_COLOR_OBJ : _BOND_COLOR_OBJ;
                    e.color    = lerpColor(e.baseColorObj, target, t);
                } else {
                    e.color = e.baseColorObj;
                }
            }
        }
    }

    draw() {
        if (this.symbol === 'NONE') return;

        let maxShell = this.nativeMaxShell();

        noFill();
        strokeWeight(1);

        // In covalent mode, inner shells are clipped to this atom's side of each bond
        let _bondedPartners = [];
        if (currentMode === 'COVALENT') {
            for (let b of covalentBonds) {
                let pIdx = b.atomA === this.index ? b.atomB :
                           b.atomB === this.index ? b.atomA : -1;
                if (pIdx >= 0 && atoms[pIdx] && atoms[pIdx].symbol !== 'NONE') {
                    _bondedPartners.push(atoms[pIdx]);
                }
            }
        }

        for (let s = 0; s <= maxShell; s++) {
            // Ocultar la capa más externa si no le quedan electrones (cedidos)
            if (s === maxShell && !this.electrons.some(e => e.shell === s)) continue;
            stroke(71, 85, 105);
            drawingContext.setLineDash([4, 5]);

            if (s < maxShell && _bondedPartners.length > 0) {
                // Inner shell: clip to this atom's half-plane for each bonded partner
                drawingContext.save();
                for (let partner of _bondedPartners) {
                    let mx  = (this.pos.x + partner.pos.x) * 0.5;
                    let my  = (this.pos.y + partner.pos.y) * 0.5;
                    let ang = atan2(partner.pos.y - this.pos.y, partner.pos.x - this.pos.x);
                    let perp = ang + HALF_PI;
                    const R  = 2000;
                    let cA = cos(ang), sA = sin(ang), cP = cos(perp), sP = sin(perp);
                    drawingContext.beginPath();
                    drawingContext.moveTo(mx + cP * R,            my + sP * R);
                    drawingContext.lineTo(mx - cP * R,            my - sP * R);
                    drawingContext.lineTo(mx - cP * R - cA * R,   my - sP * R - sA * R);
                    drawingContext.lineTo(mx + cP * R - cA * R,   my + sP * R - sA * R);
                    drawingContext.closePath();
                    drawingContext.clip();
                }
                ellipse(this.pos.x, this.pos.y, SHELL_RADII[s] * 2, SHELL_RADII[s] * 2);
                drawingContext.restore();
            } else {
                ellipse(this.pos.x, this.pos.y, SHELL_RADII[s] * 2, SHELL_RADII[s] * 2);
            }
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

            fill('#0F172A');
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
            // e.color is always a p5.Color (set in update())
            noStroke();
            fill(red(e.color), green(e.color), blue(e.color), 55);
            circle(ex, ey, 18);
            fill(e.color);
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
        stroke(59, 130, 246, 100);
        strokeWeight(1.5);
        drawingContext.setLineDash([6, 6]);
        ellipse(x, y, R * 2, R * 2);
        drawingContext.setLineDash([]);
        noStroke();
        fill(20, 28, 58, 160);
        circle(x, y, 44);
        fill(100, 160, 255, 210);
        textAlign(CENTER, CENTER);
        textSize(22);
        text('+', x, y - 1);
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
    el.shell       = toShell;
    el.radius      = SHELL_RADII[toShell];
    el.angle       = random(TWO_PI);
    el.speed       = max(0.008, 0.022 - toShell * 0.005);
    el.transferred = true;
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
        // El botón se dibuja en el canvas; _crystalBtnBounds se actualiza en drawBondEffect
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
                    // Un metal se estabiliza cediendo justo sus electrones de valencia:
                    // si ya ha cedido más (p. ej. Na²⁺), tiene que recuperar los que sobran.
                    let nativeVal = a.data.config[a.data.config.length - 1];
                    let toLose    = nativeVal - q;
                    diffHtml = toLose > 0
                        ? `<div class="check-todo">Le falta ceder ${toLose} e⁻</div>`
                        : `<div class="check-fail">Ha cedido de más: debe recuperar ${-toLose} e⁻</div>`;
                } else {
                    let toGain = target - vCount;
                    diffHtml = toGain > 0
                        ? `<div class="check-todo">Le falta ganar ${toGain} e⁻</div>`
                        : `<div class="check-fail">Exceso de ${Math.abs(toGain)} e⁻</div>`;
                }
            }

            let ruleName  = target === 2 ? 'Dueto' : 'Octeto';
            // Antes de empezar no hay ningún error: el átomo aún no tiene su capa
            // externa completa. El rojo se reserva para cuando se ha pasado.
            let pasado = diffHtml.includes('check-fail');
            let checkHtml = stable
                ? `<div class="check-pass">✔ ${ruleName} alcanzado</div>`
                : pasado
                    ? `<div class="check-fail">✖ Se ha pasado del ${ruleName.toLowerCase()}</div>`
                    : `<div class="check-todo">Aún sin ${ruleName.toLowerCase()}</div>`;

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
                `<div class="check-fail">${need === 1 ? "Falta 1 e⁻" : `Faltan ${need} e⁻`} para ${ruleName.toLowerCase()}</div>`;
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
    setBtn('btn-dat-01', canShareDative(0, 1));
    setBtn('btn-dat-12', canShareDative(1, 2));
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
        let bx = width / 2, by = constrain(height * 0.82, height * 0.72, height - 38);
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

        // Botón "Ver red cristalina" — dibujado en canvas, solo en modo iónico
        if (currentMode === 'IONIC' && bondProgress >= 0.98) {
            const bW = 214, bH = 38;
            const bBx = bx - bW / 2;
            const bBy = constrain(by + 30, by + 30, height - bH - 10);
            const hover = mouseX >= bBx && mouseX <= bBx + bW &&
                          mouseY >= bBy && mouseY <= bBy + bH;
            noStroke();
            fill(16, 185, 129, hover ? 52 : 20);
            rect(bBx, bBy, bW, bH, 99);
            stroke(16, 185, 129, hover ? 230 : 120);
            strokeWeight(1.5);
            noFill();
            rect(bBx, bBy, bW, bH, 99);
            drawingContext.setLineDash([]);
            noStroke();
            fill(hover ? 236 : 16, hover ? 253 : 185, hover ? 245 : 129);
            textSize(12);
            textStyle(BOLD);
            text('Ver red cristalina →', bx, bBy + bH / 2);
            textStyle(NORMAL);
            _crystalBtnBounds = { x: bBx, y: bBy, w: bW, h: bH };
        } else {
            _crystalBtnBounds = null;
        }
    } else {
        _crystalBtnBounds = null;
    }
}

// Giro y selección en el visor 3D de cristales (js/crystal-3d.js)
function mousePressed()  { crystal3DMousePressed(); }
function mouseDragged()  { return crystal3DMouseDragged(); }
function mouseReleased() { crystal3DMouseReleased(); }

function mouseClicked() {
    const inCovCrystal = currentMode === 'COVALENT' && covCrystalMode;
    if (ionicCrystalMode || inCovCrystal) {
        if (_crystalBackBtnBounds) {
            let r = _crystalBackBtnBounds;
            if (mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) {
                if (inCovCrystal) exitCovalentCrystal();
                else exitIonicCrystal();
                return;
            }
        }
        if (_crystalPauseBtnBounds) {
            let r = _crystalPauseBtnBounds;
            if (mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) {
                togglePause();
                return;
            }
        }
        return;
    }
    if (!_crystalBtnBounds) return;
    let r = _crystalBtnBounds;
    if (mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) {
        enterIonicCrystal();
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
    // Clear the legacy duplicate slot to prevent double content
    let legacy = document.getElementById('mode-info');
    if (legacy) legacy.innerHTML = '';

    let content = document.getElementById('mode-info-content');
    if (!content) return;

    if (mode === 'IONIC') {
        content.innerHTML = `
            <p>Un <em>metal</em> cede electrones a un <em>no metal</em> — ambos alcanzan el octeto y quedan con cargas opuestas. La atracción de <b>Coulomb</b> entre iones forma el enlace.</p>
            <p>Elige átomos, pulsa <em>Cede un electrón a …</em> y observa la transferencia. Prueba <b>NaCl</b>, <b>MgCl₂</b> o <b>Na₂O</b>.</p>`;
    } else if (mode === 'METALLIC') {
        content.innerHTML = `
            <p>Los metales ceden sus e⁻ de valencia a un <em>mar de electrones</em> deslocalizados que mantiene cohesionada la red de <b>cationes</b>.</p>
            <p>Usa <em>Aplicar voltaje</em> para ver la <b>conductividad</b> y <em>Deformar red</em> para la <b>maleabilidad</b>.</p>`;
    } else if (mode === 'COVALENT') {
        content.innerHTML = `
            <p>Dos <em>no metales</em> comparten electrones de valencia. El par compartido orbita entre ambos núcleos y cuenta para el octeto de los dos átomos.</p>
            <p>Pulsa <em>Compartir</em> en cada ranura. Prueba <b>H₂</b>, <b>Cl₂</b>, <b>HCl</b> o <b>H₂O</b> (A=H, B=O, C=H).</p>
            <p>En el <em>enlace dativo</em> (→) el par lo aporta <b>un solo átomo</b> (el dador, desde un par solitario) y el otro pone un orbital vacío. Monta el <b>SO₂</b> (A=O, B=S, C=O): doble enlace <em>Compartir</em> en O=S y <em>Dativo</em> en S→O.</p>`;
    } else {
        content.innerHTML = `<p>Selecciona un modo para comenzar.</p>`;
    }
}

// ============================================================
// ENLACE IÓNICO — RED CRISTALINA
// ============================================================
function enterIonicCrystal() {
    let active = atoms.filter(a => a.symbol !== 'NONE');
    let cation = active.find(a => a.netCharge > 0);
    let anion  = active.find(a => a.netCharge < 0);
    if (!cation || !anion) return;

    // Red real según catión, anión y proporción (p. ej. Na₂S → antifluorita)
    ionicStructure = selectIonicStructure(
        active.filter(a => a.netCharge > 0).map(a => ({ sym: a.symbol, charge: a.netCharge })),
        active.filter(a => a.netCharge < 0).map(a => ({ sym: a.symbol, charge: a.netCharge }))
    );
    if (!ionicStructure) return;
    ionicLayer = buildCrystalLayer(ionicStructure);
    ionicCatSym    = cation.symbol;
    ionicCatColor  = cation.data.color;
    ionicCatCharge = cation.netCharge;
    ionicAnSym     = anion.symbol;
    ionicAnColor   = anion.data.color;
    ionicAnCharge  = anion.netCharge;

    // La escena 3D copia símbolos y colores: crearla después de asignarlos
    ionicView  = '3d';
    crystal3DAutoRotate = true;
    initIonicCrystal3D();

    // Snapshot electron config before clearing bond state
    ionicCatElecConfig = cation.electrons.map(e => ({ shell: e.shell, transferred: !!e.transferred }));
    ionicAnElecConfig  = anion.electrons.map(e => ({ shell: e.shell, transferred: !!e.transferred }));

    ionicCrystalMode   = true;
    ionicCrystalPhase  = 'normal';
    ionicShearModel    = null; // se construye al usar la cizalladura
    ionicShearState    = null;
    ionicShearFrac     = 0;
    ionicShearOpen     = 0;
    ionicVibTime       = 0;

    let ctrlRow = document.getElementById('atom-controls-row');
    if (ctrlRow) ctrlRow.style.display = 'none';
    let pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.style.display = 'none';
    fitCanvasToFrame();

    uiContainer.html('');
    initIonicCrystalGrid();
    buildIonicCrystalUI();
}

function exitIonicCrystal() {
    ionicCrystalMode       = false;
    ionicCrystalPhase      = 'normal';

    ionicShowShearForces   = false;
    ionicShowElectrons     = false;
    _crystalBackBtnBounds  = null;
    _crystalPauseBtnBounds = null;
    elBtnCrystalView       = null;
    elBtnIonicVoltage2     = null;
    elBtnIonicShear2       = null;
    elSliderShear          = null;
    elSliderShearLabel     = null;
    elIonicCrystalInfo     = null;

    let ctrlRow = document.getElementById('atom-controls-row');
    if (ctrlRow) ctrlRow.style.display = 'flex';
    let pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.style.display = '';
    fitCanvasToFrame();

    uiContainer.html('');
    buildIonicUI();
    updateUIState();
    if (bondFormed) checkBondFormed();
}

function initIonicCrystalGrid() {
    ionicCrystalAtoms     = [];
    ionicCrystalRowArrays = [];
    ionicCrystalPairs     = [];
    if (!ionicLayer) return;
    const L = ionicLayer;

    // Escala px/Å: la capa ocupa ~64 % del ancho y ~60 % del alto útil,
    // sin que la distancia catión–anión supere 88 px
    const btmReserve = 66; // space at the bottom for canvas buttons
    ionicLayerScale = min((width * 0.64) / L.width,
                          ((height - btmReserve) * 0.60) / L.height,
                          88 / L.dMin);
    ionicCrystalSpacing = L.dMin * ionicLayerScale;
    ionicCrystalW = L.width  * ionicLayerScale;
    ionicCrystalH = L.height * ionicLayerScale;
    ionicCrystalStartX = width  / 2 - ionicCrystalW / 2;
    ionicCrystalStartY = (height - btmReserve) / 2 - ionicCrystalH / 2;

    // Tamaño proporcional al radio iónico (los aniones suelen ser mayores)
    const rSum = ionicStructure.cat.radius + ionicStructure.an.radius;
    const kinds = {};
    for (const kind of ['cat', 'an']) {
        const isCat   = kind === 'cat';
        const radius  = isCat ? ionicStructure.cat.radius : ionicStructure.an.radius;
        const nucSize = max(ionicCrystalSpacing * 0.84 * radius / rSum, 20);
        const sym     = isCat ? ionicCatSym : ionicAnSym;
        const charge  = isCat ? ionicCatCharge : ionicAnCharge;
        const sup     = charge > 0
            ? (charge === 1 ? '+' : charge + '+')
            : (Math.abs(charge) === 1 ? '−' : Math.abs(charge) + '−');
        // Cache RGB to avoid color() constructor each frame
        const col = color(isCat ? ionicCatColor : ionicAnColor);
        // Precompute text metrics for the draw loop
        const symSz  = max(nucSize * 0.32, 10);
        const supSz  = max(nucSize * 0.22, 7);
        const supShY = max(nucSize * 0.12, 4);
        textStyle(BOLD);
        textSize(symSz); const symW = textWidth(sym);
        textSize(supSz); const supW = textWidth(sup);
        textStyle(NORMAL);
        kinds[kind] = {
            sym, sup, charge, isCat, color: isCat ? ionicCatColor : ionicAnColor,
            r: red(col), g: green(col), b: blue(col),
            nucSize, symSz, supSz, supShY, symW, supW,
            elCfg: isCat ? ionicCatElecConfig : ionicAnElecConfig,
        };
    }

    for (const site of L.ions) {
        const k  = kinds[site.kind];
        const bx = ionicCrystalStartX + site.x * ionicLayerScale;
        const by = ionicCrystalStartY + site.y * ionicLayerScale;

        // Count electrons per shell so we can space them evenly
        const shellCounts = {};
        for (let e of k.elCfg) shellCounts[e.shell] = (shellCounts[e.shell] || 0) + 1;
        const shellIdx = {}; // running index per shell for angle assignment
        const shellOffset = {}; // random starting offset per shell
        for (let s in shellCounts) {
            shellIdx[s] = 0;
            shellOffset[s] = random(TWO_PI);
        }
        const elAngles = k.elCfg.map(e => {
            const idx   = shellIdx[e.shell]++;
            const total = shellCounts[e.shell];
            return {
                shell:       e.shell,
                transferred: e.transferred,
                angle:       shellOffset[e.shell] + (TWO_PI / total) * idx,
                speed:       max(0.008, 0.022 - e.shell * 0.005)
            };
        });
        ionicCrystalAtoms.push({
            sym: k.sym, sup: k.sup, color: k.color, r: k.r, g: k.g, b: k.b,
            charge: k.charge, isCat: k.isCat,
            baseX: bx, baseY: by,
            x: bx, y: by,
            row: site.row,
            vibPhase: random(TWO_PI),
            // pre-baked draw constants
            symW: k.symW, supW: k.supW, symSz: k.symSz, supSz: k.supSz, supShY: k.supShY,
            nucSize: k.nucSize,
            elAngles,
        });
    }

    // Pares catión–anión vecinos (líneas de atracción de Coulomb)
    const maxD = ionicCrystalSpacing * 1.12;
    for (let i = 0; i < ionicCrystalAtoms.length; i++) {
        for (let j = i + 1; j < ionicCrystalAtoms.length; j++) {
            const a = ionicCrystalAtoms[i], b = ionicCrystalAtoms[j];
            if (a.isCat === b.isCat) continue;
            if (dist(a.baseX, a.baseY, b.baseX, b.baseY) <= maxD) ionicCrystalPairs.push([a, b]);
        }
    }

    // Cache slices by row for O(1) lookup in overlay code
    for (let r = 0; r < L.rowYs.length; r++) {
        ionicCrystalRowArrays[r] = ionicCrystalAtoms.filter(ion => ion.row === r);
    }
}

function buildIonicCrystalUI() {
    uiContainer.html('');

    // Selector de vista: celda unidad 3D o capa 2D con experimentos
    let vCard = createDiv().class('card');
    vCard.child(createDiv('Vista').class('atom-card-label'));
    let vBody = createDiv().class('card-body-static');
    let vRow  = createDiv();
    vRow.style('display', 'flex').style('gap', '6px');
    for (const [id, lbl] of [['3d', '🧊 Celda 3D'], ['2d', '▦ Capa 2D']]) {
        let b = createButton(lbl);
        if (ionicView === id) b.class('btn-primary');
        b.style('flex', '1');
        b.mousePressed(() => setIonicView(id));
        vRow.child(b);
    }
    vBody.child(vRow);
    vCard.child(vBody);
    uiContainer.child(vCard);

    buildIonicCrystalInfoCard();

    if (ionicView === '3d') buildIonicCrystal3DControls();
    else                    buildIonicCrystal2DControls();
}

// Tarjeta con la estructura real del cristal (nivel ESO)
function buildIonicCrystalInfoCard() {
    const s = ionicStructure;
    const ion = (sym, q) => `<b>${sym}<sup style="font-size:0.72em">${chargeStr(q)}</sup></b>`;
    const cat = ion(s.cat.sym, s.cat.charge);
    const an  = ion(s.an.sym,  s.an.charge);
    const qStr = q => (q > 0 ? '+' : '−') + Math.abs(q);

    // "2 Na⁺ por cada S²⁻", "1 Ca²⁺ por cada 2 F⁻"
    const ratio = `${s.ratio.cat} ${cat} por cada ${s.ratio.an > 1 ? s.ratio.an + ' ' : ''}${an}`;
    const balance = `${s.ratio.cat}·(${qStr(s.cat.charge)}) + ${s.ratio.an}·(${qStr(s.an.charge)}) = 0`;

    let viewText;
    if (ionicView === '2d') {
        viewText = 'Vista de una <b>capa</b> de la red: conserva la proporción de iones del cristal.' +
                   (s.layerNote ? ' ' + s.layerNote : '');
    } else if (s.id === 'cdcl2') {
        viewText = `Se muestran dos <b>láminas</b> ${s.an.sym}–${s.cat.sym}–${s.an.sym}. Entre láminas las fuerzas son débiles, por eso el cristal se separa en escamas.`;
    } else {
        viewText = 'La <b>celda unidad</b> es la parte más pequeña de la red que, repetida en todas las direcciones, forma el cristal.';
    }

    let card = createDiv().class('card');
    card.child(createDiv('Red cristalina').class('atom-card-label'));
    let body = createDiv().class('card-body-static');
    body.html(`
        <div class="compound-formula">${getCompoundName()}</div>
        <div class="result-detail">${s.name}</div>
        <div class="result-detail" style="margin-bottom:8px">${s.lattice}</div>
        <div class="info-section">
            <p><em>Proporción:</em> ${ratio}<br>
               <span style="opacity:0.8">${balance} → cristal neutro</span></p>
            <p><em>Entorno:</em> cada ${cat} está rodeado de ${s.cn.cat} ${an} y cada ${an} de ${s.cn.an} ${cat}.</p>
            <p>${viewText}</p>
            ${s.note ? `<p class="crystal-note">⚠ ${s.note}</p>` : ''}
        </div>
    `);
    card.child(body);
    uiContainer.child(card);
}

function setIonicView(view) {
    if (ionicView === view) return;
    ionicView = view;
    // Al cambiar de vista se parte de la red en reposo
    ionicCrystalPhase = 'normal';
    resetIonicShear();
    ionicShowShearForces = false;
    ionicShowElectrons   = false;
    selectCrystal3DAtom(-1);
    buildIonicCrystalUI();
    if (!isLooping()) redraw();
}

function buildIonicCrystal3DControls() {
    let fCard = createDiv().class('card');
    let fBody = createDiv().class('card-body-static');
    fCard.child(createDiv('Visualización').class('atom-card-label'));
    fCard.child(fBody);

    createAutoRotateCheckbox(fBody);

    let hint = createDiv('Los experimentos de voltaje y cizalladura están en la vista <b>Capa 2D</b>.');
    hint.style('font-size', '10.5px').style('color', 'var(--text-muted)').style('margin-top', '6px');
    fBody.child(hint);

    uiContainer.child(fCard);
}

function buildIonicCrystal2DControls() {
    // Experimentos
    let expCard = createDiv().class('card');
    expCard.child(createDiv('Experimentos').class('atom-card-label'));
    let expBody = createDiv().class('card-body-static');

    elBtnIonicVoltage2 = createButton('⚡ Aplicar voltaje');
    elBtnIonicVoltage2.class('btn-primary');
    elBtnIonicVoltage2.style('width', '100%').style('margin-bottom', '5px');
    elBtnIonicVoltage2.mousePressed(() => {
        if (ionicCrystalPhase === 'voltage') {
            ionicCrystalPhase = 'normal';
            ionicVibTime = 0;
            elBtnIonicVoltage2.html('⚡ Aplicar voltaje');
        } else {
            ionicCrystalPhase = 'voltage';
            resetIonicShear();
            ionicCrystalPhase = 'voltage';
            elBtnIonicVoltage2.html('■ Quitar voltaje');
        }
    });
    expBody.child(elBtnIonicVoltage2);

    // ── Fuerza de cizalladura (en % de la resistencia del cristal) ──
    let shearRow = createDiv();
    shearRow.style('display', 'flex').style('justify-content', 'space-between')
            .style('align-items', 'center').style('margin-bottom', '4px');
    let shearLblText = createDiv('Fuerza lateral aplicada');
    shearLblText.style('font-size', '11px').style('color', 'var(--text-muted)');
    elSliderShearLabel = createDiv('0 %');
    elSliderShearLabel.style('font-size', '11px').style('color', 'var(--accent)')
                      .style('font-weight', '600').style('min-width', '40px')
                      .style('text-align', 'right');
    shearRow.child(shearLblText);
    shearRow.child(elSliderShearLabel);
    expBody.child(shearRow);

    elSliderShear = createElement('input');
    elSliderShear.attribute('type', 'range');
    elSliderShear.attribute('min', '0');
    elSliderShear.attribute('max', String(SHEAR_SLIDER_MAX));
    elSliderShear.attribute('value', '0');
    elSliderShear.style('width', '100%').style('cursor', 'pointer')
                 .style('accent-color', 'var(--accent)').style('margin-bottom', '2px');
    elSliderShear.elt.addEventListener('input', () => {
        const v = parseInt(elSliderShear.elt.value);
        ensureIonicShearModel();
        ionicShearFrac = v / 100;
        if (v > 0 && ionicCrystalPhase !== 'shear') {
            ionicCrystalPhase = 'shear';
            ionicVibTime = 0;
            elBtnIonicVoltage2.html('⚡ Aplicar voltaje');
        }
        updateShearSliderLabel();
        if (!isLooping()) redraw();
    });
    expBody.child(elSliderShear);

    // Marca del 100 % (resistencia del cristal) bajo el slider
    let scale = createDiv();
    scale.style('position', 'relative').style('height', '14px').style('font-size', '9.5px')
         .style('color', 'var(--text-muted)');
    const pct = (100 / SHEAR_SLIDER_MAX) * 100;
    let tick = createDiv('▲ resistencia');
    tick.style('position', 'absolute').style('left', `calc(${pct}% - 6px)`).style('white-space', 'nowrap')
        .style('color', '#F59E0B');
    scale.child(tick);
    expBody.child(scale);

    let resetShear = createButton('↺ Recomponer el cristal');
    resetShear.style('width', '100%').style('margin-top', '6px').style('font-size', '11px');
    resetShear.mousePressed(() => { resetIonicShear(); if (!isLooping()) redraw(); });
    expBody.child(resetShear);

    expCard.child(expBody);
    uiContainer.child(expCard);

    // Checkboxes de visualización
    let fCard = createDiv().class('card');
    let fBody = createDiv().class('card-body-static');
    fCard.child(createDiv('Visualización').class('atom-card-label'));
    fCard.child(fBody);

    // Checkbox — ver fuerza resultante macroscópica
    // Checkbox — fuerzas individuales en plano de cizalladura
    let sLabel = createDiv();
    sLabel.style('display', 'flex').style('align-items', 'center').style('gap', '8px')
          .style('cursor', 'pointer').style('padding', '2px 0').style('margin-top', '4px');
    let sChk = createElement('input');
    sChk.attribute('type', 'checkbox');
    sChk.attribute('id', 'chk-shear-forces');
    sChk.style('width', '14px').style('height', '14px').style('cursor', 'pointer')
        .style('accent-color', 'var(--accent)');
    sChk.elt.checked = false;
    let sLbl = createElement('label', 'Fuerzas entre los dos bloques');
    sLbl.attribute('for', 'chk-shear-forces');
    sLbl.style('font-size', '11.5px').style('color', 'var(--text-label)')
        .style('cursor', 'pointer').style('user-select', 'none');
    sLabel.child(sChk); sLabel.child(sLbl);
    fBody.child(sLabel);
    sChk.elt.addEventListener('change', () => { ionicShowShearForces = sChk.elt.checked; });

    // Checkbox — ver electrones
    let eLabel = createDiv();
    eLabel.style('display', 'flex').style('align-items', 'center').style('gap', '8px')
          .style('cursor', 'pointer').style('padding', '2px 0');
    let eChk = createElement('input');
    eChk.attribute('type', 'checkbox');
    eChk.attribute('id', 'chk-electrons');
    eChk.style('width', '14px').style('height', '14px').style('cursor', 'pointer')
        .style('accent-color', 'var(--accent)');
    eChk.elt.checked = false;
    let eLbl = createElement('label', 'Ver electrones');
    eLbl.attribute('for', 'chk-electrons');
    eLbl.style('font-size', '11.5px').style('color', 'var(--text-label)')
        .style('cursor', 'pointer').style('user-select', 'none');
    eLabel.child(eChk); eLabel.child(eLbl);
    fBody.child(eLabel);
    eChk.elt.addEventListener('change', () => { ionicShowElectrons = eChk.elt.checked; });

    uiContainer.child(fCard);
}

// ── Bucle principal ───────────────────────────────────────────
function drawIonicCrystal() {
    if (ionicView === '3d') {
        drawCrystal3D(); // js/crystal-3d.js
        drawIonicCrystalButtons();
        return;
    }
    updateIonicCrystalPhysics();
    drawIonicCrystalBg();
    drawIonicCoulombLines();
    drawIonicCrystalGrid();
    if (ionicShowElectrons)   drawIonicCrystalElectrons();
    if (ionicShowShearForces) drawIonicShearLineForces();
    drawIonicCrystalOverlay();
    drawIonicCrystalButtons();
}

function updateIonicCrystalPhysics() {
    if (ionicCrystalPhase === 'voltage') {
        ionicVibTime += 0.055;
        for (let ion of ionicCrystalAtoms) {
            ion.x = ion.baseX + sin(ionicVibTime * 2.4 + ion.vibPhase) * 2.8;
            ion.y = ion.baseY + cos(ionicVibTime * 1.9 + ion.vibPhase) * 2.8;
        }
    } else if (ionicCrystalPhase === 'shear') {
        updateIonicShearPhysics();
    } else {
        for (let ion of ionicCrystalAtoms) {
            ion.x = lerp(ion.x, ion.baseX, 0.09);
            ion.y = lerp(ion.y, ion.baseY, 0.09);
        }
    }
    if (ionicShowElectrons) {
        for (let ion of ionicCrystalAtoms) {
            for (let e of ion.elAngles) { e.angle += e.speed; }
        }
    }
}

function drawIonicCrystalBg() {
    const pad   = ionicCrystalSpacing * 0.72;
    const rx    = ionicCrystalStartX - pad;
    const ry    = ionicCrystalStartY - pad;
    const rw    = ionicCrystalW + pad * 2;
    const rh    = ionicCrystalH + pad * 2;
    const pulse = sin(frameCount * 0.018) * 0.5 + 0.5;

    noStroke();
    fill(59, 130, 246, 6 + pulse * 5);
    rect(rx, ry, rw, rh, 16);
    noFill();
    stroke(59, 130, 246, 30 + pulse * 22);
    strokeWeight(1.5);
    rect(rx, ry, rw, rh, 16);
}

function drawIonicCoulombLines() {
    drawingContext.setLineDash([3, 4]);
    strokeWeight(1);
    stroke(255, 255, 255, 16);
    const split = ionicLayer.shear.splitRow;
    const cracked = ionicCrystalPhase === 'shear' && ionicShearState && ionicShearState.fractured;
    for (const [a, b] of ionicCrystalPairs) {
        if (cracked && (a.row <= split) !== (b.row <= split)) continue;
        line(a.x, a.y, b.x, b.y);
    }
    drawingContext.setLineDash([]);
}

function drawIonicCrystalGrid() {
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    for (let ion of ionicCrystalAtoms) {
        const { r: cR, g: cG, b: cB, nucSize, symSz, supSz, supShY, symW, supW } = ion;

        noStroke();
        fill(cR, cG, cB, 18);
        circle(ion.x, ion.y, nucSize + 14);
        fill(cR, cG, cB, 210);
        circle(ion.x, ion.y, nucSize);

        fill('#0F172A');
        const tX = ion.x - (symW + supW + 1) / 2;
        textSize(symSz);
        text(ion.sym, tX, ion.y);
        textSize(supSz);
        text(ion.sup, tX + symW + 1, ion.y - supShY);
    }
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
}

function drawIonicCrystalElectrons() {
    // Faint dot-dash orbits + electron dots, scaled to fit within lattice
    noFill();
    strokeWeight(0.8);
    drawingContext.setLineDash([3, 3]);

    for (let ion of ionicCrystalAtoms) {
        if (!ion.elAngles.length) continue;

        // Determine outermost shell and compute scale so it fits
        let maxS = 0;
        for (let e of ion.elAngles) { if (e.shell > maxS) maxS = e.shell; }
        const scale = (ion.nucSize * 0.95) / SHELL_RADII[maxS]; // capa externa ∝ tamaño del ion

        // Orbit rings (one per shell)
        const drawnShells = new Set();
        for (let e of ion.elAngles) {
            if (drawnShells.has(e.shell)) continue;
            drawnShells.add(e.shell);
            const r = SHELL_RADII[e.shell] * scale;
            stroke(100, 116, 139, 160);
            ellipse(ion.x, ion.y, r * 2, r * 2);
        }
    }
    drawingContext.setLineDash([]);

    // Electron dots (separate pass, no stroke)
    noStroke();
    for (let ion of ionicCrystalAtoms) {
        if (!ion.elAngles.length) continue;
        let maxS = 0;
        for (let e of ion.elAngles) { if (e.shell > maxS) maxS = e.shell; }
        const scale = (ion.nucSize * 0.95) / SHELL_RADII[maxS]; // capa externa ∝ tamaño del ion
        for (let e of ion.elAngles) {
            const r  = SHELL_RADII[e.shell] * scale;
            const ex = ion.x + cos(e.angle) * r;
            const ey = ion.y + sin(e.angle) * r;
            fill(e.transferred ? 148 : 245, e.transferred ? 163 : 158, e.transferred ? 184 : 11);
            circle(ex, ey, 4);
        }
    }
}

function drawIonicCrystalOverlay() {
    if      (ionicCrystalPhase === 'voltage') drawIonicVoltageOverlay();
    else if (ionicCrystalPhase === 'shear')   drawIonicShearOverlay();
}

function drawIonicVoltageOverlay() {
    const pad    = ionicCrystalSpacing * 0.72;
    const rightX = ionicCrystalStartX + ionicCrystalW + pad + 30;
    const leftX  = ionicCrystalStartX - pad - 30;
    const midY   = ionicCrystalStartY + ionicCrystalH / 2;
    const topY   = ionicCrystalStartY - pad;
    const botY   = ionicCrystalStartY + ionicCrystalH + pad;

    noStroke();
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(22);
    fill('#EF4444');
    text('+', rightX, midY);
    fill('#38BDF8');
    text('−', leftX, midY);
    textStyle(NORMAL);

    fill('#475569');
    textAlign(CENTER, BOTTOM);
    textSize(11);
    text('⊘  Los iones no se desplazan', width / 2, topY - 6);

    let msgY1 = min(botY + 22, height - 28);
    let msgY2 = min(botY + 40, height - 10);
    fill(239, 68, 68, 210);
    textAlign(CENTER, CENTER);
    textSize(14);
    textStyle(BOLD);
    text('No conduce en sólido — iones fijos en la red', width / 2, msgY1);
    textStyle(NORMAL);
    fill('#475569');
    textSize(11);
    text('(conduciría fundido o en disolución acuosa)', width / 2, msgY2);
}

// ─── Cizalladura: modelo físico (js/crystal-shear.js) ────────────────────────
function ensureIonicShearModel() {
    if (ionicShearModel || !ionicStructure || !ionicLayer) return;
    ionicShearModel = buildShearModel(ionicStructure, ionicLayer);
    ionicShearState = createShearState(ionicShearModel);
}

// Vuelve a la red en reposo (también tras una fractura)
function resetIonicShear() {
    if (ionicShearModel) ionicShearState = createShearState(ionicShearModel);
    ionicShearFrac = 0;
    ionicShearOpen = 0;
    if (ionicCrystalPhase === 'shear') ionicCrystalPhase = 'normal';
    if (elSliderShear) elSliderShear.elt.value = '0';
    updateShearSliderLabel();
}

function updateShearSliderLabel() {
    if (!elSliderShearLabel) return;
    const v = Math.round(ionicShearFrac * 100);
    const col = v >= 100 ? '#EF4444' : 'var(--accent)';
    elSliderShearLabel.html(`<span style="color:${col}">${v} %</span>`);
}

// Régimen actual: 'rest' | 'elastic' | 'slip' | 'fracture' | 'layers'
function ionicShearRegime() {
    const st = ionicShearState, m = ionicShearModel;
    if (!st || !m) return 'rest';
    if (st.fractured) return 'fracture';
    const slid = Math.abs(st.dx) > m.dxAtTau;
    if (ionicStructure.layered && (slid || ionicShearFrac > 1)) return 'layers';
    if (slid || ionicShearFrac > 1) return 'slip';
    if (ionicShearFrac > 0 || Math.abs(st.dx) > 1e-3) return 'elastic';
    return 'rest';
}

function updateIonicShearPhysics() {
    const st = ionicShearState, m = ionicShearModel;
    if (!st || !m) return;
    if (!st.fractured) {
        stepShear(st, m, ionicShearFrac * m.tauMax);
    } else {
        // Rota la unión, la repulsión separa los bloques
        ionicShearOpen = lerp(ionicShearOpen, ionicCrystalSpacing * 1.4, 0.03);
    }
    // La red es periódica a lo largo del plano: un deslizamiento de varios
    // periodos (láminas) se dibuja módulo el periodo
    const P     = m.period;
    const dxPx  = (st.dx - P * Math.floor(st.dx / P)) * ionicLayerScale;
    const dyPx  = st.dy * ionicLayerScale;
    const split = ionicLayer.shear.splitRow;
    for (const ion of ionicCrystalAtoms) {
        if (ion.row <= split) { // bloque sobre el plano
            ion.x = ion.baseX + dxPx;
            ion.y = ion.baseY - dyPx - ionicShearOpen * 0.7;
        } else {
            ion.x = ion.baseX;
            ion.y = ion.baseY + ionicShearOpen * 0.3;
        }
    }
    // Sin fuerza y otra vez en reposo: fin del experimento
    if (!st.fractured && ionicShearFrac === 0 && Math.abs(st.vx) + Math.abs(st.vy) < 1e-4) {
        const off = st.dx - P * Math.round(st.dx / P);
        if (Math.abs(off) < 1e-3 && Math.abs(st.dy) < 1e-3) {
            ionicShearState = createShearState(m);
            ionicCrystalPhase = 'normal';
        }
    }
}

// Y (px) del plano de cizalladura en reposo
function ionicShearPlaneY() {
    return ionicCrystalStartY + ionicLayer.shear.planeY * ionicLayerScale;
}

function drawIonicShearOverlay() {
    const pad    = ionicCrystalSpacing * 0.72;
    const leftX  = ionicCrystalStartX - pad;
    const botY   = ionicCrystalStartY + ionicCrystalH + pad;
    const shearY = ionicShearPlaneY();
    const st     = ionicShearState;
    const lift   = st ? st.dy * ionicLayerScale + ionicShearOpen * 0.7 : 0;
    const broken = !!(st && st.fractured);

    // Flecha de la fuerza aplicada (longitud ∝ fuerza), a media altura del bloque superior
    if (ionicShearFrac > 0 && !broken) {
        const arrowY   = (ionicCrystalStartY + shearY) / 2 - lift;
        const arrowEnd = leftX - 8;
        const len      = 14 + ionicShearFrac * 34;
        const col      = ionicShearFrac > 1 ? '#EF4444' : '#F59E0B';
        stroke(col);
        strokeWeight(2.5);
        line(arrowEnd - len, arrowY, arrowEnd, arrowY);
        push();
        translate(arrowEnd, arrowY);
        fill(col); noStroke();
        triangle(-9, 5, -9, -5, 0, 0);
        pop();
        noStroke(); fill(col);
        textAlign(RIGHT, CENTER); textSize(11);
        text('F', arrowEnd - len - 5, arrowY);
    }

    // Plano de cizalladura
    if (!broken) {
        stroke(148, 163, 184, 75);
        strokeWeight(1);
        drawingContext.setLineDash([5, 4]);
        line(ionicCrystalStartX - pad, shearY, ionicCrystalStartX + ionicCrystalW + pad, shearY);
        drawingContext.setLineDash([]);
    }

    // Iones de igual carga enfrentados a través del plano (repulsión)
    const split = ionicLayer.shear.splitRow;
    const s = ionicCrystalSpacing;
    const topRows = [ionicCrystalRowArrays[split] || [], ionicCrystalRowArrays[split - 1] || []];
    const botRows = [ionicCrystalRowArrays[split + 1] || [], ionicCrystalRowArrays[split + 2] || []];
    textStyle(BOLD);
    for (const ra of topRows) for (const a of ra) {
        for (const rb of botRows) for (const b of rb) {
            if (a.isCat !== b.isCat) continue;
            const d = dist(a.x, a.y, b.x, b.y);
            if (d > s * 1.35) continue;
            // más intenso cuanto más cerca
            const k = constrain(map(d, s * 1.35, s * 0.9, 0, 1), 0, 1);
            stroke(239, 68, 68, 200 * k);
            strokeWeight(1.5);
            drawingContext.setLineDash([3, 3]);
            line(a.x, a.y, b.x, b.y);
            drawingContext.setLineDash([]);
            noStroke();
            fill(239, 68, 68, 220 * k);
            textAlign(CENTER, CENTER); textSize(11);
            text('✕', (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
    }
    textStyle(NORMAL);

    // Mensaje según el régimen
    const msgs = {
        elastic:  ['#F59E0B', 'Deformación elástica', 'Las atracciones entre iones resisten la fuerza; al soltar, la red recupera su forma'],
        slip:     ['#EF4444', 'Las capas deslizan', 'Se acercan iones de igual carga: aparece una fuerte repulsión'],
        fracture: ['#EF4444', '¡Fractura! — el cristal iónico es frágil', 'La repulsión entre iones de igual carga separa las capas'],
        layers:   ['#38BDF8', 'Las láminas deslizan unas sobre otras', 'Entre láminas solo hay fuerzas débiles (van der Waals): el cristal se exfolia'],
    };
    const msg = msgs[ionicShearRegime()];
    if (msg) {
        const msgY1 = min(botY + 22, height - 30);
        const msgY2 = min(botY + 40, height - 12);
        noStroke();
        textAlign(CENTER, CENTER);
        fill(msg[0]); textSize(14); textStyle(BOLD);
        text(msg[1], width / 2, msgY1);
        textStyle(NORMAL);
        fill('#94A3B8'); textSize(11);
        text(msg[2], width / 2, msgY2);
    }
}

// ─── Flechas resultantes macroscópicas sobre cada bloque de cizalladura ───────

// ─── Botones de control dibujados en el canvas (fondo del modo cristal) ───────
function drawIonicCrystalButtons() {
    const btnW = 158, btnH = 36, gap = 10;
    const totalW = btnW * 2 + gap;
    const bx  = width / 2 - totalW / 2;
    const paX = bx + btnW + gap;
    const by  = height - btnH - 14;

    const backHover  = mouseX >= bx  && mouseX <= bx  + btnW && mouseY >= by && mouseY <= by + btnH;
    const pauseHover = mouseX >= paX && mouseX <= paX + btnW && mouseY >= by && mouseY <= by + btnH;
    const isPaused   = !isLooping();

    // ── Back button ──
    noStroke();
    fill(30, 41, 59, backHover ? 210 : 140);
    rect(bx, by, btnW, btnH, 8);
    stroke(71, 85, 105, backHover ? 220 : 110);
    strokeWeight(1.5);
    noFill();
    rect(bx, by, btnW, btnH, 8);
    drawingContext.setLineDash([]);
    noStroke();
    fill(backHover ? 226 : 148, backHover ? 232 : 163, backHover ? 240 : 184);
    textAlign(CENTER, CENTER);
    textSize(12);
    textStyle(BOLD);
    text('← Volver al enlace', bx + btnW / 2, by + btnH / 2);

    // ── Pause/resume button ──
    noStroke();
    fill(isPaused ? 37 : 30, isPaused ? 58 : 41, isPaused ? 99 : 59, pauseHover ? 210 : 140);
    rect(paX, by, btnW, btnH, 8);
    stroke(isPaused ? 59 : 71, isPaused ? 130 : 85, isPaused ? 246 : 105, pauseHover ? 220 : 110);
    strokeWeight(1.5);
    noFill();
    rect(paX, by, btnW, btnH, 8);
    drawingContext.setLineDash([]);
    noStroke();
    fill(isPaused ? 147 : (pauseHover ? 226 : 148),
         isPaused ? 197 : (pauseHover ? 232 : 163),
         isPaused ? 253 : (pauseHover ? 240 : 184));
    textAlign(CENTER, CENTER);
    textSize(12);
    textStyle(BOLD);
    text(isPaused ? '▶ Reanudar' : '⏸ Pausar', paX + btnW / 2, by + btnH / 2);
    textStyle(NORMAL);

    _crystalBackBtnBounds  = { x: bx,  y: by, w: btnW, h: btnH };
    _crystalPauseBtnBounds = { x: paX, y: by, w: btnW, h: btnH };
}

// ─── Fuerzas de Coulomb entre los dos bloques (iones junto al plano) ─────────
// F ∝ q₁·q₂ / r², solo con los iones del otro lado del plano: en reposo
// predominan las atracciones; al deslizar aparecen las repulsiones.
function drawIonicShearLineForces() {
    const s      = ionicCrystalSpacing;
    const alpha  = 195;
    const reach  = s * 2.2;
    const split  = ionicLayer.shear.splitRow;
    // Escala: atracción catión–anión a la distancia de enlace ↔ 30 px
    const f0 = (abs(ionicCatCharge) * abs(ionicAnCharge)) / (s * s);
    const aS = 30 / f0;

    const shearRows = [
        ionicCrystalRowArrays[split]     || [],
        ionicCrystalRowArrays[split + 1] || [],
    ];
    for (const rowIons of shearRows) {
        for (const ref of rowIons) {
            const refTop = ref.row <= split;
            const qRef = ref.isCat ? ionicCatCharge : ionicAnCharge;
            let resFx = 0, resFy = 0;
            const fvecs = [];
            for (const nb of ionicCrystalAtoms) {
                if ((nb.row <= split) === refTop) continue; // solo el otro bloque
                const dx = nb.x - ref.x, dy = nb.y - ref.y;
                const r2 = dx * dx + dy * dy, r = sqrt(r2);
                if (r < 2 || r > reach) continue;
                const qNb  = nb.isCat ? ionicCatCharge : ionicAnCharge;
                const fMag = -(qRef * qNb) / r2;          // > 0: atracción (hacia nb)
                const fx = (dx / r) * fMag, fy = (dy / r) * fMag;
                resFx += fx; resFy += fy;
                fvecs.push({ same: qRef * qNb > 0, fx, fy, near: r <= s * 1.3 });
            }
            for (const f of fvecs) {
                _iArrow(ref.x, ref.y, ref.x + f.fx * aS, ref.y + f.fy * aS,
                        f.same ? [239, 68, 68] : [52, 211, 153], alpha * (f.near ? 1 : 0.6),
                        f.near ? 1.5 : 0.9, f.near ? 4 : 3);
            }
            if (sqrt(resFx * resFx + resFy * resFy) * aS > 3) {
                _iArrow(ref.x, ref.y, ref.x + resFx * aS, ref.y + resFy * aS, [251, 191, 36], alpha, 2.2, 6);
            }
        }
    }

    // Leyenda compartida (misma esquina que el diagrama de Coulomb del ión único)
    const lItems = _FORCE_LEGEND;
    let lW = 152, lH = lItems.length * 16 + 10;
    let lX = width  - lW - 14;
    let lY = height - lH - 14;
    noStroke(); fill(8, 14, 28, 195);
    rect(lX - 6, lY - 6, lW + 8, lH + 4, 7);
    for (let i = 0; i < lItems.length; i++) {
        let it = lItems[i], y = lY + i * 16 + 2;
        let sw = i === 2 ? 2.2 : 1.5;
        stroke(...it.col, alpha); strokeWeight(sw);
        line(lX + 2, y, lX + 18, y);
        push();
        translate(lX + 18, y);
        fill(...it.col, alpha); noStroke();
        triangle(-5, 2.5, -5, -2.5, 0, 0);
        pop();
        noStroke(); fill(148, 163, 184, alpha * 0.85);
        textAlign(LEFT, CENTER); textSize(9);
        text(it.lbl, lX + 24, y);
    }
}

const _FORCE_LEGEND = [
    { col: [52, 211, 153], lbl: 'atracción' },
    { col: [239, 68, 68],  lbl: 'repulsión'  },
    { col: [251, 191, 36], lbl: 'resultante' },
];

function _iArrow(x1, y1, x2, y2, col, alpha, sw, hs) {
    let dx = x2 - x1, dy = y2 - y1, d = sqrt(dx * dx + dy * dy);
    if (d < 3) return;
    stroke(...col, alpha); strokeWeight(sw);
    line(x1, y1, x2, y2);
    push();
    translate(x2, y2); rotate(atan2(dy, dx));
    fill(...col, alpha); noStroke();
    triangle(-hs, hs * 0.5, -hs, -hs * 0.5, 0, 0);
    pop();
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
    let infoBody = createDiv().class('card-body-static');
    elMetallicInfo = createDiv().class('info-section');
    infoBody.child(elMetallicInfo);
    infoCard.child(infoBody);
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
            deformTarget  = latticeSpacing;   // un periodo: los iones vuelven a posiciones de red
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
        <p>Metal: <b><em style="color:${metal.color}">${metallicMetal}</em> — ${metal.name}</b></p>
        <p>Valencia: <b>${metal.valence} e⁻</b> por átomo · Catión <b>${metallicMetal}<sup>${metal.charge}+</sup></b></p>
        <p>e⁻ en el mar: <b>${numE}</b> · T. fusión: <b>${metal.mp} °C</b></p>
        <p>Estado: ${phaseMap[metallicPhase] || '—'}</p>
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
            // Con la red deformada, la mitad superior del mar está desplazada
            let dx = metallicPhase === 'deform' && e.y < shearPlaneY() ? deformOffset : 0;
            if (e.x < minX + dx || e.x > maxX + dx) { e.vx *= -1; e.x = constrain(e.x, minX + dx, maxX + dx); }
            if (e.y < minY || e.y > maxY) { e.vy *= -1; e.y = constrain(e.y, minY, maxY); }
        }
    }
}

// Plano de deslizamiento: entre la fila 1 y la fila 2 de la red metálica.
function shearPlaneY() { return latticeStartY + latticeSpacing * 1.5; }

function updateDeformAnim() {
    if (metallicPhase !== 'deform' || deformDone) return;
    let prev = deformOffset;
    deformOffset = lerp(deformOffset, deformTarget, 0.025);
    // Los electrones de la mitad superior viajan con sus cationes
    for (let e of freeElectrons) if (e.y < shearPlaneY()) e.x += deformOffset - prev;
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

    // Con la red deformada, la mitad superior (filas 0 y 1) se desliza con
    // su parte del mar: se dibujan las dos mitades por separado.
    const dx     = metallicPhase === 'deform' ? deformOffset : 0;
    const shearY = shearPlaneY();
    const partes = dx > 0
        ? [[rx + dx, ry, rw, shearY - ry, 16, 16, 0, 0], [rx, shearY, rw, ry + rh - shearY, 0, 0, 16, 16]]
        : [[rx, ry, rw, rh, 16, 16, 16, 16]];

    for (const p of partes) {
        noStroke();
        fill(cR, cG, cB, 11 + pulse * 7);
        rect(...p);
        noFill();
        stroke(cR, cG, cB, 52 + pulse * 32);
        strokeWeight(1.5);
        rect(...p);
    }
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
    text('⚡ Conductividad eléctrica', width / 2, min(botY + 22, height - 14));
    textStyle(NORMAL);
}

function drawDeformOverlay() {
    const pad     = latticeSpacing * 0.65;
    const leftX   = latticeStartX - pad;
    const botY    = latticeStartY + (LATTICE_ROWS - 1) * latticeSpacing + pad;
    const shearY  = shearPlaneY();

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
        text('El enlace no se rompe — maleabilidad', width / 2, min(botY + 22, height - 14));
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
