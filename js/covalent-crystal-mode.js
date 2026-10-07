// ============================================================
// ENLACE COVALENTE — CRISTALES COVALENTES Y MOLECULARES
// ------------------------------------------------------------
// Vista 3D (js/crystal-3d.js) de los cristales definidos en
// js/covalent-crystals.js, con una tarjeta informativa de nivel
// ESO que compara redes covalentes y cristales moleculares.
// ============================================================

let covCrystalMode = false;
let covCrystalId   = 'diamond';

function enterCovalentCrystal() {
    covCrystalMode = true;
    crystal3DAutoRotate = true;

    let ctrlRow = document.getElementById('atom-controls-row');
    if (ctrlRow) ctrlRow.style.display = 'none';
    let pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.style.display = 'none';
    let frame = document.getElementById('sim-frame');
    if (frame) resizeCanvas(frame.offsetWidth, frame.offsetHeight);

    selectCovalentCrystal(covCrystalId);
}

function exitCovalentCrystal() {
    covCrystalMode = false;
    crystal3DScene = null;
    _crystalBackBtnBounds  = null;
    _crystalPauseBtnBounds = null;
    elChkAutoRotate        = null;
    covThermal = null; elTempSlider = null; elTempLabel = null;

    let ctrlRow = document.getElementById('atom-controls-row');
    if (ctrlRow) ctrlRow.style.display = 'flex';
    let pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.style.display = '';
    let frame = document.getElementById('sim-frame');
    if (frame) resizeCanvas(frame.offsetWidth, frame.offsetHeight);

    uiContainer.html('');
    buildCovalentUI();
    updateUIState();
    if (bondFormed) checkCovalentBondFormed();
}

function selectCovalentCrystal(id) {
    covCrystalId = id;
    setCrystal3DScene(buildCovalentScene(id));
    covTemp = covInitialTemp(COVALENT_CRYSTALS[id]);
    initCovalentThermal();
    buildCovalentCrystalUI();
    if (!isLooping()) redraw();
}

function drawCovalentCrystal() {
    updateCovalentThermal();
    drawCrystal3D();
    drawCovalentThermalHud();
    drawIonicCrystalButtons(); // ← Volver / Pausar (mismos botones que la red iónica)
}

// ── Barra lateral ─────────────────────────────────────────────
function buildCovalentCrystalUI() {
    uiContainer.html('');
    const d = COVALENT_CRYSTALS[covCrystalId];

    // Selector de cristal
    let sCard = createDiv().class('card');
    sCard.child(createDiv('Cristal').class('atom-card-label'));
    let sBody = createDiv().class('card-body-static');
    let grid = createDiv();
    grid.style('display', 'grid').style('grid-template-columns', '1fr 1fr').style('gap', '6px');
    for (const [id, lbl] of [['diamond', '💎 Diamante'], ['graphite', '✏️ Grafito'],
                             ['silica', '◆ Sílice'], ['dryice', '🧊 Hielo seco']]) {
        let b = createButton(lbl);
        if (id === covCrystalId) b.class('btn-primary');
        b.style('font-size', '11.5px');
        b.mousePressed(() => { if (id !== covCrystalId) selectCovalentCrystal(id); });
        grid.child(b);
    }
    sBody.child(grid);
    sCard.child(sBody);
    uiContainer.child(sCard);

    // Información (nivel ESO)
    const typeText = {
        network:   ['Cristal covalente', 'red de átomos unidos por enlaces covalentes'],
        layered:   ['Cristal covalente laminar', 'láminas de átomos unidos por enlaces covalentes'],
        molecular: ['Cristal molecular', 'moléculas covalentes unidas por fuerzas débiles'],
    }[d.kind];
    let iCard = createDiv().class('card');
    iCard.child(createDiv('Estructura').class('atom-card-label'));
    let iBody = createDiv().class('card-body-static');
    iBody.html(`
        <div class="compound-formula">${d.formula}</div>
        <div class="result-detail">${d.name}</div>
        <div class="result-detail" style="margin-bottom:8px"><b>${typeText[0]}</b>: ${typeText[1]}</div>
        <div class="info-section">
            <p><em>Enlaces:</em> ${d.cn}</p>
            <p>${d.bondText}</p>
            <p><em>Propiedades:</em></p>
            <ul class="crystal-props">${d.props.map(p => `<li>${p}</li>`).join('')}</ul>
            ${d.note ? `<p class="crystal-note">ⓘ ${d.note}</p>` : ''}
        </div>
    `);
    iCard.child(iBody);
    uiContainer.child(iCard);

    buildCovalentExperimentsCard();

    // Visualización
    let fCard = createDiv().class('card');
    let fBody = createDiv().class('card-body-static');
    fCard.child(createDiv('Visualización').class('atom-card-label'));
    fCard.child(fBody);
    createAutoRotateCheckbox(fBody);
    uiContainer.child(fCard);
}

// ============================================================
// EXPERIMENTO: CALENTAR EL CRISTAL
// ------------------------------------------------------------
// Criterio de Lindemann: un sólido funde cuando la amplitud de
// vibración de sus partículas llega a ~10 % de la distancia entre
// vecinas. Por debajo de la temperatura de cambio de estado,
// amplitud = 0,1·d·√(T / T_cambio) (temperaturas absolutas).
// Por encima, las partículas se desplazan al azar: en una red
// covalente se estiran y rompen enlaces covalentes; en el cristal
// molecular la partícula que se mueve es la molécula entera y sus
// enlaces no se rompen, solo se pierden las fuerzas débiles.
// ============================================================

const COV_T_MIN = -200, COV_T_MAX = 4000;   // °C
let covTemp    = 25;      // °C
let covThermal = null;    // { units, dRef, t }
let elTempSlider = null, elTempLabel = null;

// Escala cuadrática del slider (más resolución a bajas temperaturas)
function covSliderToT(v) { return COV_T_MIN + (COV_T_MAX - COV_T_MIN) * (v / 1000) ** 2; }
function covTToSlider(T) { return 1000 * Math.sqrt((T - COV_T_MIN) / (COV_T_MAX - COV_T_MIN)); }

// Temperatura con signo menos tipográfico: −78 °C
function fmtT(T) { return String(T).replace('-', '−') + ' °C'; }

function covInitialTemp(d) { return d.kind === 'molecular' ? -100 : 25; }

function initCovalentThermal() {
    const sc = crystal3DScene, d = COVALENT_CRYSTALS[covCrystalId];
    // Unidad que se mueve: la molécula (cristal molecular) o el átomo
    const groups = new Map();
    sc.atoms.forEach((p, i) => {
        const key = d.kind === 'molecular' ? 'm' + p.mol : 'a' + i;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(i);
        p.ox = p.oy = p.oz = 0;
    });
    const units = [...groups.values()].map(members => ({
        members,
        dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0,
        ph: [0, 1, 2].map(() => Math.random() * Math.PI * 2),
        w:  [0, 1, 2].map(() => 0.9 + Math.random() * 0.5),
    }));
    // Distancia de referencia: enlace covalente (red) o entre moléculas
    const ref = sc.bonds.filter(b => d.kind === 'molecular' ? b.weak : !b.weak);
    const dRef = Math.min(...ref.map(b => b.d0));
    covThermal = { units, dRef, t: 0 };
}

// Estado físico: 'solid' | 'liquid' | 'gas'
function covPhase() {
    const tr = COVALENT_CRYSTALS[covCrystalId].transition;
    if (covTemp < tr.T) return 'solid';
    return tr.verb === 'sublima' ? 'gas' : 'liquid';
}

function updateCovalentThermal() {
    if (!covThermal || !crystal3DScene) return;
    const sc = crystal3DScene;
    const tr = COVALENT_CRYSTALS[covCrystalId].transition;
    const ratio = (covTemp + 273.15) / (tr.T + 273.15);
    const amp   = 0.1 * covThermal.dRef * Math.sqrt(Math.max(ratio, 0));
    const phase = covPhase();
    const wall  = sc.radius * 1.05;
    covThermal.t += 0.12;
    const t = covThermal.t;

    for (const u of covThermal.units) {
        if (phase === 'solid') {
            // Vuelve a su posición en la red (recristaliza) y vibra
            u.vx = u.vy = u.vz = 0;
            u.dx *= 0.94; u.dy *= 0.94; u.dz *= 0.94;
        } else {
            // Movimiento al azar, más rápido cuanto más caliente
            const s = 0.035 * covThermal.dRef * Math.sqrt(ratio);
            u.vx = u.vx * 0.96 + (Math.random() - 0.5) * s;
            u.vy = u.vy * 0.96 + (Math.random() - 0.5) * s;
            u.vz = u.vz * 0.96 + (Math.random() - 0.5) * s;
            const pa = sc.atoms[u.members[0]];
            if (phase === 'gas') {
                // Gas: las partículas escapan hacia fuera
                const r = Math.hypot(pa.x, pa.y, pa.z) || 1;
                const k = 0.0012 * covThermal.dRef;
                u.vx += pa.x / r * k; u.vy += pa.y / r * k; u.vz += pa.z / r * k;
            }
            u.dx += u.vx; u.dy += u.vy; u.dz += u.vz;
            if (phase === 'liquid') {
                // Líquido: siguen juntas (pared blanda)
                const x = pa.x + u.dx, y = pa.y + u.dy, z = pa.z + u.dz;
                const r = Math.hypot(x, y, z);
                if (r > wall) {
                    const k = (r - wall) / r * 0.2;
                    u.dx -= x * k; u.dy -= y * k; u.dz -= z * k;
                    u.vx *= 0.5; u.vy *= 0.5; u.vz *= 0.5;
                }
            }
        }
        // Las partículas de gas que se alejan mucho dejan de dibujarse
        const p0 = sc.atoms[u.members[0]];
        const far = phase === 'gas' &&
            Math.hypot(p0.x + u.dx, p0.y + u.dy, p0.z + u.dz) > sc.radius * 2.6;
        const vx = amp * Math.sin(t * u.w[0] + u.ph[0]);
        const vy = amp * Math.sin(t * u.w[1] + u.ph[1]);
        const vz = amp * Math.sin(t * u.w[2] + u.ph[2]);
        for (const i of u.members) {
            const p = sc.atoms[i];
            p.ox = u.dx + vx; p.oy = u.dy + vy; p.oz = u.dz + vz;
            p.hidden = far;
        }
    }
}

function setCovalentTemp(T) {
    covTemp = Math.round(T);
    if (elTempSlider) elTempSlider.elt.value = String(covTToSliderClamped(covTemp));
    updateTempLabel();
    if (!isLooping()) redraw();
}
function covTToSliderClamped(T) { return Math.round(covTToSlider(constrain(T, COV_T_MIN, COV_T_MAX))); }

function updateTempLabel() {
    if (!elTempLabel) return;
    const col = covPhase() === 'solid' ? 'var(--accent)' : '#EF4444';
    elTempLabel.html(`<span style="color:${col}">${fmtT(covTemp)}</span>`);
}

function buildCovalentExperimentsCard() {
    const d = COVALENT_CRYSTALS[covCrystalId];
    let card = createDiv().class('card');
    card.child(createDiv('Experimentos').class('atom-card-label'));
    let body = createDiv().class('card-body-static');

    let row = createDiv();
    row.style('display', 'flex').style('justify-content', 'space-between')
       .style('align-items', 'center').style('margin-bottom', '4px');
    let lbl = createDiv('🌡 Temperatura');
    lbl.style('font-size', '11px').style('color', 'var(--text-muted)');
    elTempLabel = createDiv('');
    elTempLabel.style('font-size', '11px').style('font-weight', '600')
               .style('min-width', '56px').style('text-align', 'right');
    row.child(lbl); row.child(elTempLabel);
    body.child(row);

    elTempSlider = createElement('input');
    elTempSlider.attribute('type', 'range');
    elTempSlider.attribute('min', '0');
    elTempSlider.attribute('max', '1000');
    elTempSlider.attribute('value', String(covTToSliderClamped(covTemp)));
    elTempSlider.style('width', '100%').style('cursor', 'pointer')
                .style('accent-color', 'var(--accent)').style('margin-bottom', '2px');
    elTempSlider.elt.addEventListener('input', () => {
        covTemp = Math.round(covSliderToT(parseInt(elTempSlider.elt.value)) / 5) * 5;
        updateTempLabel();
        if (!isLooping()) redraw();
    });
    body.child(elTempSlider);

    // Marca de la temperatura de cambio de estado del cristal
    let scale = createDiv();
    scale.style('position', 'relative').style('height', '14px').style('font-size', '9.5px');
    const pct = covTToSlider(d.transition.T) / 10;
    let tick = createDiv(`▲ ${d.transition.verb} ${fmtT(d.transition.T)}`);
    const right = pct > 60;
    tick.style('position', 'absolute').style('white-space', 'nowrap').style('color', '#F59E0B');
    if (right) tick.style('right', `calc(${100 - pct}% - 6px)`).style('text-align', 'right');
    else       tick.style('left', `calc(${pct}% - 6px)`);
    if (right) tick.html(`${d.transition.verb} ${fmtT(d.transition.T)} ▲`);
    scale.child(tick);
    body.child(scale);

    let reset = createButton(`↺ Volver a ${fmtT(covInitialTemp(d))}`);
    reset.style('width', '100%').style('margin-top', '6px').style('font-size', '11px');
    reset.mousePressed(() => setCovalentTemp(covInitialTemp(d)));
    body.child(reset);

    card.child(body);
    uiContainer.child(card);
    updateTempLabel();
}

// Termómetro y explicación sobre el canvas
function drawCovalentThermalHud() {
    const d = COVALENT_CRYSTALS[covCrystalId];
    const phase = covPhase();
    const names = { solid: 'Sólido', liquid: 'Líquido', gas: 'Gas' };

    // Fondo para que las partículas que pasan no tapen el termómetro
    noStroke();
    fill(8, 14, 28, 200);
    rect(width - 104, 8, 94, 44, 8);
    textAlign(RIGHT, TOP);
    textStyle(BOLD); textSize(16);
    fill(phase === 'solid' ? color(203, 213, 225) : color('#EF4444'));
    text(fmtT(covTemp), width - 18, 14);
    textStyle(NORMAL); textSize(11);
    fill(100, 116, 139);
    text(names[phase], width - 18, 34);

    if (covTemp === covInitialTemp(d)) return;
    const molecular = d.kind === 'molecular';
    let msg;
    if (phase === 'solid') {
        msg = ['#F59E0B', molecular ? 'Las moléculas vibran más cuanto mayor es la temperatura'
                                    : 'Los átomos vibran más cuanto mayor es la temperatura',
               `${d.transition.verb === 'funde' ? 'Funde' : 'Sublima'} a ${fmtT(d.transition.T)}`];
    } else if (molecular) {
        msg = ['#EF4444', `¡Sublima a ${fmtT(d.transition.T)}! Las moléculas se separan enteras`,
               'No se rompe ningún enlace covalente: solo las fuerzas débiles entre moléculas'];
    } else {
        msg = ['#EF4444', `¡${d.transition.verb === 'funde' ? 'Funde' : 'Sublima'} a ${fmtT(d.transition.T)}! Se rompen enlaces covalentes`,
               'Por eso los cristales covalentes tienen temperaturas de fusión altísimas'];
    }
    const y1 = height - 66 - 34, y2 = height - 66 - 16;
    textAlign(CENTER, CENTER);
    fill(msg[0]); textSize(14); textStyle(BOLD);
    text(msg[1], width / 2, y1);
    textStyle(NORMAL);
    fill('#94A3B8'); textSize(11);
    text(msg[2], width / 2, y2);
}
