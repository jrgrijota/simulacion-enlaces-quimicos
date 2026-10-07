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
    buildCovalentCrystalUI();
    if (!isLooping()) redraw();
}

function drawCovalentCrystal() {
    drawCrystal3D();
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

    // Visualización
    let fCard = createDiv().class('card');
    let fBody = createDiv().class('card-body-static');
    fCard.child(createDiv('Visualización').class('atom-card-label'));
    fCard.child(fBody);
    createAutoRotateCheckbox(fBody);
    uiContainer.child(fCard);
}
