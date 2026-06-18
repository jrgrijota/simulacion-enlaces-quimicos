// ============================================================
// DATOS QUÍMICOS
// ============================================================
const SHELL_RADII = [36, 60, 84, 108];
const BOND_COLOR  = '#F59E0B';

const ELEMENTS = {
    H:    { Z: 1,  config: [1],         nobleTarget: 2, isMetal: false, color: '#38BDF8', name: 'Hidrógeno' },
    Li:   { Z: 3,  config: [2, 1],      nobleTarget: 8, isMetal: true,  color: '#A78BFA', name: 'Litio'     },
    O:    { Z: 8,  config: [2, 6],      nobleTarget: 8, isMetal: false, color: '#FB923C', name: 'Oxígeno'   },
    F:    { Z: 9,  config: [2, 7],      nobleTarget: 8, isMetal: false, color: '#FBBF24', name: 'Flúor'     },
    Na:   { Z: 11, config: [2, 8, 1],   nobleTarget: 8, isMetal: true,  color: '#F43F5E', name: 'Sodio'     },
    Mg:   { Z: 12, config: [2, 8, 2],   nobleTarget: 8, isMetal: true,  color: '#34D399', name: 'Magnesio'  },
    S:    { Z: 16, config: [2, 8, 6],   nobleTarget: 8, isMetal: false, color: '#A3E635', name: 'Azufre'    },
    Cl:   { Z: 17, config: [2, 8, 7],   nobleTarget: 8, isMetal: false, color: '#F472B6', name: 'Cloro'     },
    NONE: { Z: 0,  config: [],          nobleTarget: 0, isMetal: false, color: '#475569', name: '—'         }
};

// ============================================================
// ESTADO GLOBAL
// ============================================================
let currentMode   = 'IONIC';
let atoms         = [];
let uiContainer;
let bondFormed    = false;
let bondProgress  = 0;
let origPositions = [];

// ============================================================
// p5.js LIFECYCLE
// ============================================================
function setup() {
    let cont = document.getElementById('simulation-container');
    let cnv  = createCanvas(cont.offsetWidth, cont.offsetHeight);
    cnv.parent('simulation-container');
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
        drawAtomLabels();
        if (bondFormed) drawBondEffect();
    } else {
        noStroke();
        fill('#334155');
        textAlign(CENTER, CENTER);
        textSize(18);
        text('Próximamente...', width / 2, height / 2);
    }
}

function windowResized() {
    let cont = document.getElementById('simulation-container');
    resizeCanvas(cont.offsetWidth, cont.offsetHeight);
    initSimulation();
}

function handleModeChange() {
    currentMode = this.value();
    initSimulation();
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
function initSimulation() {
    uiContainer.html('');
    atoms        = [];
    bondFormed   = false;
    bondProgress = 0;

    if (currentMode === 'IONIC') {
        let cx = width / 2, cy = constrain(height * 0.40, 150, 340);
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

// ============================================================
// UI DOM
// ============================================================
function buildIonicUI() {
    const labels = ['Átomo A', 'Átomo B', 'Átomo C'];
    for (let i = 0; i < 3; i++) {
        let panel = createDiv().class('atom-panel');
        panel.child(createDiv(labels[i]).class('panel-label'));

        // Selector de elemento
        let sel = createSelect();
        sel.option('NONE', '— Vacío —');
        for (let sym in ELEMENTS) {
            if (sym === 'NONE') continue;
            sel.option(sym, `${sym}  ${ELEMENTS[sym].name}`);
        }
        sel.value(atoms[i].symbol);
        sel.changed(() => {
            bondFormed   = false;
            bondProgress = 0;
            resetAtomPositions();
            atoms[i].setElement(sel.value());
            updateUIState();
        });
        panel.child(sel);

        // Caja de estado
        panel.child(createDiv().class('status-box').id(`data-${i}`));

        // Botones de transferencia
        let btnBox = createDiv().class('btn-group');
        if (i === 0) {
            let b = createButton('Ceder e⁻ →');
            b.id('btn-0r');
            b.mousePressed(() => transferElectron(0, 1));
            btnBox.child(b);
        } else if (i === 1) {
            let bL = createButton('← Ceder e⁻');
            bL.id('btn-1l');
            bL.mousePressed(() => transferElectron(1, 0));
            let bR = createButton('Ceder e⁻ →');
            bR.id('btn-1r');
            bR.mousePressed(() => transferElectron(1, 2));
            btnBox.child(bL);
            btnBox.child(bR);
        } else {
            let b = createButton('← Ceder e⁻');
            b.id('btn-2l');
            b.mousePressed(() => transferElectron(2, 1));
            btnBox.child(b);
        }
        panel.child(btnBox);
        uiContainer.child(panel);
    }
    updateUIState();
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
                    shell:     n,
                    radius:    SHELL_RADII[n],
                    angle:     map(e, 0, numE, 0, TWO_PI),
                    speed:     speed,
                    baseColor: this.data.color,
                    color:     this.data.color
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

    valenceCount() {
        let vs = this.valenceShell();
        return vs < 0 ? 0 : this.electrons.filter(e => e.shell === vs).length;
    }

    isStable() {
        if (this.symbol === 'NONE') return null;
        return this.valenceCount() === this.data.nobleTarget;
    }

    update() {
        this.pos.x = lerp(this.pos.x, this.targetPos.x, 0.05);
        this.pos.y = lerp(this.pos.y, this.targetPos.y, 0.05);
        for (let e of this.electrons) {
            e.angle += e.speed;
            if (bondFormed) {
                let t   = min(bondProgress * 1.6, 1);
                e.color = lerpColor(color(e.baseColor), color(BOND_COLOR), t);
            } else {
                e.color = e.baseColor;
            }
        }
    }

    draw() {
        if (this.symbol === 'NONE') return;
        let vs = this.valenceShell();
        if (vs < 0) return;

        // Órbitas
        noFill();
        strokeWeight(1);
        for (let s = 0; s <= vs; s++) {
            stroke(71, 85, 105);
            drawingContext.setLineDash([4, 5]);
            ellipse(this.pos.x, this.pos.y, SHELL_RADII[s] * 2, SHELL_RADII[s] * 2);
        }
        drawingContext.setLineDash([]);

        // Núcleo
        noStroke();
        fill(15, 23, 42, 200);
        circle(this.pos.x, this.pos.y, 52);
        fill('#E2E8F0');
        circle(this.pos.x, this.pos.y, 44);
        fill('#0F172A');
        textAlign(CENTER, CENTER);
        textSize(13);
        textStyle(BOLD);
        text(this.symbol, this.pos.x, this.pos.y);
        textStyle(NORMAL);

        // Electrones
        for (let e of this.electrons) {
            let ex = this.pos.x + cos(e.angle) * e.radius;
            let ey = this.pos.y + sin(e.angle) * e.radius;
            let c  = color(e.color);
            noStroke();
            fill(red(c), green(c), blue(c), 55);
            circle(ex, ey, 18);
            fill(c);
            circle(ex, ey, 9);
        }
    }
}

// ============================================================
// ETIQUETAS EN CANVAS (símbolo + carga bajo cada átomo)
// ============================================================
function drawAtomLabels() {
    if (bondFormed && bondProgress > 0.85) return;
    for (let a of atoms) {
        if (a.symbol === 'NONE') continue;
        let vs = a.valenceShell();
        if (vs < 0) continue;
        let baseY  = a.pos.y + SHELL_RADII[vs] + 16;
        let q      = a.netCharge;
        let qStr   = q === 0 ? '0' : (q > 0 ? `+${q}` : `${q}`);
        let qColor = q < 0 ? color('#38BDF8') : (q > 0 ? color('#F87171') : color('#10B981'));

        noStroke();
        textAlign(CENTER, CENTER);
        textStyle(BOLD);
        textSize(15);
        fill('#CBD5E1');
        text(a.symbol, a.pos.x, baseY);
        textSize(13);
        fill(qColor);
        text(qStr, a.pos.x, baseY + 19);
        textStyle(NORMAL);
    }
}

// ============================================================
// TRANSFERENCIA DE ELECTRONES
// ============================================================
function transferElectron(fromIdx, toIdx) {
    if (bondFormed) return;
    let from = atoms[fromIdx];
    let to   = atoms[toIdx];
    if (from.symbol === 'NONE' || to.symbol === 'NONE') return;
    if (from.electrons.length === 0) return;
    if (to.isStable()) return;

    let maxS = from.valenceShell();
    if (maxS < 0) return;
    let eIdx = from.electrons.findIndex(e => e.shell === maxS);
    if (eIdx < 0) return;

    let el      = from.electrons.splice(eIdx, 1)[0];
    let toShell = to.electrons.length > 0 ? to.valenceShell() : 0;
    el.shell    = toShell;
    el.radius   = SHELL_RADII[toShell];
    el.angle    = random(TWO_PI);
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
    let cy        = constrain(height * 0.40, 150, 340);
    for (let k = 0; k < n; k++) {
        atoms[activeIdx[k]].targetPos = createVector(cx + (k - (n - 1) / 2) * spacing, cy);
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
    for (let i = 0; i < 3; i++) {
        let a   = atoms[i];
        let box = select(`#data-${i}`);
        if (!box) continue;

        if (a.symbol === 'NONE') {
            box.html('<div class="ui-empty">— ranura vacía —</div>');
        } else {
            let q      = a.netCharge;
            let qStr   = q === 0 ? '0' : (q > 0 ? `+${q}` : `${q}`);
            let qColor = q < 0 ? '#38BDF8' : q > 0 ? '#F87171' : '#10B981';
            let vCount = a.valenceCount();
            let target = a.data.nobleTarget;
            let stable = a.isStable();
            let diff   = target - vCount;

            let diffHtml = '';
            if (!stable) {
                diffHtml = diff > 0
                    ? `<div class="check-fail">Necesita ${diff} e⁻ más</div>`
                    : `<div class="check-fail">Tiene ${Math.abs(diff)} e⁻ de más</div>`;
            }

            let checkHtml = stable
                ? `<div class="check-pass">✔ Octeto / gas noble alcanzado</div>`
                : `<div class="check-fail">✖ Configuración inestable</div>`;

            box.html(`
                <div>Carga neta: <b style="color:${qColor}">${qStr}</b></div>
                <div>Valencia: ${vCount} / ${target}</div>
                ${diffHtml}
                <div style="margin-top:5px">${checkHtml}</div>
            `);
        }
    }
    updateButtonStates();
}

// ============================================================
// ESTADO DE BOTONES
// ============================================================
function updateButtonStates() {
    if (bondFormed) {
        ['btn-0r', 'btn-1l', 'btn-1r', 'btn-2l'].forEach(id => {
            let b = select(`#${id}`);
            if (b) b.attribute('disabled', '');
        });
        return;
    }
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
    if (to.isStable()) return false;
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
// FUERZAS ELECTROSTÁTICAS EN CANVAS
// ============================================================
function drawForces() {
    let atomCY = constrain(height * 0.40, 150, 340);
    let lineY  = atomCY - SHELL_RADII[2] - 48;

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
            drawArrowHead(a2.pos.x, lineY, a1.pos.x, lineY, '#FBBF24');
            drawArrowHead(a1.pos.x, lineY, a2.pos.x, lineY, '#FBBF24');
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

    let pad  = SHELL_RADII[2] + 24;
    let minX = Math.min(...active.map(a => a.pos.x)) - pad;
    let maxX = Math.max(...active.map(a => a.pos.x)) + pad;
    let minY = Math.min(...active.map(a => a.pos.y)) - pad;
    let maxY = Math.max(...active.map(a => a.pos.y)) + pad;
    let alpha = map(bondProgress, 0, 1, 0, 255);

    // Fondo tenue
    noStroke();
    fill(16, 185, 129, alpha * 0.09);
    rect(minX, minY, maxX - minX, maxY - minY, 20);

    // Borde verde
    noFill();
    stroke(16, 185, 129, alpha);
    strokeWeight(3);
    rect(minX, minY, maxX - minX, maxY - minY, 20);

    // Nombre del compuesto
    if (bondProgress > 0.55) {
        let a2 = map(bondProgress, 0.55, 0.9, 0, 255);
        noStroke();
        fill(255, 255, 255, a2);
        textAlign(CENTER, TOP);
        textSize(26);
        textStyle(BOLD);
        text(getCompoundName(), (minX + maxX) / 2, maxY + 12);
        textStyle(NORMAL);
    }

    // Banner inferior
    if (bondProgress > 0.75) {
        let a3 = map(bondProgress, 0.75, 1, 0, 255);
        let bx = width / 2, by = height * 0.87;
        noStroke();
        fill(16, 185, 129, a3 * 0.18);
        rect(bx - 180, by - 20, 360, 40, 10);
        fill(16, 185, 129, a3);
        textAlign(CENTER, CENTER);
        textSize(17);
        textStyle(BOLD);
        text('¡Enlace iónico formado!', bx, by);
        textStyle(NORMAL);
    }
}

// ============================================================
// NOMBRE DEL COMPUESTO
// ============================================================
function getCompoundName() {
    let syms = atoms.filter(a => a.symbol !== 'NONE').map(a => a.symbol);
    let counts = {};
    syms.forEach(s => counts[s] = (counts[s] || 0) + 1);
    let metals    = [...new Set(syms.filter(s => ELEMENTS[s].isMetal))];
    let nonMetals = [...new Set(syms.filter(s => !ELEMENTS[s].isMetal))];
    let result = '';
    for (let m  of metals)    result += m  + (counts[m]  > 1 ? toSub(counts[m])  : '');
    for (let nm of nonMetals) result += nm + (counts[nm] > 1 ? toSub(counts[nm]) : '');
    return result || syms.join('');
}

function toSub(n) {
    return String(n).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
}
