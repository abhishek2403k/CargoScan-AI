/**
 * RENDERER.JS - UI rendering and display logic
 * Responsible for rendering extracted fields, results, and visualizations
 */

const reviewPanel = document.getElementById('review-panel');
const reviewGrid = document.getElementById('review-grid');
const resultsSection = document.getElementById('results-panel');

const CLEARANCE_LOG_KEY = 'cargoScanOfficerClearanceLogs';
let activeClearanceContext = null;
let isClearanceHandlerBound = false;

function getRiskMeta(score) {
    if (score >= 6) return { key: 'critical', label: 'CRITICAL RISK' };
    if (score >= 4) return { key: 'high', label: 'HIGH RISK' };
    if (score >= 2) return { key: 'medium', label: 'MEDIUM RISK' };
    return { key: 'low', label: 'LOW RISK' };
}

function readClearanceLogs() {
    try {
        const raw = localStorage.getItem(CLEARANCE_LOG_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function writeClearanceLogs(logs) {
    localStorage.setItem(CLEARANCE_LOG_KEY, JSON.stringify(logs));
}

function toDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read image file.'));
        reader.readAsDataURL(file);
    });
}

function setClearanceMessage(message, type = '') {
    const msgEl = document.getElementById('officer-clearance-msg');
    if (!msgEl) return;
    msgEl.textContent = message;
    msgEl.className = `officer-msg ${type}`.trim();
}

function renderOfficerClearanceLogs() {
    const tbody = document.getElementById('clearance-log-tbody');
    if (!tbody) return;

    const logs = readClearanceLogs().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (!logs.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="color: var(--text-muted);">No officer actions yet.</td></tr>';
        return;
    }

    tbody.innerHTML = logs.slice(0, 10).map((log) => {
        const time = new Date(log.timestamp).toLocaleString();
        const officer = log.officerName ? `${log.officerName} (${log.officerId})` : `System (${log.status})`;
        const shipment = `${log.shipmentRef}<br><span style="color: var(--text-muted); font-size: 0.78rem;">${log.riskLabel} · Score ${log.riskScore}</span>`;
        
        let statusBadge = '';
        if (log.status === 'CLEARED') {
            statusBadge = '<span style="background: rgba(16,185,129,0.2); color: var(--success); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">✓ CLEARED</span>';
        } else if (log.status === 'HOLD_FURTHER') {
            statusBadge = '<span style="background: rgba(245,158,11,0.2); color: var(--warning); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">⏸ HELD</span>';
        } else if (log.status === 'ESCALATED') {
            statusBadge = '<span style="background: rgba(239,68,68,0.2); color: var(--danger); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">⬆ ESCALATED</span>';
        }
        
        const imageCell = log.imageDataUrl
            ? `<a href="${log.imageDataUrl}" target="_blank" rel="noopener noreferrer"><img class="clearance-thumb" src="${log.imageDataUrl}" alt="Shipment"></a>`
            : '<span style="color: var(--text-muted);">No image</span>';

        return `
            <tr>
                <td>${time}</td>
                <td>${officer}</td>
                <td>${shipment}</td>
                <td>${statusBadge}<br><span style="font-size: 0.82rem; color: var(--text-main); margin-top: 4px; display: inline-block;">${log.reason}</span></td>
                <td>${imageCell}</td>
            </tr>
        `;
    }).join('');
}

async function onSaveOfficerClearance() {
    const officerNameEl = document.getElementById('officer-name');
    const officerIdEl = document.getElementById('officer-id');
    const reasonEl = document.getElementById('officer-clearance-reason');
    const imageEl = document.getElementById('officer-shipment-image');
    const confirmEl = document.getElementById('officer-clearance-confirm');

    if (!activeClearanceContext) {
        setClearanceMessage('No held shipment context available. Re-run analysis.', 'error');
        return;
    }

    const officerName = officerNameEl?.value.trim();
    const officerId = officerIdEl?.value.trim();
    const reason = reasonEl?.value.trim();
    const file = imageEl?.files?.[0];

    if (!officerName || !officerId || !reason) {
        setClearanceMessage('Officer name, officer ID, and release reason are required.', 'error');
        return;
    }
    if (!file) {
        setClearanceMessage('Shipment image is required before clearance can be logged.', 'error');
        return;
    }
    if (!confirmEl?.checked) {
        setClearanceMessage('Please confirm inspection completion before saving.', 'error');
        return;
    }
    if (file.size > 3 * 1024 * 1024) {
        setClearanceMessage('Image must be smaller than 3 MB.', 'error');
        return;
    }

    try {
        const imageDataUrl = await toDataUrl(file);
        const log = {
            id: `clr_${Date.now()}`,
            timestamp: new Date().toISOString(),
            status: 'CLEARED',
            officerName,
            officerId,
            reason,
            confirmation: true,
            imageDataUrl,
            imageName: file.name,
            shipmentRef: activeClearanceContext.shipmentRef,
            riskLabel: activeClearanceContext.riskLabel,
            riskScore: activeClearanceContext.riskScore,
            hsCode: activeClearanceContext.hsCode,
            material: activeClearanceContext.material,
            origin: activeClearanceContext.origin,
            quantity: activeClearanceContext.quantity,
            totalValue: activeClearanceContext.totalValue,
            invoiceNo: activeClearanceContext.invoiceNo
        };

        const logs = readClearanceLogs();
        logs.unshift(log);
        writeClearanceLogs(logs.slice(0, 200));

        renderOfficerClearanceLogs();
        setClearanceMessage('Officer clearance log saved successfully.', 'success');

        if (officerNameEl) officerNameEl.value = '';
        if (officerIdEl) officerIdEl.value = '';
        if (reasonEl) reasonEl.value = '';
        if (imageEl) imageEl.value = '';
        if (confirmEl) confirmEl.checked = false;

        if (typeof showToast === 'function') {
            showToast('✓ Officer clearance logged', 'success');
        }
    } catch (e) {
        setClearanceMessage('Unable to save clearance log. Please try again.', 'error');
    }
}

function bindOfficerClearanceHandler() {
    if (isClearanceHandlerBound) return;
    const btn = document.getElementById('btn-save-clearance');
    const btnHold = document.getElementById('btn-hold-further');
    const btnEsc = document.getElementById('btn-escalate');
    if (!btn) return;
    btn.addEventListener('click', onSaveOfficerClearance);
    if (btnHold) btnHold.addEventListener('click', onHoldFurtherClick);
    if (btnEsc) btnEsc.addEventListener('click', onEscalateClick);
    isClearanceHandlerBound = true;
}

function onHoldFurtherClick() {
    if (!activeClearanceContext) {
        setClearanceMessage('No shipment context. Re-run analysis.', 'error');
        return;
    }

    const reason = prompt('Please provide reason for extended hold (required):', '');
    if (!reason || !reason.trim()) {
        setClearanceMessage('Extended hold reason required.', 'error');
        return;
    }

    const holdLog = {
        id: `hold_${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'HOLD_FURTHER',
        reason: reason.trim(),
        shipmentRef: activeClearanceContext.shipmentRef,
        riskLabel: activeClearanceContext.riskLabel,
        riskScore: activeClearanceContext.riskScore,
        hsCode: activeClearanceContext.hsCode,
        material: activeClearanceContext.material
    };

    const logs = readClearanceLogs();
    logs.unshift(holdLog);
    writeClearanceLogs(logs.slice(0, 200));
    renderOfficerClearanceLogs();
    setClearanceMessage('Shipment placed on extended hold.', 'success');
    
    if (typeof showToast === 'function') {
        showToast('⏸ Shipment on extended hold', 'warning');
    }
}

function onEscalateClick() {
    if (!activeClearanceContext) {
        setClearanceMessage('No shipment context. Re-run analysis.', 'error');
        return;
    }

    const reason = prompt('Escalation reason for senior officer review (required):', '');
    if (!reason || !reason.trim()) {
        setClearanceMessage('Escalation reason required.', 'error');
        return;
    }

    const escalationLog = {
        id: `esc_${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'ESCALATED',
        reason: reason.trim(),
        shipmentRef: activeClearanceContext.shipmentRef,
        riskLabel: activeClearanceContext.riskLabel,
        riskScore: activeClearanceContext.riskScore,
        hsCode: activeClearanceContext.hsCode,
        material: activeClearanceContext.material
    };

    const logs = readClearanceLogs();
    logs.unshift(escalationLog);
    writeClearanceLogs(logs.slice(0, 200));
    renderOfficerClearanceLogs();
    setClearanceMessage('Shipment escalated to senior officer for review.', 'success');
    
    if (typeof showToast === 'function') {
        showToast('⬆ Escalated to senior officer', 'warning');
    }
}

function updateOfficerClearanceSection(res) {
    const section = document.getElementById('officer-clearance-section');
    const holdSummary = document.getElementById('officer-hold-summary');
    if (!section || !holdSummary) return;

    const risk = getRiskMeta(res.score);
    if (risk.key === 'low') {
        section.style.display = 'none';
        activeClearanceContext = null;
        return;
    }

    const latestInput = window.latestDeclarationInput || {};
    const invoiceNo = String(latestInput.invoiceNo || '').trim();
    const shipmentRef = invoiceNo ? `INV-${invoiceNo}` : `SHIP-${Date.now()}`;

    activeClearanceContext = {
        shipmentRef,
        invoiceNo: invoiceNo || 'N/A',
        riskLabel: risk.label,
        riskScore: res.score,
        hsCode: res.code,
        material: res.material,
        origin: res.origin,
        quantity: res.quantity,
        totalValue: res.totalValue
    };

    holdSummary.innerHTML = `
        Shipment <strong>${shipmentRef}</strong> is currently in hold flow due to <strong>${risk.label}</strong>.
        If officer verification confirms the shipment is valid, fill the form below to log who released it, why it was released, and upload confirmation image evidence.
    `;

    section.style.display = 'block';
    setClearanceMessage('');
    bindOfficerClearanceHandler();
    renderOfficerClearanceLogs();
}

/**
 * Render the review panel with extracted field cards
 * @param {Object} fields - Extracted fields with confidence levels
 */
function renderReviewFields(fields) {
    reviewGrid.innerHTML = '';
    let highCount = 0;
    
    reviewFieldsConfig.forEach(cfg => {
        const fieldData = fields[cfg.key];
        const val = fieldData?.value !== undefined ? fieldData.value : '';
        const conf = fieldData?.confidence || 'low';
        if (conf === 'high') highCount++;
        
        const card = document.createElement('div');
        card.className = 'review-card';
        card.innerHTML = `
            <span class="conf-badge conf-${conf}">${conf}</span>
            <label class="review-lbl">${cfg.label}</label>
            <input type="${cfg.type || 'text'}" class="review-input" id="edit-${cfg.key}" value="${val}" step="any">
            <div class="review-raw" title="${fieldData?.raw || ''}">RAW: ${fieldData?.raw || 'N/A'}</div>
        `;
        reviewGrid.appendChild(card);
    });
    
    // Show currency warning if not USD
    if (fields.currency !== 'USD') {
        const w = document.createElement('div');
        w.style.gridColumn = '1 / -1';
        w.style.color = 'var(--warn)';
        w.style.fontFamily = "'JetBrains Mono', monospace";
        w.style.fontSize = '0.85rem';
        w.style.marginBottom = '10px';
        w.innerText = `⚠️ Declared currency is ${fields.currency}. Convert to USD manually before running checks.`;
        reviewGrid.prepend(w);
    }
    
    // Show weight conversion notice
    if (fields.weightConverted) {
        const cw = document.createElement('div');
        cw.style.gridColumn = '1 / -1';
        cw.style.color = 'var(--safe)';
        cw.style.fontFamily = "'JetBrains Mono', monospace";
        cw.style.fontSize = '0.85rem';
        cw.style.marginBottom = '10px';
        cw.innerText = `ℹ️ Weight was automatically converted from LBS to KGS.`;
        reviewGrid.prepend(cw);
    }

    document.getElementById('review-summary').innerText = `${highCount} of 12 fields extracted with high confidence. ${12 - highCount} fields need manual review.`;
    reviewPanel.style.display = 'block';
    reviewPanel.scrollIntoView({behavior: "smooth"});
}

/**
 * Render the final results and all findings
 * @param {Object} res - Complete analysis results object
 */
function renderResults(res) {
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({behavior: "smooth"});
    
    // === 1: HS CODE RESOLUTION ===
    document.getElementById('res-method').textContent = res.method;
    document.getElementById('res-hs-code').textContent = res.code;
    document.getElementById('res-hs-desc').textContent = res.desc;
    document.getElementById('res-duty').textContent = `Duty: ${res.dutyRate}%`;

    // === 2: RISK ASSESSMENT BANNER ===
    const rb = document.getElementById('risk-banner');
    rb.className = 'risk-banner anim-target';
    let rLbl = "LOW RISK", cls = "low", rTxt = "PROCEED – ROUTINE PROCESSING";
    
    if (res.score >= 6) { 
        rLbl = "CRITICAL RISK"; 
        cls = "critical"; 
        rTxt = "IMMEDIATE ESCALATION – Do not release. Senior officer notification required."; 
    } else if (res.score >= 4) { 
        rLbl = "HIGH RISK"; 
        cls = "high"; 
        rTxt = "HOLD SHIPMENT – Physical inspection required."; 
    } else if (res.score >= 2) { 
        rLbl = "MEDIUM RISK"; 
        cls = "medium"; 
        rTxt = "ENHANCED SCRUTINY – Request original documents and proof of payment."; 
    }
    
    rb.classList.add(cls);
    document.getElementById('risk-label').textContent = rLbl;
    document.getElementById('risk-score').textContent = `SCORE: ${res.score}`;
    document.getElementById('risk-desc').textContent = rTxt;

    // === 3: METRIC CARDS ===
    document.getElementById('metric-1-val').textContent = res.material; 
    document.getElementById('metric-1-sub').textContent = `HS: ${res.code}`;
    document.getElementById('metric-2-val').textContent = res.weight.toLocaleString(undefined,{maximumFractionDigits:1});
    document.getElementById('metric-3-val').textContent = Math.round(res.expected).toLocaleString(); 
    document.getElementById('metric-3-sub').textContent = `${res.quantity} units @ ${res.unitWt} avg`;
    document.getElementById('metric-4-val').textContent = `$${Math.round(res.totalValue).toLocaleString()}`;
    document.getElementById('metric-5-val').textContent = `$${res.vkr.toFixed(2)}`; 
    document.getElementById('metric-5-sub').textContent = `Mkt: $${res.minVal} - $${res.maxVal}`;
    document.getElementById('metric-6-val').textContent = res.origin;
    
    // === 4 & 5: RANGE VISUALIZATIONS ===
    const wtMaxVis = Math.max(res.containerLimit, res.weight*1.2, res.expectedMax*1.2);
    const setRange = (idTrack, lblMinId, lblMaxId, zoneId, mkId, mkLblId, mkDisplayId, vMin, vMax, actV, maxVis, safeCond, dngCond) => {
        if (maxVis === 0) { 
            document.getElementById(idTrack).style.display = 'none'; 
            return; 
        }
        document.getElementById(idTrack).style.display = 'block';
        document.getElementById(lblMinId).textContent = (idTrack==="value-track"?"$":"")+vMin+(idTrack==="value-track"?"":" kg");
        document.getElementById(lblMaxId).textContent = (idTrack==="value-track"?"$":"")+vMax+(idTrack==="value-track"?"":" kg");
        const zMin=(vMin/maxVis)*100, zMax=(vMax/maxVis)*100;
        document.getElementById(zoneId).style.left = zMin + '%'; 
        document.getElementById(zoneId).style.width = Math.min(zMax-zMin, 100-zMin) + '%';
        
        const mkr = document.getElementById(mkId); 
        mkr.className = 'range-marker';
        setTimeout(() => {
            mkr.style.left = Math.min((actV/maxVis)*100, 100) + '%';
            mkr.className = `range-marker ${safeCond ? 'safe' : (dngCond ? 'danger' : 'warn')}`;
        }, 100);
        document.getElementById(mkLblId).textContent = (idTrack==="value-track"?"$":"")+actV+(idTrack==="value-track"?"":" kg");
        document.getElementById(mkDisplayId).textContent = (idTrack==="value-track"?"$":"")+actV+(idTrack==="value-track"?"":" kg");
    };

    setRange('weight-track','wt-lbl-min','wt-lbl-max','wt-zone','wt-marker','wt-marker-lbl','wt-marker-display', 
        Math.round(res.expectedMin), Math.round(res.expectedMax), Math.round(res.weight), wtMaxVis, 
        (res.weight >= res.expectedMin && res.weight <= res.expectedMax), (res.weight > res.containerLimit));

    const valMaxVis = Math.max(res.maxVal*2, res.vkr*1.2);
    setRange('value-track','val-lbl-min','val-lbl-max','val-zone','val-marker','val-marker-lbl','val-marker-display', 
        res.minVal, res.maxVal, Math.round(res.vkr*100)/100, valMaxVis, 
        (res.vkr >= res.minVal && res.vkr <= res.maxVal), (res.totalValue===0));

    // === 6: FINDINGS BY CATEGORY ===
    const populateL = (id, arr) => {
        const el = document.getElementById(id); 
        el.innerHTML = '';
        if(arr.length===0) el.innerHTML = '<div style="color:var(--text-muted); font-size:0.9rem;">No findings.</div>';
        arr.forEach(f => el.innerHTML += `<div class="finding-item"><span class="finding-icon">${f.icon}</span><span>${f.text}</span></div>`);
    };
    populateL('find-phys', res.physFindings); 
    populateL('find-fin', res.finFindings);
    populateL('find-doc', res.docFindings); 
    populateL('find-ano', res.anoFindings);

    // === 7: SCORING TABLE ===
    const bdT = document.getElementById('score-tbody'); 
    bdT.innerHTML = "";
    res.allFindings.filter(f=>f.pts>0).forEach(f => {
        bdT.innerHTML += `<tr><td>${f.rule}</td><td>${f.text}</td><td class="pts positive">+${f.pts}</td></tr>`;
    });
    if (res.score===0) bdT.innerHTML = '<tr><td colspan="3" style="text-align:center" class="pts zero">Perfect declaration. No risk indicators.</td></tr>';
    document.getElementById('score-total').textContent = `TOTAL: ${res.score}`;
    document.getElementById('score-band').textContent = rLbl;

    // === 8: RECOMMENDATION BLOCK ===
    const rc = document.getElementById('reco-block'); 
    rc.className = `reco-block anim-target ${cls}`;
    document.getElementById('reco-text').innerHTML = `<strong>${rTxt}</strong>`;

    updateOfficerClearanceSection(res);

    // Animate results
    document.querySelectorAll('.anim-target').forEach((el, index) => {
        el.style.animation = 'none'; 
        el.offsetHeight;
        el.style.animation = `fadeUp 0.6s ease forwards ${index * 50}ms`;
    });
}
