// Diccionario Químico
const ELEMENTS = {
    H:  { Z: 1,  config: [1],       maxV: 2, color: '#38BDF8', isNM: true },
    O:  { Z: 8,  config: [2, 6],    maxV: 8, color: '#A78BFA', isNM: true },
    F:  { Z: 9,  config: [2, 7],    maxV: 8, color: '#FBBF24', isNM: true },
    Na: { Z: 11, config: [2, 8, 1], maxV: 8, color: '#F43F5E', isNM: false },
    Mg: { Z: 12, config: [2, 8, 2], maxV: 8, color: '#34D399', isNM: false },
    Cl: { Z: 17, config: [2, 8, 7], maxV: 8, color: '#F472B6', isNM: true },
    NONE:{ Z: 0, config: [],        maxV: 0, color: '#000000', isNM: false }
};

let currentMode = 'IONIC';
let atoms = [];
let metallicSim = null;
let uiContainer;

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight - 60);
    canvas.parent('simulation-container');
    uiContainer = select('#ui-overlay');
    
    select('#mode-select').changed(handleModeChange);
    initSimulation();
}

function draw() {
    background('#0F172A');
    
    if (currentMode === 'METALLIC') {
        if(metallicSim) metallicSim.updateAndDraw();
    } else {
        drawForces();
        for (let atom of atoms) {
            atom.update();
            atom.draw();
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight - 60);
    initSimulation(); // Recalcula posiciones
}

function handleModeChange() {
    currentMode = this.value();
    initSimulation();
}

function initSimulation() {
    uiContainer.html(''); // Limpieza del DOM
    atoms = [];
    metallicSim = null;

    let w = width;
    let h = height / 2;

    if (currentMode === 'IONIC' || currentMode === 'COVALENT') {
        // Posiciones: 25%, 50%, 75%
        atoms.push(new Atom(w * 0.25, h, 0));
        atoms.push(new Atom(w * 0.50, h, 1));
        atoms.push(new Atom(w * 0.75, h, 2));
        
        // Defaults
        if(currentMode === 'IONIC') {
            atoms[0].setElement('Na');
            atoms[1].setElement('Cl');
            atoms[2].setElement('NONE');
        } else {
            atoms[0].setElement('H');
            atoms[1].setElement('O');
            atoms[2].setElement('H');
        }
        buildMoleculeUI();
    } else if (currentMode === 'METALLIC') {
        metallicSim = new MetallicSimulation();
        buildMetallicUI();
    }
}

function buildMoleculeUI() {
    for (let i = 0; i < atoms.length; i++) {
        let panel = createDiv().class('atom-panel');
        
        let sel = createSelect();
        for (let el in ELEMENTS) {
            if (currentMode === 'COVALENT' && !ELEMENTS[el].isNM && el !== 'NONE') continue;
            sel.option(el);
        }
        sel.value(atoms[i].symbol);
        sel.changed(() => {
            atoms[i].setElement(sel.value());
            updateUIState();
        });
        
        let dataBox = createDiv().class('status-box').id(`data-${i}`);
        
        let btnBox = createDiv().class('btn-group');
        if (currentMode === 'IONIC') {
            if (i > 0) {
                let btnL = createButton('Transferir &larr;');
                btnL.mousePressed(() => transferElectron(i, i-1));
                btnBox.child(btnL);
            }
            if (i < 2) {
                let btnR = createButton('Transferir &rarr;');
                btnR.mousePressed(() => transferElectron(i, i+1));
                btnBox.child(btnR);
            }
        } else {
             // Lógica Covalente simplificada para UI
             if (i > 0) {
                let btnL = createButton('Compartir &larr;');
                btnBox.child(btnL);
            }
            if (i < 2) {
                let btnR = createButton('Compartir &rarr;');
                btnBox.child(btnR);
            }
        }

        panel.child(sel);
        panel.child(dataBox);
        panel.child(btnBox);
        uiContainer.child(panel);
    }
    updateUIState();
}

function buildMetallicUI() {
    let panel = createDiv().class('metallic-controls');
    panel.html('<h3>Voltaje Aplicado</h3>');
    
    let slider = createSlider(0, 10, 0, 0.1);
    slider.id('voltage-slider');
    
    let data = createDiv('Intensidad: 0.0 mA').id('current-data').class('status-box').style('margin-top', '10px');
    
    panel.child(slider);
    panel.child(data);
    uiContainer.child(panel);
}

// ==========================================
// ARQUITECTURA DE OBJETOS
// ==========================================

class Atom {
    constructor(x, y, index) {
        this.pos = createVector(x, y);
        this.index = index;
        this.symbol = 'NONE';
        this.data = ELEMENTS['NONE'];
        this.electrons = [];
        this.netCharge = 0;
    }

    setElement(sym) {
        this.symbol = sym;
        this.data = ELEMENTS[sym];
        this.buildElectrons();
        this.calcCharge();
    }

    buildElectrons() {
        this.electrons = [];
        if (this.symbol === 'NONE') return;
        
        let shellRadii = [40, 70, 100];
        for (let n = 0; n < this.data.config.length; n++) {
            let numE = this.data.config[n];
            let radius = shellRadii[n];
            for (let e = 0; e < numE; e++) {
                let angle = map(e, 0, numE, 0, TWO_PI);
                this.electrons.push({
                    shell: n,
                    radius: radius,
                    angle: angle,
                    speed: 0.02 + (n * 0.005), // Velocidades diferenciales por capa
                    color: this.data.color,
                    isShared: false
                });
            }
        }
    }

    calcCharge() {
        if (this.symbol === 'NONE') {
            this.netCharge = 0;
            return;
        }
        this.netCharge = this.data.Z - this.electrons.length;
    }

    getValenceCount() {
        if (this.electrons.length === 0) return 0;
        let maxShell = Math.max(...this.electrons.map(e => e.shell));
        return this.electrons.filter(e => e.shell === maxShell).length;
    }

    update() {
        for (let e of this.electrons) {
            e.angle += e.speed;
        }
    }

    draw() {
        if (this.symbol === 'NONE') return;

        // Órbitas
        stroke('#475569');
        noFill();
        strokeWeight(1);
        let maxS = Math.max(...this.electrons.map(e => e.shell));
        let shellRadii = [40, 70, 100];
        for (let i = 0; i <= maxS; i++) {
            drawingContext.setLineDash([5, 5]);
            circle(this.pos.x, this.pos.y, shellRadii[i] * 2);
        }
        drawingContext.setLineDash([]);

        // Núcleo
        fill('#E2E8F0');
        noStroke();
        circle(this.pos.x, this.pos.y, 30);
        
        fill('#0F172A');
        textAlign(CENTER, CENTER);
        textSize(14);
        textStyle(BOLD);
        text(this.symbol, this.pos.x, this.pos.y);

        // Electrones
        for (let e of this.electrons) {
            let ex = this.pos.x + cos(e.angle) * e.radius;
            let ey = this.pos.y + sin(e.angle) * e.radius;
            fill(e.color);
            circle(ex, ey, 8);
        }
    }
}

class MetallicSimulation {
    constructor() {
        this.cations = [];
        this.electrons = [];
        
        // Generar Retículo Cristalino
        let cols = Math.floor(width / 120);
        let rows = Math.floor(height / 120);
        let offsetX = (width - (cols-1)*120) / 2;
        let offsetY = (height - (rows-1)*120) / 2;

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                this.cations.push(createVector(offsetX + i*120, offsetY + j*120));
            }
        }

        // Generar Gas de Electrones
        for (let i = 0; i < 150; i++) {
            this.electrons.push({
                pos: createVector(random(width), random(height)),
                vel: p5.Vector.random2D().mult(random(0.5, 2))
            });
        }
    }

    updateAndDraw() {
        let voltage = select('#voltage-slider').value();
        let drift = map(voltage, 0, 10, 0, 8);
        
        select('#current-data').html(`Intensidad: ${(voltage * 1.5).toFixed(1)} mA<br>Velocidad de Deriva: ${drift.toFixed(2)}`);

        // Dibujar Cationes
        fill('#3B82F6');
        stroke('#60A5FA');
        strokeWeight(2);
        for (let c of this.cations) {
            circle(c.x, c.y, 40);
            fill('#fff'); noStroke();
            textAlign(CENTER, CENTER); text('Cu⁺', c.x, c.y);
            fill('#3B82F6'); stroke('#60A5FA');
        }

        // Actualizar y Dibujar Electrones (Mar de electrones)
        fill('#10B981');
        noStroke();
        for (let e of this.electrons) {
            // Cinemática Browniana + Deriva
            let noise = p5.Vector.random2D().mult(0.5);
            e.vel.add(noise);
            e.vel.limit(3); // Evitar explosión térmica
            
            let totalVel = p5.Vector.add(e.vel, createVector(drift, 0));
            e.pos.add(totalVel);

            // Condiciones de contorno periódicas (Toroide)
            if (e.pos.x > width) e.pos.x = 0;
            if (e.pos.x < 0) e.pos.x = width;
            if (e.pos.y > height) e.pos.y = 0;
            if (e.pos.y < 0) e.pos.y = height;

            circle(e.pos.x, e.pos.y, 6);
        }
    }
}

// ==========================================
// FÍSICA LÓGICA Y ESTADOS
// ==========================================

function transferElectron(fromIdx, toIdx) {
    let fromAtom = atoms[fromIdx];
    let toAtom = atoms[toIdx];
    
    if (fromAtom.symbol === 'NONE' || toAtom.symbol === 'NONE') return;
    
    let maxShell = Math.max(...fromAtom.electrons.map(e => e.shell));
    let valenceElectrons = fromAtom.electrons.filter(e => e.shell === maxShell);
    
    if (valenceElectrons.length > 0) {
        // Encontrar índice real en el array principal
        let eToMove = fromAtom.electrons.findIndex(e => e.shell === maxShell);
        let el = fromAtom.electrons.splice(eToMove, 1)[0];
        
        // Recalcular capa destino
        let toShell = Math.max(...toAtom.electrons.map(e => e.shell));
        let shellRadii = [40, 70, 100];
        
        el.shell = toShell;
        el.radius = shellRadii[toShell];
        toAtom.electrons.push(el);
        
        fromAtom.calcCharge();
        toAtom.calcCharge();
        updateUIState();
    }
}

function updateUIState() {
    for (let i = 0; i < atoms.length; i++) {
        let a = atoms[i];
        let box = select(`#data-${i}`);
        if (!box) continue;

        if (a.symbol === 'NONE') {
            box.html('Vacío');
            continue;
        }

        let qStr = a.netCharge > 0 ? `+${a.netCharge}` : (a.netCharge === 0 ? '0' : `${a.netCharge}`);
        let vCount = a.getValenceCount();
        let isStable = vCount === a.data.maxV || a.electrons.length === 0; // Kernel expuesto

        let statusClass = isStable ? 'check-pass' : 'check-fail';
        let statusIcon = isStable ? '✔ Estable' : '✖ Inestable';

        box.html(`
            Carga: <b>${qStr}</b><br>
            Capa Valencia: ${vCount}/${a.data.maxV}<br>
            <span class="${statusClass}">${statusIcon}</span>
        `);
    }
}

function drawForces() {
    for (let i = 0; i < atoms.length - 1; i++) {
        let a1 = atoms[i];
        let a2 = atoms[i+1];
        if (a1.symbol === 'NONE' || a2.symbol === 'NONE') continue;

        if (a1.netCharge * a2.netCharge < 0) {
            // Atracción electrostática de Coulomb
            stroke('#FBBF24');
            strokeWeight(3);
            drawingContext.setLineDash([10, 10]);
            line(a1.pos.x, a1.pos.y, a2.pos.x, a2.pos.y);
            drawingContext.setLineDash([]);
            
            // Flecha indicadora
            let midX = (a1.pos.x + a2.pos.x) / 2;
            fill('#FBBF24'); noStroke();
            textAlign(CENTER, BOTTOM);
            textSize(12);
            text("Fuerza Electrostática Activa", midX, a1.pos.y - 10);
        }
    }
}