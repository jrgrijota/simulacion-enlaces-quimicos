// ============================================================
// CIZALLADURA DE UN CRISTAL IÓNICO — MODELO FÍSICO
// ------------------------------------------------------------
// Interacción entre los dos bloques de la capa 2D separados por
// el plano de cizalladura (sin dependencias de p5):
//
//   E(dx, dy) = Σ  V_coul(r) + B / rⁿ − C / r⁶      (i arriba, j abajo)
//
// dx: desplazamiento lateral del bloque superior (Å)
// dy: separación adicional entre bloques (Å, > 0 = se alejan)
//
// · Coulomb con las cargas reales, sumado con el método de Wolf
//   ("damped shifted force", Fennell y Gezelter, 2006): converge con
//   un radio de corte de ~11 Å, así que basta con las réplicas
//   periódicas cercanas y se puede evaluar en cada fotograma.
// · Repulsión de Born: B se calibra para que la red en reposo
//   (dx = dy = 0) esté en equilibrio.
// · Dispersión de van der Waals: es lo que mantiene unidas las
//   láminas neutras de MgCl₂.
// En las capas que son proyecciones (rutilo, CdCl₂) cada ion conserva
// su profundidad real, así que las distancias son las del cristal 3D.
// Energías en eV, fuerzas en eV/Å.
// ============================================================

const COULOMB_K = 14.40;  // eV·Å / e²
const BORN_N    = 9;      // exponente de Born típico de sólidos iónicos (r⁻⁹)
const VDW_C     = 70;     // eV·Å⁶, orden de magnitud de Cl⁻–Cl⁻ (Mayer)
const WOLF_RC   = 11;     // radio de corte (Å)
const WOLF_A    = 0.26;   // amortiguamiento α (Å⁻¹); α·Rc ≈ 2.9

// erfc(x) para x ≥ 0 (Abramowitz y Stegun 7.1.26, error < 1.5·10⁻⁷)
function _erfc(x) {
    const t = 1 / (1 + 0.3275911 * x);
    const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
    return poly * Math.exp(-x * x);
}

const _WOLF_K2 = 2 * WOLF_A / Math.sqrt(Math.PI);
const _WOLF_EC = _erfc(WOLF_A * WOLF_RC) / WOLF_RC;                    // V(Rc) sin desplazar
const _WOLF_FC = _erfc(WOLF_A * WOLF_RC) / (WOLF_RC * WOLF_RC) +
                 _WOLF_K2 * Math.exp(-WOLF_A * WOLF_A * WOLF_RC * WOLF_RC) / WOLF_RC; // F(Rc)

// Iones de una celda periódica (a lo largo del plano) de cada bloque
function _shearCellIons(s, layer) {
    const L = s.layer;
    const eps = 1e-6;
    const qOf = kind => (kind === 'cat' ? s.cat.charge : s.an.charge);
    const ions = [];
    for (const site of L.sites) {
        for (let j = Math.floor(L.vRange[0]) - 1; j <= Math.ceil(L.vRange[1]) + 1; j++) {
            const v = site.v + j;
            if (v < L.vRange[0] - eps || v > L.vRange[1] + eps) continue;
            ions.push({
                x: site.u * L.w,
                y: (v - L.vRange[0]) * L.h,
                z: (site.z || 0) * (L.depth || 0),
                q: qOf(site.kind),
            });
        }
    }
    const planeY = layer.shear.planeY;
    return {
        top: ions.filter(p => p.y < planeY),
        bot: ions.filter(p => p.y > planeY),
    };
}

// Energía y fuerzas sobre el bloque superior (B: constante de Born).
// fyAttr / fyBorn separan la parte atractiva y la de Born (calibración).
function _shearEval(m, dx, dy, B) {
    const P = m.period, n = BORN_N, C = VDW_C, Rc = WOLF_RC, Rc2 = Rc * Rc;
    // Entre láminas neutras (MgCl₂) las cargas puntuales no describen bien la
    // interacción (domina la dispersión y la polarización): solo vdW + Born
    const kC = m.layered ? 0 : COULOMB_K;
    // Capa proyectada (rutilo, CdCl₂): réplicas también en profundidad; en
    // redes centradas, cada periodo a lo largo de la capa desplaza la
    // profundidad en depthShift·D
    const D = m.depth, DS = m.depthShift * D;
    let E = 0, fx = 0, fy = 0, fyBorn = 0, fyAttr = 0;
    for (const a of m.top) {
        const ax = a.x + dx, ay = a.y - dy; // el bloque superior sube al separarse
        for (const b of m.bot) {
            const ry = ay - b.y;
            if (Math.abs(ry) >= Rc) continue;
            const kq  = kC * a.q * b.q;
            const rx0 = ax - b.x;
            const k0 = Math.ceil((-Rc - rx0) / P), k1 = Math.floor((Rc - rx0) / P);
            for (let k = k0; k <= k1; k++) {
                const rx = rx0 + k * P;
                const z0 = a.z - b.z + k * DS;
                const kz0 = D ? Math.ceil((-Rc - z0) / D) : 0, kz1 = D ? Math.floor((Rc - z0) / D) : 0;
                for (let kz = kz0; kz <= kz1; kz++) {
                    const rz = D ? z0 + kz * D : 0;
                    const r2 = rx * rx + ry * ry + rz * rz;
                    if (r2 >= Rc2) continue;
                    const r   = Math.sqrt(r2);
                    const erf = _erfc(WOLF_A * r);
                    // Coulomb amortiguado y desplazado: V(Rc) = F(Rc) = 0
                    const eC = kq * (erf / r - _WOLF_EC + _WOLF_FC * (r - Rc));
                    const gC = kq * (erf / r2 + _WOLF_K2 * Math.exp(-WOLF_A * WOLF_A * r2) / r - _WOLF_FC) / r;
                    const r6 = r2 * r2 * r2;
                    const eB = B / (r6 * r2 * r);   // B / r⁹
                    const eV = -C / r6;
                    E += eC + eB + eV;
                    // F = −∇E sobre el ion superior = g·(rx, ry)
                    const gBV = (n * eB + 6 * eV) / r2;
                    const g   = gC + gBV;
                    fx += g * rx;
                    // dy mueve el ion en −y: F_dy = −∂E/∂dy = −g·ry
                    fy     -= g * ry;
                    fyAttr -= (gC + 6 * eV / r2) * ry;
                    fyBorn -= (n * eB / r2) * ry;
                }
            }
        }
    }
    return { E, fx, fy, fyAttr, fyBorn };
}

function shearForce(m, dx, dy) {
    const f = _shearEval(m, dx, dy, m.B);
    f.fx -= m.fx0 || 0;
    return f;
}

// Separación de equilibrio para un desplazamiento lateral dado: barrido
// grueso de la energía y ajuste fino con Newton (evita ramas espurias)
function relaxShearGap(m, dx) {
    let best = 0, bestE = Infinity;
    for (let g = -0.5; g <= 1.5 + 1e-9; g += 0.05) {
        const E = _shearEval(m, dx, g, m.B).E;
        if (E < bestE) { bestE = E; best = g; }
    }
    let dy = best;
    const h = 1e-3;
    for (let it = 0; it < 12; it++) {
        const f = shearForce(m, dx, dy).fy;
        const k = (shearForce(m, dx, dy - h).fy - shearForce(m, dx, dy + h).fy) / (2 * h);
        if (k <= 1e-6) break;
        const step = Math.max(-0.05, Math.min(0.05, f / k));
        dy += step;
        if (Math.abs(step) < 1e-5) break;
    }
    return dy;
}

// Construye el modelo de cizalladura de una estructura.
function buildShearModel(s, layer) {
    const { top, bot } = _shearCellIons(s, layer);
    const m = {
        period: layer.period, top, bot, B: 0, layered: !!s.layered,
        depth: s.layer.depth || 0, depthShift: s.layer.depthShift || 0,
    };

    // Calibración de B: fuerza normal nula en reposo
    const c = _shearEval(m, 0, 0, 0);
    const b = _shearEval(m, 0, 0, 1);
    m.B = c.fyAttr < 0 ? -c.fyAttr / b.fyBorn : 0;
    // Residuo lateral en reposo (por simetría es ~0); lo compensaría el resto del cristal
    m.fx0 = 0;
    m.fx0 = shearForce(m, 0, 0).fx;

    // Rigideces en reposo
    const h = 1e-3;
    m.kx = (shearForce(m, -h, 0).fx - shearForce(m, h, 0).fx) / (2 * h);
    m.ky = (shearForce(m, 0, -h).fy - shearForce(m, 0, h).fy) / (2 * h);
    // Rigidez normal con algo de compresión (Born se endurece mucho): fija
    // el paso de integración para que la dinámica sea estable
    m.kyMax = Math.max(m.ky, (shearForce(m, 0, -0.12).fy - shearForce(m, 0, -0.12 + 2 * h).fy) / (2 * h));

    // Separación de rotura: donde la atracción entre bloques es máxima. Más
    // allá, al separarse, se atraen cada vez menos y la grieta se abre sola.
    m.fractureGap = 0;
    m.cohesion = 0;
    for (let g = 0.01; g < 3; g += 0.01) {
        const pull = -shearForce(m, 0, g).fy;
        if (pull > m.cohesion) { m.cohesion = pull; m.fractureGap = g; }
    }

    // Resistencia a la cizalladura: máxima fuerza recuperadora a lo largo del
    // camino de deslizamiento con la separación relajada. Si antes de llegar
    // a medio periodo las capas se separan más que fractureGap, el cristal
    // ya se rompe ahí.
    m.tauMax = 0;
    m.dxAtTau = 0;
    const steps = 32;
    for (let i = 1; i <= steps / 2; i++) {
        const dx = (i / steps) * m.period;
        const dy = relaxShearGap(m, dx);
        if (dy > m.fractureGap) break;
        const f = -shearForce(m, dx, dy).fx;
        if (f > m.tauMax) { m.tauMax = f; m.dxAtTau = dx; }
    }
    return m;
}

// ── Dinámica del bloque superior ─────────────────────────────
// Masa y amortiguamiento ficticios elegidos para que la respuesta
// elástica dure ~1 s a 60 fps (la física no depende de ellos).
function createShearState(m) {
    const omega  = (2 * Math.PI) / 50;          // rad/fotograma (eje x)
    const M      = Math.max(m.kx, 1e-3) / (omega * omega);
    const omegaY = Math.sqrt(Math.max(m.kyMax, m.kx) / M);
    return {
        dx: 0, dy: 0, vx: 0, vy: 0,
        M, gamma: 1.1 * omega,
        substeps: Math.min(40, Math.max(1, Math.ceil(omegaY / 0.15))),
        fractureGap: m.fractureGap,             // separación a partir de la cual se rompe
        fractured: false,
    };
}

// Avanza un fotograma con una fuerza lateral aplicada Fext (eV/Å).
function stepShear(st, m, Fext) {
    if (st.fractured) return st;
    const dt = 1 / st.substeps;
    for (let i = 0; i < st.substeps; i++) {
        const f  = shearForce(m, st.dx, st.dy);
        const ax = (Fext + f.fx) / st.M - st.gamma * st.vx;
        const ay = f.fy / st.M - st.gamma * st.vy;
        st.vx += ax * dt; st.vy += ay * dt;
        st.dx += st.vx * dt; st.dy += st.vy * dt;
    }
    if (st.dy > st.fractureGap) st.fractured = true;
    return st;
}
