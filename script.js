/* LURA Nexus V8 — Clean White Apple Aesthetic */
const API_BASE = '';  // Empty = relative URLs, works with any tunnel/proxy port

const DRUGS = {
    'Doxorubicin': 'CC(=O)C1=C(O)C=C2C(=O)C3=C(C=CC=C3O)C(=O)C2=C1',
    'Paclitaxel': 'CC1=C2C(C(=O)C3',
    'Cisplatin': '[NH3][Pt]([NH3])(Cl)Cl',
    'Imatinib': 'CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)NC4=NC=CC(=N4)C5=CC=CN=C5',
    'Lapatinib': 'CS(=O)(=O)CCNCC1=CC=C(O1)C2=CC3=C(C=C2)N=CN=C3NC4=CC(=C(C=C4)OCC5=CC(=CC=C5)F)Cl',
    'Erlotinib': 'COCCOC1=C(C=C2C(=C1)C(=NC=N2)NC3=CC=CC(=C3)C#C)OCCOC',
    'Sorafenib': 'CNC(=O)C1=NC=CC(=C1)OC2=CC=C(C=C2)NC(=O)NC3=CC(=C(C=C3)Cl)C(F)(F)F',
    'Olaparib': 'CC1=CC(=C(C=C1)C(=O)N2CCN(CC2)C(=O)C3=C(C4=CC=CC=C4N3)F)F',
    'Venetoclax': 'CC1(CCC(=C(C1)C2=CC=C(C=C2)Cl)CN3CCN(CC3)C)C',
    'Ibrutinib': 'C=CC(=O)N1CCC(CC1)N2C3=NC=NC(=C3C(=N2)C4=CC=C(C=C4)OC5=CC=CC=C5)N'
};

const CELL_LINES = [
    { id: 'ACH-000007', name: 'MCF7', tissue: 'Breast', subtype: 'Luminal A', mutations: ['PIK3CA E545K'] },
    { id: 'ACH-000016', name: 'A549', tissue: 'Lung', subtype: 'NSCLC', mutations: ['KRAS G12S'] },
    { id: 'ACH-000012', name: 'HT-29', tissue: 'Colon', subtype: 'Colorectal', mutations: ['BRAF V600E'] },
    { id: 'ACH-000025', name: 'PC-3', tissue: 'Prostate', subtype: 'Adenocarcinoma', mutations: ['PTEN del'] },
    { id: 'ACH-000029', name: 'MDA-MB-231', tissue: 'Breast', subtype: 'TNBC', mutations: ['TP53 R280K'] },
    { id: 'ACH-000044', name: 'SKOV-3', tissue: 'Ovary', subtype: 'Serous', mutations: ['PIK3CA H1047R'] },
    { id: 'ACH-000075', name: 'U-251', tissue: 'Brain', subtype: 'GBM', mutations: ['TP53 R273H'] },
    { id: 'ACH-000098', name: 'K-562', tissue: 'Blood', subtype: 'CML', mutations: ['BCR-ABL+'] },
    { id: 'ACH-000152', name: 'HCT-116', tissue: 'Colon', subtype: 'Colorectal', mutations: ['KRAS G13D'] },
    { id: 'ACH-000219', name: 'NCI-H1975', tissue: 'Lung', subtype: 'NSCLC', mutations: ['EGFR T790M'] },
    { id: 'ACH-000244', name: 'BT-474', tissue: 'Breast', subtype: 'HER2+', mutations: ['PIK3CA K111N'] }
];

const PANELS = { demo: CELL_LINES, lung: CELL_LINES.filter(c=>c.tissue==='Lung'), breast: CELL_LINES.filter(c=>c.tissue==='Breast'), full: CELL_LINES };

let engineOnline = false, screenRunning = false, batchResults = [], tmeHeatmapData = null;
let landingAnim = null, cortexAnim = null, organoidState = { viability: 1, caf: 0.2, m2: 0.1, drug: 0, sim: false, t: 0 };

document.addEventListener('DOMContentLoaded', () => { populateDropdowns(); initNav(); checkHealth(); initLanding(); });

function populateDropdowns() {
    ['cortexDrug','doseDrug','tmeDrug','comboDrugA','comboDrugB','panelDrug'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = Object.keys(DRUGS).map(n => `<option value="${n}">${n}</option>`).join('');
    });
    ['cortexCell','doseCell','tmeCell','comboCell'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = CELL_LINES.map(c => `<option value="${c.id}">${c.name} (${c.tissue})</option>`).join('');
    });
}

function initNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => { if (item.dataset.view) switchView(item.dataset.view); });
    });
}

function switchView(v) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    document.querySelector(`.nav-item[data-view="${v}"]`)?.classList.add('active');
    document.getElementById(`view-${v}`)?.classList.add('active');
    if (v === 'cortex') initOrganoid();
}

async function checkHealth() {
    const dot = document.getElementById('engineDot'), lbl = document.getElementById('engineLabel'), det = document.getElementById('engineDetail');
    try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) { engineOnline = true; dot.className = 'engine-dot connected'; lbl.textContent = 'Engine Online'; det.textContent = 'Production ready'; }
        else throw 0;
    } catch { engineOnline = false; dot.className = 'engine-dot demo'; lbl.textContent = 'Demo Mode'; det.textContent = 'Simulated data'; }
}

function enterLab() { document.getElementById('landingPage').style.display = 'none'; document.getElementById('labContainer').style.display = 'flex'; if (landingAnim) cancelAnimationFrame(landingAnim); initOrganoid(); }
function exitLab() { document.getElementById('labContainer').style.display = 'none'; document.getElementById('landingPage').style.display = 'grid'; if (cortexAnim) cancelAnimationFrame(cortexAnim); initLanding(); }

/* Landing page cluster - light theme with dark dots - OPTIMIZED */
function initLanding() {
    const c = document.getElementById('landingCortex'); if (!c) return;
    const ctx = c.getContext('2d', { alpha: false }), dpr = Math.min(devicePixelRatio || 1, 2);
    let w, h, cx, cy, rad;
    const resize = () => { 
        const r = c.parentElement.getBoundingClientRect(); 
        w = r.width; h = r.height;
        c.width = w * dpr; c.height = h * dpr; 
        c.style.width = w + 'px'; c.style.height = h + 'px'; 
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx = w / 2; cy = h / 2; rad = Math.min(w, h) * 0.35;
    };
    resize(); window.addEventListener('resize', resize);
    const pts = Array.from({length: 150}, () => { 
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = rad * (0.6 + Math.random() * 0.4);
        return { bx: r * Math.sin(ph) * Math.cos(th), by: r * Math.sin(ph) * Math.sin(th), bz: r * Math.cos(ph), sz: 2 + Math.random() * 3, al: 0.2 + Math.random() * 0.5, p: Math.random() * Math.PI * 2, x: 0, y: 0, z: 0 };
    });
    let lastTime = 0;
    function anim(timestamp) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;
        const t = timestamp * 0.0003;
        ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, w, h);
        const cos = Math.cos(t), sin = Math.sin(t);
        const breathe = 1 + 0.02 * Math.sin(t * 0.5);
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            const nx = p.bx * cos - p.bz * sin;
            p.x = cx + nx * breathe; p.y = cy + p.by * breathe; p.z = p.bx * sin + p.bz * cos;
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.035)'; ctx.lineWidth = 0.6;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) { 
                const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
                if (dx * dx + dy * dy < 2500) { ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); }
            }
        }
        ctx.stroke();
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i], dp = (p.z + rad) / (2 * rad);
            ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * (0.5 + dp * 0.5), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(29,29,31,${(p.al * (0.3 + dp * 0.7)).toFixed(2)})`; ctx.fill();
        }
        landingAnim = requestAnimationFrame(anim);
    }
    landingAnim = requestAnimationFrame(anim);
}

/* Organoid canvas - light theme - OPTIMIZED */
function initOrganoid() {
    const c = document.getElementById('organoidCanvas'); if (!c) return;
    const ctx = c.getContext('2d', { alpha: false }), dpr = Math.min(devicePixelRatio || 1, 2);
    let w, h, cx, cy, rad;
    const resize = () => { 
        const r = c.parentElement.getBoundingClientRect(); 
        w = r.width; h = r.height;
        c.width = w * dpr; c.height = h * dpr; 
        c.style.width = w + 'px'; c.style.height = h + 'px'; 
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx = w / 2; cy = h / 2; rad = Math.min(w, h) * 0.35;
    };
    resize();
    const cells = Array.from({length: 280}, () => {
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = rad * Math.pow(Math.random(), 0.33);
        const x = r * Math.sin(ph) * Math.cos(th), y = r * Math.sin(ph) * Math.sin(th), z = r * Math.cos(ph);
        const rnd = Math.random(), type = rnd < 0.2 ? 'caf' : rnd < 0.3 ? 'm2' : 'cancer';
        return { x, y, z, bx: x, by: y, bz: z, type, alive: true, sz: 4 + Math.random() * 3, ph: Math.random() * Math.PI * 2, ps: 0.5 + Math.random() };
    });
    const colors = { cancer: {r:107,g:91,b:149}, caf: {r:188,g:143,b:143}, m2: {r:91,g:124,b:153}, dead: {r:209,g:209,b:214} };
    let lastTime = 0, sortedCells = [...cells];
    
    function anim(timestamp) {
        const dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        organoidState.t += dt;
        const t = organoidState.t;
        
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
        
        const rs = organoidState.sim ? 0.6 : 0.15;
        const cos = Math.cos(t * rs), sin = Math.sin(t * rs);
        const df = organoidState.sim ? 0.12 : 0.04;
        const deathChance = organoidState.sim ? (1 - organoidState.viability) * 0.002 : 0;
        
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const nx = cell.bx * cos - cell.bz * sin;
            const br = 1 + df * Math.sin(t * cell.ps + cell.ph);
            cell.x = nx * br; cell.y = cell.by * br; cell.z = cell.bx * sin + cell.bz * cos;
            if (deathChance > 0 && cell.alive && cell.type === 'cancer' && Math.random() < deathChance) cell.alive = false;
        }
        
        if (Math.floor(t * 2) % 2 === 0) sortedCells = [...cells].sort((a, b) => a.z - b.z);
        
        for (let i = 0; i < sortedCells.length; i++) {
            const cell = sortedCells[i];
            const sx = cx + cell.x, sy = cy + cell.y;
            const dp = (cell.z + rad) / (2 * rad);
            const sz = cell.sz * (0.4 + dp * 0.6);
            const al = cell.alive ? 0.4 + dp * 0.6 : 0.25;
            const c = cell.alive ? colors[cell.type] : colors.dead;
            const pl = organoidState.sim ? Math.sin(t * 2.5 + cell.ph) * 0.1 : 0;
            ctx.beginPath(); ctx.arc(sx, sy, sz * (1 + pl), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${al.toFixed(2)})`; ctx.fill();
        }
        
        if (organoidState.sim && organoidState.drug > 0) {
            const waveRad = rad * 1.15 * (0.5 + 0.5 * Math.sin(t * 1.5));
            ctx.beginPath(); ctx.arc(cx, cy, waveRad, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0,113,227,${(0.2 * organoidState.drug).toFixed(2)})`; ctx.lineWidth = 1.5; ctx.stroke();
        }
        
        cortexAnim = requestAnimationFrame(anim);
    }
    cortexAnim = requestAnimationFrame(anim);
}

function updateOrganoid(v, caf, m2, drug, sim) { 
    organoidState.viability = v; organoidState.caf = caf; organoidState.m2 = m2; organoidState.drug = drug; organoidState.sim = sim; 
    const p = document.getElementById('cortexPulse'), s = document.getElementById('cortexStatus'); 
    if (p) p.className = sim ? 'pulse-indicator simulating' : 'pulse-indicator'; 
    if (s) s.textContent = sim ? 'Simulating...' : 'Ready'; 
}

async function runCortex() {
    const cellId = document.getElementById('cortexCell').value, drug = document.getElementById('cortexDrug').value, dose = document.getElementById('cortexDose').value / 10, caf = document.getElementById('cortexCaf').value / 100, m2 = document.getElementById('cortexM2').value / 100;
    const btn = document.getElementById('runCortexBtn'); btn.disabled = true; btn.textContent = 'Simulating...';
    updateOrganoid(1, caf, m2, dose / 10, true);
    const st = Date.now();
    let res;
    if (engineOnline) { 
        const r = await fetch(`${API_BASE}/predict`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ depmap_id: cellId, smiles: DRUGS[drug], dose_multiplier: dose, caf_fraction: caf, m2_fraction: m2, return_trajectory: true }) }); 
        res = await r.json(); 
    } else { 
        await new Promise(r => setTimeout(r, 1500)); 
        res = { auc: Math.max(0.1, 0.7 * (1 - caf * 0.5 - m2 * 0.3) * Math.min(dose / 5, 1)), penetration: 0.7 - caf * 0.4, t50: 12 + Math.random() * 24 }; 
    }
    document.getElementById('cortexLatency').textContent = `${res.latency_ms || (Date.now() - st)}ms`;
    // Map backend response fields (predicted_auc, mechanistic) to frontend display
    const auc = res.predicted_auc ?? res.auc ?? 0.5;
    const mech = res.mechanistic || {};
    const penetration = mech.penetration_score ?? res.penetration ?? 0.7;
    const hypoxia = mech.hypoxia_resistance ?? 0.15;
    const stromal = mech.stromal_shielding ?? caf * 0.8;
    const sensitivity = mech.mean_sensitivity ?? auc;
    const t50 = res.time_to_kill_hours ?? res.t50 ?? 18;
    
    const viab = 1 - auc;
    animateViab(viab, caf, m2, dose / 10);
    document.getElementById('cortexAUC').textContent = auc.toFixed(3);
    document.getElementById('cortexKill').textContent = ((1 - viab) * 100).toFixed(1) + '%';
    document.getElementById('cortexPen').textContent = penetration.toFixed(2);
    document.getElementById('cortexT50').textContent = t50.toFixed(1) + 'h';
    document.getElementById('cortexMechanistic').style.display = 'block';
    ['mechPen', 'mechHypoxia', 'mechStroma', 'mechSens'].forEach((id, i) => { 
        const v = [penetration, hypoxia, stromal, sensitivity][i]; 
        document.getElementById(id).textContent = (v * 100).toFixed(0) + '%'; 
        document.getElementById(id + 'Bar').style.width = (v * 100) + '%'; 
    });
    document.getElementById('cortexTrajectory').style.display = 'block';
    renderTraj(viab);
    btn.disabled = false; btn.textContent = 'Run Simulation';
}

function animateViab(tgt, caf, m2, drug) { 
    const dur = 2000, start = organoidState.viability, st = Date.now(); 
    function step() { 
        const p = Math.min((Date.now() - st) / dur, 1), e = 1 - Math.pow(1 - p, 3); 
        updateOrganoid(start + (tgt - start) * e, caf, m2, drug * (1 - p * 0.5), p < 1); 
        if (p < 1) requestAnimationFrame(step); 
    } 
    step(); 
}

function renderTraj(v) { 
    const c = document.getElementById('trajectoryChart'); c.innerHTML = ''; 
    for (let i = 0; i <= 10; i++) { 
        const t = i / 10, y = 1 - (1 - v) * (1 - Math.exp(-3 * t)); 
        const b = document.createElement('div'); b.className = 'dose-bar'; 
        b.style.height = (y * 100) + '%'; 
        b.style.background = y > 0.5 ? '#34c759' : y > 0.3 ? '#ff9500' : '#ff3b30'; 
        c.appendChild(b); 
    } 
}

async function runDose() {
    const cellId = document.getElementById('doseCell').value, drug = document.getElementById('doseDrug').value, cellName = CELL_LINES.find(c => c.id === cellId)?.name || cellId;
    let res;
    if (engineOnline) { 
        const r = await fetch(`${API_BASE}/predict/dose-response`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ depmap_id: cellId, smiles: DRUGS[drug], dose_points: [0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0] }) }); 
        res = await r.json(); 
    } else { 
        await new Promise(r => setTimeout(r, 800)); 
        const ic50 = 0.5 + Math.random() * 3, hill = 1 + Math.random(), emax = 0.9; 
        res = { responses: [0.001, 0.01, 0.1, 1, 10].map(d => emax * Math.pow(d / ic50, hill) / (1 + Math.pow(d / ic50, hill))), ic50, ic90: ic50 * 10, hill, emax }; 
    }
    // Map backend response: viabilities array, estimated_ic50, estimated_ic90, hill_slope, max_effect
    const responses = res.viabilities || res.responses || [];
    renderDoseCanvas(responses.length ? responses : res);
    const ic50 = res.estimated_ic50 ?? res.ic50 ?? 1.2;
    const ic90 = res.estimated_ic90 ?? res.ic90 ?? 8.5;
    const hill = res.hill_slope ?? res.hill ?? 1.4;
    const emax = res.max_effect ?? res.emax ?? 0.92;
    document.getElementById('doseIC50').textContent = ic50.toFixed(2) + ' µM';
    document.getElementById('doseIC90').textContent = ic90.toFixed(2) + ' µM';
    document.getElementById('doseHill').textContent = hill.toFixed(2);
    document.getElementById('doseEmax').textContent = (emax * 100).toFixed(0) + '%';
    const ins = document.getElementById('doseInsight'), txt = document.getElementById('doseInsightText'); ins.style.display = 'flex';
    let msg = ic50 < 0.1 ? `<strong>Highly Sensitive:</strong> ${cellName} shows exceptional sensitivity to ${drug} (IC50 < 100nM).` : ic50 < 1 ? `<strong>Good Response:</strong> ${cellName} has clinically relevant sensitivity (IC50 ${ic50.toFixed(2)} µM).` : ic50 < 5 ? `<strong>Moderate Response:</strong> Higher doses may be required.` : `<strong>Resistant:</strong> Consider alternative agents or combinations.`;
    if (hill > 2) msg += ' Steep Hill slope indicates cooperative binding.'; else if (hill < 1) msg += ' Shallow slope suggests heterogeneous response.';
    txt.innerHTML = msg;
}

function renderDoseCanvas(resp) {
    const c = document.getElementById('doseCanvas'); if (!c) return;
    const ctx = c.getContext('2d'), dpr = devicePixelRatio || 1, rect = c.getBoundingClientRect();
    c.width = rect.width * dpr; c.height = rect.height * dpr; ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height, pad = 50;
    ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const y = pad + (h - 2 * pad) * i / 4; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.font = '11px -apple-system, sans-serif'; ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) ctx.fillText((100 - i * 25) + '%', pad - 8, pad + (h - 2 * pad) * i / 4 + 4);
    ctx.textAlign = 'center'; [0.001, 0.01, 0.1, 1, 10].forEach((d, i) => ctx.fillText(d < 1 ? d.toString() : d.toFixed(0), pad + (w - 2 * pad) * i / 4, h - pad + 20));
    ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
    resp.forEach((r, i) => { const x = pad + (w - 2 * pad) * i / (resp.length - 1), y = pad + (h - 2 * pad) * (1 - r); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.stroke();
    resp.forEach((r, i) => { 
        const x = pad + (w - 2 * pad) * i / (resp.length - 1), y = pad + (h - 2 * pad) * (1 - r); 
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = '#1d1d1f'; ctx.fill(); 
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); 
    });
}

async function runTME() {
    const cellId = document.getElementById('tmeCell').value, drug = document.getElementById('tmeDrug').value, dose = document.getElementById('tmeDose').value / 10;
    const container = document.getElementById('tmeHeatmap'); container.innerHTML = '<div style="padding:40px;text-align:center;color:#86868b">Generating...</div>';
    let res;
    if (engineOnline) { 
        const r = await fetch(`${API_BASE}/predict/tme-sweep`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ depmap_id: cellId, smiles: DRUGS[drug], caf_range: [0, 0.1, 0.2, 0.3, 0.4, 0.5], m2_range: [0, 0.05, 0.1, 0.15, 0.2, 0.25] }) }); 
        res = await r.json(); 
    } else { 
        await new Promise(r => setTimeout(r, 1200)); 
        const cafR = [0, 0.1, 0.2, 0.3, 0.4, 0.5], m2R = [0, 0.05, 0.1, 0.15, 0.2, 0.25]; 
        let mn = 1, mx = 0; 
        const hm = cafR.map(caf => m2R.map(m2 => { const v = Math.max(0.1, 0.8 - caf * 0.8 - m2 * 0.4 + Math.random() * 0.1); if (v < mn) mn = v; if (v > mx) mx = v; return v; })); 
        const det = cafR.map((caf, i) => m2R.map((m2, j) => ({ auc: hm[i][j], caf, m2, penetration: 0.9 - caf * 0.5, resistance: caf * 0.6 + m2 * 0.3 }))); 
        res = { heatmap: hm, detailedData: det, optimal_auc: mx, worst_auc: mn, cafRange: cafR, m2Range: m2R }; 
    }
    // Map backend response: viability_matrix, optimal_tme, worst_tme
    const matrix = res.viability_matrix || res.heatmap || [];
    tmeHeatmapData = { ...res, heatmap: matrix, cafRange: res.caf_values || res.cafRange, m2Range: res.m2_values || res.m2Range };
    renderHeatmap(matrix, container);
    document.getElementById('tmeInsights').style.display = 'block';
    const opt = res.optimal_tme || {};
    const worst = res.worst_tme || {};
    document.getElementById('tmeOptLabel').textContent = `CAF ${((opt.caf_fraction ?? 0) * 100).toFixed(0)}% / M2 ${((opt.m2_fraction ?? 0) * 100).toFixed(0)}%`;
    document.getElementById('tmeOptAUC').textContent = (opt.viability ?? res.optimal_auc ?? 0.78).toFixed(3);
    document.getElementById('tmeWorstLabel').textContent = `CAF ${((worst.caf_fraction ?? 0.5) * 100).toFixed(0)}% / M2 ${((worst.m2_fraction ?? 0.25) * 100).toFixed(0)}%`;
    document.getElementById('tmeWorstAUC').textContent = (worst.viability ?? res.worst_auc ?? 0.23).toFixed(3);
    const avgPen = 65, avgShield = 35;
    document.getElementById('tmePen').textContent = avgPen + '%'; document.getElementById('tmePenBar').style.width = avgPen + '%';
    document.getElementById('tmeShield').textContent = avgShield + '%'; document.getElementById('tmeShieldBar').style.width = avgShield + '%';
}

function renderHeatmap(data, container) {
    container.innerHTML = ''; container.style.gridTemplateColumns = `repeat(${data[0]?.length || 6}, 1fr)`;
    const cafR = tmeHeatmapData?.cafRange || [0, 0.1, 0.2, 0.3, 0.4, 0.5], m2R = tmeHeatmapData?.m2Range || [0, 0.05, 0.1, 0.15, 0.2, 0.25];
    data.forEach((row, i) => row.forEach((val, j) => { 
        const cell = document.createElement('div'); cell.className = 'heatmap-cell'; 
        /* Elegant color scale: red -> yellow -> green */
        const hue = val * 100;
        cell.style.background = `hsl(${hue}, 65%, 55%)`; 
        cell.dataset.row = i; cell.dataset.col = j; 
        cell.addEventListener('click', () => selectCell(i, j, val, cafR[i], m2R[j])); 
        container.appendChild(cell); 
    }));
}

function selectCell(row, col, auc, caf, m2) {
    document.querySelectorAll('.heatmap-cell').forEach(c => c.classList.remove('selected'));
    document.querySelector(`.heatmap-cell[data-row="${row}"][data-col="${col}"]`)?.classList.add('selected');
    document.getElementById('tmeSelected').style.display = 'block';
    document.getElementById('selectedCaf').textContent = (caf * 100).toFixed(0) + '%';
    document.getElementById('selectedM2').textContent = (m2 * 100).toFixed(0) + '%';
    document.getElementById('selectedAUC').textContent = auc.toFixed(3);
    const d = tmeHeatmapData?.detailedData?.[row]?.[col];
    document.getElementById('selectedSens').textContent = ((d?.auc || auc) * 100).toFixed(0) + '%';
    document.getElementById('selectedPen').textContent = ((d?.penetration || 0.9 - caf * 0.5) * 100).toFixed(0) + '%';
    document.getElementById('selectedRes').textContent = ((d?.resistance || caf * 0.6 + m2 * 0.3) * 100).toFixed(0) + '%';
}

async function runCombo() {
    const cellId = document.getElementById('comboCell').value, drugA = document.getElementById('comboDrugA').value, drugB = document.getElementById('comboDrugB').value;
    if (drugA === drugB) { alert('Select two different drugs'); return; }
    document.getElementById('comboEmpty').style.display = 'none';
    let res;
    if (engineOnline) { 
        const r = await fetch(`${API_BASE}/predict/combination`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ depmap_id: cellId, smiles_a: DRUGS[drugA], smiles_b: DRUGS[drugB], ratio_a: 0.5 }) }); 
        res = await r.json(); 
    } else { 
        await new Promise(r => setTimeout(r, 1000)); 
        const a = 0.25 + Math.random() * 0.25, b = 0.25 + Math.random() * 0.25, syn = 0.8 + Math.random() * 0.4; 
        res = { effect_a: a, effect_b: b, combined_effect: Math.min(1, (a + b) / syn), combination_index: syn }; 
    }
    document.getElementById('comboResults').style.display = 'block'; document.getElementById('comboIsobologram').style.display = 'block';
    document.getElementById('comboLabelA').textContent = drugA; document.getElementById('comboLabelB').textContent = drugB;
    // Map backend response: dose_response array with effect_a, effect_b, bliss_predicted_effect
    const dr = res.dose_response?.[2] || {};  // Use middle dose point
    const a = dr.effect_a ?? res.max_effect_a ?? res.effect_a ?? 0.35;
    const b = dr.effect_b ?? res.max_effect_b ?? res.effect_b ?? 0.42;
    const comb = dr.bliss_predicted_effect ?? res.combined_effect ?? 0.68;
    const exp = a + b - a * b;
    document.getElementById('comboAloneA').textContent = a.toFixed(2); document.getElementById('comboAloneB').textContent = b.toFixed(2); document.getElementById('comboTogether').textContent = comb.toFixed(2);
    document.getElementById('comboBarA').style.height = (a * 100) + '%'; document.getElementById('comboBarB').style.height = (b * 100) + '%'; document.getElementById('comboBarCombined').style.height = (comb * 100) + '%';
    const ci = res.combination_index ?? (exp / comb);
    document.getElementById('comboCI').textContent = ci.toFixed(2); document.getElementById('comboEffect').textContent = (comb * 100).toFixed(0) + '%'; document.getElementById('comboExpected').textContent = (exp * 100).toFixed(0) + '%';
    const [verdict, style] = ci < 0.9 ? ['Synergistic', 'color:#34c759'] : ci < 1.1 ? ['Additive', 'color:#ff9500'] : ['Antagonistic', 'color:#ff3b30'];
    document.getElementById('comboVerdict').textContent = verdict; document.getElementById('comboVerdict').style.cssText = style;
    renderIso(a, b, comb, ci);
}

function renderIso(a, b, comb, ci) {
    const c = document.getElementById('isoCanvas'); if (!c) return;
    const ctx = c.getContext('2d'), dpr = devicePixelRatio || 1, rect = c.getBoundingClientRect();
    c.width = rect.width * dpr; c.height = rect.height * dpr; ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height, pad = 50;
    ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(52,199,89,0.08)'; ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h - pad); ctx.lineTo(w - pad, h - pad); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(w - pad, h - pad); ctx.stroke(); ctx.setLineDash([]);
    const ox = pad + (w - 2 * pad) * (ci < 1 ? 0.3 : ci > 1 ? 0.7 : 0.5), oy = pad + (h - 2 * pad) * (ci < 1 ? 0.3 : ci > 1 ? 0.7 : 0.5);
    ctx.beginPath(); ctx.arc(ox, oy, 10, 0, Math.PI * 2); ctx.fillStyle = ci < 1 ? '#34c759' : ci > 1.1 ? '#ff3b30' : '#ff9500'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
}

async function runPanel() {
    const drug = document.getElementById('panelDrug').value, panelType = document.getElementById('panelSet').value, panel = PANELS[panelType] || PANELS.demo;
    document.getElementById('panelEmpty').style.display = 'none';
    let results;
    if (engineOnline) { 
        const r = await fetch(`${API_BASE}/predict/panel`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ smiles: DRUGS[drug], depmap_ids: panel.map(c => c.id) }) }); 
        const data = await r.json();
        // Map backend response: results array with depmap_id, predicted_auc
        results = (data.results || data).map(r => ({
            cell_line_id: r.depmap_id || r.cell_line_id,
            auc: r.predicted_auc ?? r.auc,
            name: panel.find(c => c.id === (r.depmap_id || r.cell_line_id))?.name || r.depmap_id,
            tissue: panel.find(c => c.id === (r.depmap_id || r.cell_line_id))?.tissue || '',
            mutations: panel.find(c => c.id === (r.depmap_id || r.cell_line_id))?.mutations?.join(', ') || ''
        }));
    } else { 
        await new Promise(r => setTimeout(r, 1500)); 
        results = panel.map(cell => ({ cell_line_id: cell.id, name: cell.name, tissue: cell.tissue, mutations: cell.mutations.join(', '), auc: Math.random() * 0.8 + 0.1 })); 
    }
    results.sort((a, b) => (b.auc || 0) - (a.auc || 0));
    document.getElementById('panelResults').style.display = 'flex'; document.getElementById('panelStats').style.display = 'block';
    const wf = document.getElementById('panelWaterfall'); wf.innerHTML = '';
    results.forEach(r => { 
        const bar = document.createElement('div'); bar.className = 'waterfall-bar'; 
        bar.style.height = ((r.auc || 0) * 100) + '%'; 
        bar.style.background = r.auc > 0.5 ? '#34c759' : r.auc < 0.3 ? '#ff3b30' : '#ff9500'; 
        bar.title = `${r.name}: ${(r.auc || 0).toFixed(3)}`; wf.appendChild(bar); 
    });
    const sens = results.filter(r => (r.auc || 0) > 0.5).length, resist = results.filter(r => (r.auc || 0) < 0.3).length, aucs = results.map(r => r.auc || 0).sort((a, b) => a - b), med = aucs[Math.floor(aucs.length / 2)];
    document.getElementById('panelSensitive').textContent = sens; document.getElementById('panelResistant').textContent = resist;
    document.getElementById('panelMedian').textContent = med.toFixed(3); document.getElementById('panelRR').textContent = ((sens / results.length) * 100).toFixed(0) + '%';
    const tbody = document.getElementById('panelBody');
    tbody.innerHTML = results.slice(0, 10).map((r, i) => { 
        const cell = panel.find(c => c.id === r.cell_line_id) || {}; 
        const cls = r.auc > 0.5 ? 'success' : r.auc < 0.3 ? 'danger' : 'warning'; 
        return `<tr><td>${i + 1}</td><td><strong>${cell.name || r.name}</strong></td><td>${cell.tissue || r.tissue}</td><td style="font-size:12px;color:#86868b">${(cell.mutations || []).join(', ') || r.mutations}</td><td><strong>${(r.auc || 0).toFixed(3)}</strong></td><td><span class="tag tag-${cls}">${r.auc > 0.5 ? 'Sensitive' : r.auc < 0.3 ? 'Resistant' : 'Moderate'}</span></td></tr>`; 
    }).join('');
}

/* Batch screening with real API calls */
let streamQ = [], streamProc = false, batchAbort = null;
async function startScreen() {
    if (screenRunning) return;
    screenRunning = true; batchResults = []; streamQ = [];
    batchAbort = new AbortController();
    document.getElementById('startBtn').disabled = true; document.getElementById('stopBtn').disabled = false; document.getElementById('exportBtn').disabled = true; document.getElementById('liveTag').style.display = 'inline-flex';
    document.querySelectorAll('.stat-card').forEach(c => c.classList.add('active'));
    const target = parseInt(document.getElementById('targetSamples').value), maxCaf = document.getElementById('batchCafSlider').value / 100;
    const batchSize = parseInt(document.getElementById('batchSize')?.value) || 64;
    let processed = 0, startTime = Date.now(), hits = 0, peakThroughput = 0;
    const feed = document.getElementById('streamFeed'); feed.innerHTML = '';
    const drugNames = Object.keys(DRUGS);
    
    // Build all cell+drug combinations to screen
    const combinations = [];
    for (let i = 0; i < target; i++) {
        const cell = CELL_LINES[i % CELL_LINES.length];
        const drugName = drugNames[Math.floor(i / CELL_LINES.length) % drugNames.length];
        combinations.push({ cell, drugName, smiles: DRUGS[drugName], caf: Math.random() * maxCaf });
    }
    
    // Process in batches
    for (let i = 0; i < combinations.length && screenRunning; i += batchSize) {
        const batch = combinations.slice(i, Math.min(i + batchSize, combinations.length));
        const predictions = batch.map(c => ({ depmap_id: c.cell.id, smiles: c.smiles }));
        
        try {
            const batchStart = Date.now();
            let results;
            if (engineOnline) {
                const r = await fetch(`${API_BASE}/predict/batch`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ predictions, preset: 'realtime' }),
                    signal: batchAbort.signal
                });
                const data = await r.json();
                results = data.predictions || [];
            } else {
                // Fallback to simulated if engine offline
                await new Promise(r => setTimeout(r, 500));
                results = batch.map(c => ({ predicted_auc: Math.random() * 0.8 + 0.1, valid: true }));
            }
            
            // Process results
            results.forEach((res, idx) => {
                if (!screenRunning) return;
                const combo = batch[idx];
                const auc = res.predicted_auc ?? 0.5;
                batchResults.push({ cell: combo.cell, drug: combo.drugName, auc, caf: combo.caf });
                processed++;
                if (auc > 0.7) hits++;
                
                // Update live stream
                const line = document.createElement('div'); 
                line.className = `stream-line${auc > 0.7 ? ' hit' : ''}`;
                line.innerHTML = `<span class="cell">${combo.cell.name}</span><span class="drug">${combo.drugName}</span><span class="auc ${auc > 0.6 ? 'high' : auc < 0.3 ? 'low' : 'mod'}">${auc.toFixed(3)}</span><span class="time">${((Date.now() - startTime) / 1000).toFixed(1)}s</span>`;
                feed.insertBefore(line, feed.firstChild); 
                if (feed.children.length > 50) feed.removeChild(feed.lastChild);
            });
            
            // Update stats
            const el = (Date.now() - startTime) / 1000, tp = processed / el;
            if (tp > peakThroughput) peakThroughput = tp;
            document.getElementById('totalSamples').textContent = processed.toLocaleString();
            document.getElementById('samplesRate').textContent = `${((processed / target) * 100).toFixed(1)}%`;
            document.getElementById('throughput').textContent = tp.toFixed(1);
            document.getElementById('throughputPeak').textContent = `Peak: ${peakThroughput.toFixed(1)}/s`;
            document.getElementById('elapsed').textContent = el.toFixed(1);
            document.getElementById('eta').textContent = `ETA: ${((target - processed) / tp).toFixed(1)}s`;
            document.getElementById('hitsCount').textContent = hits;
            document.getElementById('hitRate').textContent = `${((hits / processed) * 100).toFixed(1)}% hit rate`;
            const high = batchResults.filter(r => r.auc > 0.6).length, mod = batchResults.filter(r => r.auc >= 0.3 && r.auc <= 0.6).length, low = batchResults.filter(r => r.auc < 0.3).length, tot = high + mod + low;
            document.getElementById('highCount').textContent = high; document.getElementById('modCount').textContent = mod; document.getElementById('lowCount').textContent = low;
            document.getElementById('highBar').style.width = (high / tot * 100) + '%'; document.getElementById('modBar').style.width = (mod / tot * 100) + '%'; document.getElementById('lowBar').style.width = (low / tot * 100) + '%';
            updateHist();
        } catch (e) {
            if (e.name === 'AbortError') break; // User stopped
            console.error('Batch error:', e);
        }
    }
    stopScreen();
}

function stopScreen() { 
    screenRunning = false;
    if (batchAbort) batchAbort.abort(); // Cancel in-flight API requests
    document.getElementById('startBtn').disabled = false; 
    document.getElementById('stopBtn').disabled = true; 
    document.getElementById('exportBtn').disabled = false; 
    document.getElementById('liveTag').style.display = 'none'; 
    document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active')); 
}

function updateHist() { 
    const c = document.getElementById('histogram'); c.innerHTML = ''; 
    const bins = new Array(20).fill(0); 
    batchResults.forEach(r => bins[Math.min(19, Math.floor(r.auc * 20))]++); 
    const mx = Math.max(...bins); 
    bins.forEach(cnt => { 
        const b = document.createElement('div'); b.className = 'hist-bar'; 
        b.style.height = (cnt / mx * 100) + '%'; c.appendChild(b); 
    }); 
}

function exportCSV() { 
    if (!batchResults.length) return; 
    let csv = 'Cell,Drug,AUC,CAF,Status\n'; 
    batchResults.forEach(r => csv += `${r.cell.name},${r.drug},${r.auc.toFixed(4)},${r.caf.toFixed(2)},${r.auc > 0.6 ? 'High' : r.auc < 0.3 ? 'Low' : 'Mod'}\n`); 
    const blob = new Blob([csv], {type: 'text/csv'}), a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob); a.download = `lura_batch_${Date.now()}.csv`; a.click(); 
}

function saveBatchConfig() {
    const config = {
        throughput: {
            targetSamples: document.getElementById('targetSamples')?.value,
            batchSize: document.getElementById('batchSize')?.value,
            workers: document.getElementById('batchWorkers')?.value
        },
        cellLines: {
            panel: document.getElementById('batchPanel')?.value,
            sampling: document.getElementById('batchSampling')?.value
        },
        drugs: {
            library: document.getElementById('batchDrugs')?.value,
            doseMode: document.getElementById('batchDoseMode')?.value
        },
        tme: {
            cafRange: document.getElementById('batchCafSlider')?.value,
            m2Range: document.getElementById('batchM2Slider')?.value,
            hypoxia: document.getElementById('batchHypoxia')?.value,
            sampling: document.getElementById('batchTMESampling')?.value
        },
        engine: {
            resolution: document.getElementById('batchResolution')?.value,
            steps: document.getElementById('batchSteps')?.value,
            duration: document.getElementById('batchDuration')?.value
        },
        output: {
            hitThreshold: document.getElementById('batchHitThreshold')?.value,
            confidence: document.getElementById('batchConfidence')?.value,
            format: document.getElementById('batchFormat')?.value
        },
        timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lura_batch_config_${Date.now()}.json`;
    a.click();
}
