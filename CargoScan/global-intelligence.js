/**
 * GLOBAL INTELLIGENCE NETWORK
 * Real-time federated intelligence and fraud detection sharing
 * Uses Anthropic artifact storage API for cross-browser data synchronization
 */

// ═══════════════════════════════════════════════════
// PORT ID GENERATION
// ═══════════════════════════════════════════════════

function getOrCreatePortId() {
  let portId = sessionStorage.getItem("cargoPortId");
  if (!portId) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const rand = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    portId = `PRT-${rand}`;
    sessionStorage.setItem("cargoPortId", portId);
  }
  return portId;
}

// ═══════════════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════════

function showToast(message, type = "success") {
  const colors = {
    success: "#00FF9D",
    warning: "#FFB800",
    error: "#FF4757",
    info: "#00D4FF"
  };

  const container =
    document.getElementById("toast-container") ||
    (() => {
      const div = document.createElement("div");
      div.id = "toast-container";
      div.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(div);
      return div;
    })();

  const toast = document.createElement("div");
  toast.style.cssText = `
    background: #0D1117;
    border: 1px solid #1E2D3D;
    color: ${colors[type]};
    padding: 12px 16px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: toastSlideIn 0.2s ease-out;
    border-left: 3px solid ${colors[type]};
  `;
  toast.textContent = message;

  container.appendChild(toast);

  const duration = message.includes("New high-risk alert") ? 5000 : 3000;
  setTimeout(() => {
    toast.style.animation = "toastSlideOut 0.2s ease-out";
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// Add keyframe animations if not present
if (!document.getElementById("toast-animations")) {
  const style = document.createElement("style");
  style.id = "toast-animations";
  style.textContent = `
    @keyframes toastSlideIn {
      from { transform: translateX(300px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes toastSlideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(300px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════
// STORAGE API HELPERS
// ═══════════════════════════════════════════════════

const STORAGE_BACKEND_SHARED = "shared";
const STORAGE_BACKEND_LOCAL = "local";
const STORAGE_BACKEND_MEMORY = "memory";

let intelligenceStorageBackend = null;
let fallbackNoticeShown = false;
const inMemoryStore = new Map();

function detectIntelligenceStorageBackend() {
  if (intelligenceStorageBackend) return intelligenceStorageBackend;

  if (typeof window !== "undefined" && window.storage) {
    intelligenceStorageBackend = STORAGE_BACKEND_SHARED;
    return intelligenceStorageBackend;
  }

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      intelligenceStorageBackend = STORAGE_BACKEND_LOCAL;
      return intelligenceStorageBackend;
    }
  } catch (e) {
    // Ignore and continue to memory fallback.
  }

  intelligenceStorageBackend = STORAGE_BACKEND_MEMORY;
  return intelligenceStorageBackend;
}

function showStorageFallbackNotice() {
  if (fallbackNoticeShown) return;
  fallbackNoticeShown = true;
  console.info("GLOBAL INTELLIGENCE: Shared storage unavailable, using local fallback.");
}

function normalizeStorageKey(key) {
  return `gi:${key}`;
}

function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function switchToFallbackBackend() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      intelligenceStorageBackend = STORAGE_BACKEND_LOCAL;
      showStorageFallbackNotice();
      return;
    }
  } catch (e) {
    // Ignore and continue to memory fallback.
  }

  intelligenceStorageBackend = STORAGE_BACKEND_MEMORY;
  showStorageFallbackNotice();
}

async function storageGet(key) {
  let backend = detectIntelligenceStorageBackend();

  if (backend === STORAGE_BACKEND_SHARED) {
    try {
      const result = await window.storage.get(key, true);
      return result ? safeParseJson(result.value) : null;
    } catch (e) {
      switchToFallbackBackend();
      backend = intelligenceStorageBackend;
    }
  }

  if (backend === STORAGE_BACKEND_LOCAL) {
    try {
      const raw = window.localStorage.getItem(normalizeStorageKey(key));
      return raw ? safeParseJson(raw) : null;
    } catch (e) {
      intelligenceStorageBackend = STORAGE_BACKEND_MEMORY;
      backend = STORAGE_BACKEND_MEMORY;
    }
  }

  if (backend === STORAGE_BACKEND_MEMORY) {
    const raw = inMemoryStore.get(normalizeStorageKey(key));
    return raw ? safeParseJson(raw) : null;
  }

  return null;
}

async function storageSet(key, data) {
  let backend = detectIntelligenceStorageBackend();
  const payload = JSON.stringify(data);

  if (backend === STORAGE_BACKEND_SHARED) {
    try {
      await window.storage.set(key, payload, true);
      return true;
    } catch (e) {
      switchToFallbackBackend();
      backend = intelligenceStorageBackend;
    }
  }

  if (backend === STORAGE_BACKEND_LOCAL) {
    try {
      window.localStorage.setItem(normalizeStorageKey(key), payload);
      return true;
    } catch (e) {
      intelligenceStorageBackend = STORAGE_BACKEND_MEMORY;
      backend = STORAGE_BACKEND_MEMORY;
    }
  }

  if (backend === STORAGE_BACKEND_MEMORY) {
    inMemoryStore.set(normalizeStorageKey(key), payload);
    return true;
  }

  return false;
}

async function storageList(prefix) {
  let backend = detectIntelligenceStorageBackend();

  if (backend === STORAGE_BACKEND_SHARED) {
    try {
      const keys = await window.storage.list(prefix, true);
      return keys || [];
    } catch (e) {
      switchToFallbackBackend();
      backend = intelligenceStorageBackend;
    }
  }

  if (backend === STORAGE_BACKEND_LOCAL) {
    const keys = [];
    const keyPrefix = normalizeStorageKey(prefix);
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(keyPrefix)) {
        keys.push(k.replace(/^gi:/, ""));
      }
    }
    return keys;
  }

  if (backend === STORAGE_BACKEND_MEMORY) {
    const keys = [];
    const keyPrefix = normalizeStorageKey(prefix);
    inMemoryStore.forEach((_v, k) => {
      if (k.startsWith(keyPrefix)) {
        keys.push(k.replace(/^gi:/, ""));
      }
    });
    return keys;
  }

  return [];
}

async function storageDelete(key) {
  let backend = detectIntelligenceStorageBackend();

  if (backend === STORAGE_BACKEND_SHARED) {
    try {
      await window.storage.delete(key, true);
      return true;
    } catch (e) {
      switchToFallbackBackend();
      backend = intelligenceStorageBackend;
    }
  }

  if (backend === STORAGE_BACKEND_LOCAL) {
    window.localStorage.removeItem(normalizeStorageKey(key));
    return true;
  }

  if (backend === STORAGE_BACKEND_MEMORY) {
    inMemoryStore.delete(normalizeStorageKey(key));
    return true;
  }

  return false;
}

// ═══════════════════════════════════════════════════
// SUBMIT TO GLOBAL NETWORK
// ═══════════════════════════════════════════════════

async function submitToGlobalNetwork(checkResult) {
  try {
    // Build complete check record
    const record = {
      id: `check_${Date.now()}`,
      portId: getOrCreatePortId(),
      timestamp: new Date().toISOString(),
      hsCode: checkResult.code || "Unknown",
      material: checkResult.material || "Unknown",
      hsDesc: checkResult.desc || "Unknown",
      riskScore: checkResult.score || 0,
      riskLevel: determineRiskLevel(checkResult.score),
      originCountry: checkResult.origin || "Unknown",
      declaredVKR: checkResult.vkr || 0,
      wtDeviation: checkResult.weight
        ? Math.abs((checkResult.weight - checkResult.expected) / checkResult.expected) * 100
        : 0,
      triggeredRules: extractTriggeredRules(checkResult),
      confirmedFraud: false,
      quantity: checkResult.quantity || 0,
      declaredWeight: checkResult.weight || 0,
      declaredValue: checkResult.totalValue || 0,
      source: "check"
    };

    // Store the check record
    await storageSet(`checks:${record.id}`, record);

    // Update leaderboard aggregates
    await updateLeaderboardAggregates(record);

    // Auto-generate alert if high/critical
    if (record.riskLevel === "high" || record.riskLevel === "critical") {
      await createGlobalAlert(record);
    }

    showToast("✓ Check shared with global network", "success");
  } catch (e) {
    console.error("Error submitting to global network:", e);
  }
}

function determineRiskLevel(score) {
  if (score >= 6) return "critical";
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function extractTriggeredRules(checkResult) {
  const rules = [];
  if (checkResult.physFindings)
    checkResult.physFindings.forEach((f) => rules.push(f.rule));
  if (checkResult.finFindings)
    checkResult.finFindings.forEach((f) => rules.push(f.rule));
  if (checkResult.docFindings)
    checkResult.docFindings.forEach((f) => rules.push(f.rule));
  if (checkResult.anoFindings)
    checkResult.anoFindings.forEach((f) => rules.push(f.rule));
  return [...new Set(rules)];
}

function normalizeCountry(country) {
  const raw = String(country || "").trim();
  if (!raw) {
    return { key: "unknown", display: "Unknown" };
  }

  const normalized = raw.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  const aliasMap = {
    cn: "china",
    china: "china",
    vn: "vietnam",
    vietnam: "vietnam",
    in: "india",
    india: "india",
    bd: "bangladesh",
    bangladesh: "bangladesh",
    de: "germany",
    germany: "germany"
  };

  const canonicalName = aliasMap[normalized] || normalized;
  const display = canonicalName
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    key: canonicalName.replace(/\s+/g, "_"),
    display
  };
}

function mergeRouteAggregate(data, incomingRouteData) {
  if (!incomingRouteData) return;

  const normalizedCountry = normalizeCountry(incomingRouteData.country);
  const key = normalizedCountry.key;

  if (!data[key]) {
    data[key] = {
      country: normalizedCountry.display,
      totalChecks: 0,
      highRisk: 0,
      avgScore: 0,
      totalScore: 0,
      topCommodities: {}
    };
  }

  const current = data[key];
  const checks = Number(incomingRouteData.totalChecks) || 0;
  const incomingTotalScore = Number.isFinite(incomingRouteData.totalScore)
    ? incomingRouteData.totalScore
    : (Number(incomingRouteData.avgScore) || 0) * checks;

  current.country = normalizedCountry.display;
  current.totalChecks += checks;
  current.highRisk += Number(incomingRouteData.highRisk) || 0;
  current.totalScore += incomingTotalScore;
  current.avgScore =
    current.totalChecks > 0 ? current.totalScore / current.totalChecks : 0;

  Object.entries(incomingRouteData.topCommodities || {}).forEach(
    ([hsCode, count]) => {
      current.topCommodities[hsCode] =
        (current.topCommodities[hsCode] || 0) + (Number(count) || 0);
    }
  );
}

async function updateLeaderboardAggregates(record) {
  // Update HS code aggregate
  const hsKey = `leaderboard:hs:${record.hsCode}`;
  let hsData = await storageGet(hsKey);

  if (!hsData) {
    hsData = {
      hsCode: record.hsCode,
      material: record.material,
      desc: record.hsDesc,
      totalChecks: 0,
      highRisk: 0,
      totalScore: 0,
      avgScore: 0,
      fraudTypes: {},
      lastSeen: null
    };
  }

  hsData.totalChecks++;
  hsData.totalScore += record.riskScore;
  hsData.avgScore = hsData.totalScore / hsData.totalChecks;
  hsData.lastSeen = record.timestamp;

  if (record.riskLevel === "high" || record.riskLevel === "critical") {
    hsData.highRisk++;
  }

  record.triggeredRules.forEach((rule) => {
    hsData.fraudTypes[rule] = (hsData.fraudTypes[rule] || 0) + 1;
  });

  await storageSet(hsKey, hsData);

  // Update route/origin aggregate
  const normalizedCountry = normalizeCountry(record.originCountry);
  const routeKey = `leaderboard:route:${normalizedCountry.key}`;
  let routeData = await storageGet(routeKey);

  if (!routeData) {
    routeData = {
      country: normalizedCountry.display,
      totalChecks: 0,
      highRisk: 0,
      avgScore: 0,
      totalScore: 0,
      topCommodities: {}
    };
  }

  routeData.totalChecks++;
  routeData.totalScore += record.riskScore;
  routeData.avgScore = routeData.totalScore / routeData.totalChecks;

  if (record.riskLevel === "high" || record.riskLevel === "critical") {
    routeData.highRisk++;
  }

  routeData.topCommodities[record.hsCode] =
    (routeData.topCommodities[record.hsCode] || 0) + 1;

  await storageSet(routeKey, routeData);

  // Update global stats
  const statsKey = "leaderboard:stats";
  let stats = await storageGet(statsKey);

  if (!stats) {
    stats = {
      totalChecks: 0,
      totalLow: 0,
      totalMedium: 0,
      totalHigh: 0,
      totalCritical: 0,
      totalDutyGap: 0,
      activePorts: 0
    };
  }

  stats.totalChecks++;
  const riskKey = `total${record.riskLevel.charAt(0).toUpperCase() + record.riskLevel.slice(1)}`;
  // Map risk level to correct key
  const riskMap = {
    'low': 'totalLow',
    'medium': 'totalMedium',
    'high': 'totalHigh',
    'critical': 'totalCritical'
  };
  const actualKey = riskMap[record.riskLevel] || 'totalLow';

  stats[actualKey] = (stats[actualKey] || 0) + 1;
  await storageSet(statsKey, stats);
}

async function createGlobalAlert(record) {
  const severity =
    record.riskScore >= 6
      ? "critical"
      : record.riskScore >= 4
        ? "high"
        : "elevated";

  const fraudType = determinePrimaryFraudType(record.triggeredRules);
  const pattern = buildPatternDescription(record);

  const alert = {
    id: `alert_${Date.now()}`,
    timestamp: new Date().toISOString(),
    severity: severity,
    hsCode: record.hsCode,
    hsDesc: record.hsDesc,
    material: record.material,
    originCountry: record.originCountry,
    fraudType: fraudType,
    pattern: pattern,
    issuedBy: record.portId,
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    checkId: record.id,
    riskScore: record.riskScore
  };

  await storageSet(`alerts:${alert.id}`, alert);
}

function determinePrimaryFraudType(triggeredRules) {
  if (triggeredRules.some((r) => r.includes("Assembly")))
    return "Tariff Misclassification";
  if (triggeredRules.some((r) => r.includes("Container")))
    return "Physical Impossibility";
  if (triggeredRules.some((r) => r.includes("Value/kg")))
    return "Under-valuation / Duty Evasion";
  if (triggeredRules.some((r) => r.includes("Weight")))
    return "Weight Misdeclaration";
  if (triggeredRules.some((r) => r.includes("Arithmetic")))
    return "Document Fabrication";
  return "Multiple Anomalies";
}

function buildPatternDescription(record) {
  return (
    `${record.material} shipment from ${record.originCountry} declared as ` +
    `HS ${record.hsCode} with risk score ${record.riskScore}.`
  );
}

// ═══════════════════════════════════════════════════
// INTELLIGENCE DASHBOARD RENDERER
// ═══════════════════════════════════════════════════

async function loadAllIntelligenceData() {
  const container = document.getElementById("intelligence-content");
  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 32px;">
      ${renderGlobalStatsBar()}
      <div id="stats-loading" style="opacity: 0.5; text-align: center; font-family: 'JetBrains Mono'; font-size: 12px; color: #4A6380;">
        Loading network data...
      </div>
    </div>
  `;

  // Load all data
  const stats = await storageGet("leaderboard:stats");
  const alerts = await loadAlerts();
  const checks = await loadChecks();
  const hsData = await loadHsData();
  const routeData = await loadRouteData();

  // Parse fraud types from checks
  const fraudTypeCounts = countFraudTypes(checks);

  // Build final HTML
  let html = `
    <div style="display: flex; flex-direction: column; gap: 32px;">
      ${renderGlobalStatsBar()}
      ${await renderActiveAlerts(alerts)}
      ${renderCommodityLeaderboard(hsData)}
      ${renderOriginCountryRanking(routeData)}
      ${renderLiveGlobalFeed(checks)}
      ${renderFraudPatternHeatmap(fraudTypeCounts, stats?.totalHigh || 0)}
    </div>
  `;

  container.innerHTML = html;
  
  // Update stats display
  if (stats) {
    document.getElementById('stat-total').textContent = stats.totalChecks || 0;
    document.getElementById('stat-low').textContent = stats.totalLow || 0;
    document.getElementById('stat-medium').textContent = stats.totalMedium || 0;
    document.getElementById('stat-high').textContent = stats.totalHigh || 0;
    document.getElementById('stat-critical').textContent = stats.totalCritical || 0;
  }
  
  // Update port count
  const uniquePorts = new Set(checks.map(c => c.portId)).size;
  const statusPorts = document.getElementById('status-ports');
  if (statusPorts) statusPorts.textContent = uniquePorts;
}

function renderGlobalStatsBar() {
  return `
    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px;">
      <div style="background: #0D1117; border: 1px solid #1E2D3D; border-radius: 8px; padding: 20px 16px; text-align: center;">
        <div style="font-family: 'JetBrains Mono'; font-size: 9px; color: #4A6380; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Total Checks</div>
        <div id="stat-total" style="font-family: 'Syne'; font-size: 28px; font-weight: bold; color: #E8F0F8;">0</div>
      </div>
      <div style="background: #0D1117; border: 1px solid #1E2D3D; border-radius: 8px; padding: 20px 16px; text-align: center;">
        <div style="font-family: 'JetBrains Mono'; font-size: 9px; color: #4A6380; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Low Risk</div>
        <div id="stat-low" style="font-family: 'Syne'; font-size: 28px; font-weight: bold; color: #00FF9D;">0</div>
      </div>
      <div style="background: #0D1117; border: 1px solid #1E2D3D; border-radius: 8px; padding: 20px 16px; text-align: center;">
        <div style="font-family: 'JetBrains Mono'; font-size: 9px; color: #4A6380; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Medium Risk</div>
        <div id="stat-medium" style="font-family: 'Syne'; font-size: 28px; font-weight: bold; color: #FFB800;">0</div>
      </div>
      <div style="background: #0D1117; border: 1px solid #1E2D3D; border-radius: 8px; padding: 20px 16px; text-align: center;">
        <div style="font-family: 'JetBrains Mono'; font-size: 9px; color: #4A6380; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">High Risk</div>
        <div id="stat-high" style="font-family: 'Syne'; font-size: 28px; font-weight: bold; color: #FF4757;">0</div>
      </div>
      <div style="background: #0D1117; border: 1px solid #1E2D3D; border-radius: 8px; padding: 20px 16px; text-align: center; border: 1px solid rgba(255,71,87,0.3);">
        <div style="font-family: 'JetBrains Mono'; font-size: 9px; color: #4A6380; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Critical</div>
        <div id="stat-critical" style="font-family: 'Syne'; font-size: 28px; font-weight: bold; color: #FF4757; animation: pulse 2s infinite;">0</div>
      </div>
    </div>
  `;
}

async function renderActiveAlerts(alerts) {
  const now = new Date();
  const activeAlerts = alerts.filter((a) => new Date(a.expiresAt) > now);

  if (activeAlerts.length === 0) {
    return `
      <div style="border: 1px solid #1E2D3D; border-radius: 8px; padding: 32px; text-align: center; background: #0D1117;">
        <div style="font-family: 'JetBrains Mono'; font-size: 12px; color: #00FF9D;">✓ NO ACTIVE ALERTS — Network clear</div>
      </div>
    `;
  }

  const alertsHtml = activeAlerts.slice(0, 10).map((alert) => {
    const severityColor =
      alert.severity === "critical"
        ? "rgba(255,71,87,0.5)"
        : alert.severity === "high"
          ? "rgba(255,149,0,0.4)"
          : "rgba(255,184,0,0.3)";
    const severityBg =
      alert.severity === "critical"
        ? "rgba(255,71,87,0.06)"
        : alert.severity === "high"
          ? "rgba(255,149,0,0.05)"
          : "rgba(255,184,0,0.04)";

    const timeAgo = timeAgoString(alert.timestamp);
    const expiresIn = formatTimeRemaining(alert.expiresAt);

    return `
      <div style="border: 1px solid ${severityColor}; background: ${severityBg}; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div style="font-family: 'JetBrains Mono'; font-size: 11px; font-weight: bold; color: #FF4757;">🚨 ${alert.severity.toUpperCase()} ALERT · HS ${alert.hsCode}</div>
          <div style="font-family: 'JetBrains Mono'; font-size: 10px; color: #8BA3BE;">${timeAgo}</div>
        </div>
        <div style="font-family: 'Bitter'; font-size: 12px; color: #E8F0F8; margin-bottom: 12px;">${alert.material} · ${alert.hsDesc}</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-family: 'JetBrains Mono'; font-size: 11px; color: #8BA3BE; margin-bottom: 12px;">
          <div>Fraud Type: <span style="color: #E8F0F8; font-weight: bold;">${alert.fraudType}</span></div>
          <div>Origin: <span style="color: #E8F0F8; font-weight: bold;">${alert.originCountry}</span></div>
        </div>
        <div style="font-family: 'Inter'; font-size: 11px; color: #8BA3BE; background: rgba(255,255,255,0.02); padding: 8px; border-radius: 4px; margin-bottom: 12px;">⚠ ${alert.pattern}</div>
        <div style="display: flex; justify-content: space-between; font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380;">
          <div>Issued by: <span style="color: #00D4FF;">${alert.issuedBy}</span></div>
          <div>Expires in: <span style="color: #FFB800;">${expiresIn}</span></div>
        </div>
      </div>
    `;
  });

  return `
    <div>
      <div style="font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #1E2D3D;">ACTIVE ALERTS PANEL</div>
      ${alertsHtml.join("")}
      <div style="font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; text-align: right; margin-top: 12px;">Showing ${activeAlerts.slice(0, 10).length} of ${activeAlerts.length} alerts</div>
    </div>
  `;
}

function renderCommodityLeaderboard(hsData) {
  const sorted = Object.values(hsData)
    .sort((a, b) => (b.highRisk || 0) - (a.highRisk || 0))
    .slice(0, 10);

  if (sorted.length === 0) {
    return `
      <div style="border: 1px solid #1E2D3D; border-radius: 8px; padding: 32px; text-align: center; background: #0D1117;">
        <div style="font-family: 'JetBrains Mono'; font-size: 12px; color: #4A6380;">No checks submitted yet — leaderboard populates as declarations are checked</div>
      </div>
    `;
  }

  const rows = sorted
    .map((hs, i) => {
      const riskPercentage =
        hs.totalChecks > 0 ? ((hs.highRisk || 0) / hs.totalChecks) * 100 : 0;
      const primaryFraud = Object.entries(hs.fraudTypes || {}).sort(
        ([, a], [, b]) => b - a
      )[0];

      return `
        <tr>
          <td style="text-align: center; font-weight: bold; color: #00D4FF;">${i + 1}</td>
          <td style="font-family: 'JetBrains Mono'; font-weight: bold;">${hs.hsCode}</td>
          <td>${hs.desc}</td>
          <td style="text-align: center;">${hs.totalChecks}</td>
          <td style="text-align: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="background: #FF4757; width: ${riskPercentage}%; height: 4px; border-radius: 2px; min-width: 20px;"></div>
              <span style="font-weight: bold; color: #FF4757;">${hs.highRisk || 0}</span>
            </div>
          </td>
          <td style="text-align: center; font-weight: bold;">${hs.avgScore.toFixed(1)}</td>
        </tr>
        <tr style="height: 4px; background: transparent;"></tr>
      `;
    })
    .join("");

  return `
    <div>
      <div style="font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #1E2D3D;">MOST FLAGGED COMMODITIES — GLOBAL</div>
      <table style="width: 100%; border-collapse: collapse; background: #0D1117; border: 1px solid #1E2D3D; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #131920;">
            <th style="padding: 12px; text-align: left; font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; font-weight: bold; border-bottom: 1px solid #1E2D3D; letter-spacing: 1px;">#</th>
            <th style="padding: 12px; text-align: left; font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; font-weight: bold; border-bottom: 1px solid #1E2D3D; letter-spacing: 1px;">HS Code</th>
            <th style="padding: 12px; text-align: left; font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; font-weight: bold; border-bottom: 1px solid #1E2D3D; letter-spacing: 1px;">Commodity</th>
            <th style="padding: 12px; text-align: left; font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; font-weight: bold; border-bottom: 1px solid #1E2D3D; letter-spacing: 1px;">Checks</th>
            <th style="padding: 12px; text-align: left; font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; font-weight: bold; border-bottom: 1px solid #1E2D3D; letter-spacing: 1px;">High Risk</th>
            <th style="padding: 12px; text-align: left; font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; font-weight: bold; border-bottom: 1px solid #1E2D3D; letter-spacing: 1px;">Avg Score</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderOriginCountryRanking(routeData) {
  const sorted = Object.values(routeData)
    .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
    .slice(0, 10);

  if (sorted.length === 0) {
    return `
      <div style="border: 1px solid #1E2D3D; border-radius: 8px; padding: 32px; text-align: center; background: #0D1117;">
        <div style="font-family: 'JetBrains Mono'; font-size: 12px; color: #4A6380;">No route data available yet</div>
      </div>
    `;
  }

  const rows = sorted
    .map((route, i) => {
      const riskLevel =
        route.avgScore >= 4
          ? "🔴 CRITICAL"
          : route.avgScore >= 2.5
            ? "🔴 HIGH"
            : route.avgScore >= 1.5
              ? "🟡 ELEVATED"
              : "🟢 NORMAL";

      const topCommodity = Object.entries(route.topCommodities || {}).sort(
        ([, a], [, b]) => b - a
      )[0];

      return `
        <tr>
          <td style="text-align: center; font-weight: bold; color: #00D4FF;">${i + 1}</td>
          <td>${route.country || "Unknown"}</td>
          <td style="text-align: center;">${route.totalChecks}</td>
          <td style="text-align: center; font-weight: bold; color: #FF4757;">${route.highRisk || 0}</td>
          <td style="text-align: center; font-weight: bold;">${route.avgScore.toFixed(1)}</td>
          <td style="text-align: center;">${riskLevel}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div>
      <div style="font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #1E2D3D;">ORIGIN COUNTRY RISK RANKING — GLOBAL</div>
      <table style="width: 100%; border-collapse: collapse; background: #0D1117; border: 1px solid #1E2D3D; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #131920;">
            <th style="padding: 12px; text-align: left; font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; font-weight: bold; border-bottom: 1px solid #1E2D3D; letter-spacing: 1px;">#</th>
            <th style="padding: 12px; text-align: left; font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; font-weight: bold; border-bottom: 1px solid #1E2D3D; letter-spacing: 1px;">Country</th>
            <th style="padding: 12px; text-align: left; font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; font-weight: bold; border-bottom: 1px solid #1E2D3D; letter-spacing: 1px;">Checks</th>
            <th style="padding: 12px; text-align: left; font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; font-weight: bold; border-bottom: 1px solid #1E2D3D; letter-spacing: 1px;">High Risk</th>
            <th style="padding: 12px; text-align: left; font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; font-weight: bold; border-bottom: 1px solid #1E2D3D; letter-spacing: 1px;">Avg Score</th>
            <th style="padding: 12px; text-align: left; font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; font-weight: bold; border-bottom: 1px solid #1E2D3D; letter-spacing: 1px;">Risk Level</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderLiveGlobalFeed(checks) {
  const recentChecks = checks.slice(0, 20);

  if (recentChecks.length === 0) {
    return `
      <div style="border: 1px solid #1E2D3D; border-radius: 8px; padding: 32px; text-align: center; background: #0D1117;">
        <div style="font-family: 'JetBrains Mono'; font-size: 12px; color: #4A6380;">Waiting for first declaration submission...</div>
      </div>
    `;
  }

  const yourPortId = getOrCreatePortId();
  const feedHtml = recentChecks
    .map((check) => {
      const time = new Date(check.timestamp).toLocaleTimeString();
      const riskBadge = getRiskBadge(check.riskLevel);
      const isYourPort = check.portId === yourPortId;
      const borderStyle = isYourPort ? "border-left: 2px solid #00D4FF;" : "";

      return `
        <div style="padding: 8px 0; border-bottom: 1px solid #1E2D3D; ${borderStyle}">
          <div style="font-family: 'JetBrains Mono'; font-size: 11px; display: flex; gap: 16px; align-items: center;">
            <span style="color: #4A6380; min-width: 60px;">${time}</span>
            <span style="color: #00D4FF; font-weight: bold; min-width: 80px;">${check.portId}</span>
            <span style="color: #8BA3BE; font-weight: bold; min-width: 70px;">${check.hsCode}</span>
            <span style="color: #E8F0F8; flex: 1;">${check.material}</span>
            <span style="font-weight: bold; color: #E8F0F8; min-width: 30px;">${check.riskScore}</span>
            <span style="min-width: 80px;">${riskBadge}</span>
          </div>
        </div>
      `;
    })
    .join("");

  const totalChecks = checks.length;
  const uniquePorts = new Set(checks.map((c) => c.portId)).size;

  return `
    <div>
      <div style="font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #1E2D3D;">LIVE GLOBAL FEED — ALL PORTS</div>
      <div style="background: #0D1117; border: 1px solid #1E2D3D; border-radius: 8px; padding: 16px; max-height: 400px; overflow-y: auto; font-family: 'JetBrains Mono';">
        ${feedHtml}
      </div>
      <div style="font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; margin-top: 12px; text-align: center;">Showing last 20 of ${totalChecks} declarations across ${uniquePorts} ports</div>
    </div>
  `;
}

function renderFraudPatternHeatmap(fraudTypes, totalHighRisk) {
  const total = Object.values(fraudTypes).reduce((a, b) => a + b, 0) || 1;

  const fraudColor = {
    "Tariff Misclassification": "#FF4757",
    "Under-valuation / Duty Evasion": "#FFB800",
    "Weight Misdeclaration": "#FF9500",
    "Document Fabrication": "#A78BFA",
    "Physical Impossibility": "#FF4757",
    "Multiple Anomalies": "#00D4FF"
  };

  const cards = Object.entries(fraudTypes)
    .slice(0, 6)
    .map(([type, count]) => {
      const color = fraudColor[type] || "#00D4FF";
      const percentage = ((count / total) * 100).toFixed(1);

      return `
        <div style="background: #0D1117; border: 1px solid #1E2D3D; border-radius: 6px; padding: 16px;">
          <div style="font-family: 'Bitter'; font-size: 12px; font-weight: bold; color: #E8F0F8; margin-bottom: 12px;">${type}</div>
          <div style="font-family: 'JetBrains Mono'; font-size: 14px; font-weight: bold; color: ${color}; margin-bottom: 4px;">${count} · ${percentage}%</div>
          <div style="background: #131920; height: 6px; border-radius: 3px; overflow: hidden;">
            <div style="background: ${color}; height: 100%; width: ${percentage}%; border-radius: 3px;"></div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div>
      <div style="font-family: 'JetBrains Mono'; font-size: 10px; color: #4A6380; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #1E2D3D;">FRAUD TYPE DISTRIBUTION — GLOBAL</div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        ${cards}
      </div>
    </div>
  `;
}

function getRiskBadge(level) {
  const badges = {
    critical: '<span style="background: rgba(255,71,87,0.2); color: #FF4757; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(255,71,87,0.4); font-size: 10px;">🔴 CRITICAL</span>',
    high: '<span style="background: rgba(255,71,87,0.15); color: #FF4757; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(255,71,87,0.3); font-size: 10px;">🔴 HIGH</span>',
    medium: '<span style="background: rgba(255,184,0,0.15); color: #FFB800; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(255,184,0,0.3); font-size: 10px;">🟡 MEDIUM</span>',
    low: '<span style="background: rgba(0,255,157,0.15); color: #00FF9D; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(0,255,157,0.3); font-size: 10px;">🟢 LOW</span>'
  };
  return badges[level] || badges.low;
}

// ═══════════════════════════════════════════════════
// DATA LOADING FUNCTIONS
// ═══════════════════════════════════════════════════

async function loadAlerts() {
  const keys = await storageList("alerts:");
  const alerts = [];

  for (const key of keys) {
    const alert = await storageGet(key);
    if (alert) alerts.push(alert);
  }

  return alerts.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
}

async function loadChecks() {
  const keys = await storageList("checks:");
  const checks = [];

  for (const key of keys) {
    const check = await storageGet(key);
    if (check) checks.push(check);
  }

  return checks.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
}

async function loadHsData() {
  const keys = await storageList("leaderboard:hs:");
  const data = {};

  for (const key of keys) {
    const hsData = await storageGet(key);
    if (hsData) {
      data[hsData.hsCode] = hsData;
    }
  }

  return data;
}

async function loadRouteData() {
  const keys = await storageList("leaderboard:route:");
  const data = {};

  for (const key of keys) {
    const routeData = await storageGet(key);
    if (routeData) mergeRouteAggregate(data, routeData);
  }

  return data;
}

function countFraudTypes(checks) {
  const counts = {};

  checks.forEach((check) => {
    check.triggeredRules?.forEach((rule) => {
      const fraudType = mapRuleToFraudType(rule);
      counts[fraudType] = (counts[fraudType] || 0) + 1;
    });
  });

  return counts;
}

function mapRuleToFraudType(rule) {
  if (rule.includes("Assembly")) return "Tariff Misclassification";
  if (rule.includes("Container")) return "Physical Impossibility";
  if (rule.includes("Value")) return "Under-valuation / Duty Evasion";
  if (rule.includes("Weight")) return "Weight Misdeclaration";
  if (rule.includes("Arithmetic")) return "Document Fabrication";
  return "Multiple Anomalies";
}

// ═══════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════

function timeAgoString(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatTimeRemaining(expiresAt) {
  const expires = new Date(expiresAt);
  const now = new Date();
  const seconds = Math.floor((expires - now) / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d`;
}

// ═══════════════════════════════════════════════════
// AUTO-REFRESH AND DEMO MODE
// ═══════════════════════════════════════════════════

let refreshTimer = null;
let lastRefresh = Date.now();

function startAutoRefresh() {
  const REFRESH_INTERVAL = 15000; // 15 seconds

  loadAllIntelligenceData();
  lastRefresh = Date.now();

  refreshTimer = setInterval(async () => {
    await loadAllIntelligenceData();
    lastRefresh = Date.now();
    showToast("↻ Intelligence data updated", "info");
  }, REFRESH_INTERVAL);
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

async function loadDemoData() {
  const demoChecks = [
    {
      id: `check_demo_${Date.now()}_1`,
      portId: "PRT-DEMO1",
      timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
      hsCode: "8517.12",
      material: "Smartphones",
      hsDesc: "Smartphones and cellular phones",
      riskScore: 6,
      riskLevel: "critical",
      originCountry: "China",
      declaredVKR: 25.5,
      wtDeviation: 12,
      triggeredRules: ["Assembly State", "Value/kg Check"],
      confirmedFraud: false,
      quantity: 500,
      declaredWeight: 50,
      declaredValue: 12750,
      source: "demo"
    },
    {
      id: `check_demo_${Date.now()}_2`,
      portId: "PRT-DEMO1",
      timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
      hsCode: "8517.12",
      material: "Smartphones",
      hsDesc: "Smartphones and cellular phones",
      riskScore: 5,
      riskLevel: "high",
      originCountry: "Vietnam",
      declaredVKR: 22,
      wtDeviation: 8,
      triggeredRules: ["Assembly State"],
      confirmedFraud: false,
      quantity: 300,
      declaredWeight: 30,
      declaredValue: 6600,
      source: "demo"
    },
    {
      id: `check_demo_${Date.now()}_3`,
      portId: "PRT-DEMO2",
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      hsCode: "8517.12",
      material: "Smartphones",
      hsDesc: "Smartphones and cellular phones",
      riskScore: 1,
      riskLevel: "low",
      originCountry: "Germany",
      declaredVKR: 18,
      wtDeviation: 2,
      triggeredRules: [],
      confirmedFraud: false,
      quantity: 200,
      declaredWeight: 20,
      declaredValue: 3600,
      source: "demo"
    },
    {
      id: `check_demo_${Date.now()}_4`,
      portId: "PRT-DEMO2",
      timestamp: new Date(Date.now() - 50 * 60000).toISOString(),
      hsCode: "6109.10",
      material: "Cotton T-shirts",
      hsDesc: "T-shirts of cotton, knitted",
      riskScore: 4,
      riskLevel: "high",
      originCountry: "Bangladesh",
      declaredVKR: 3.2,
      wtDeviation: 15,
      triggeredRules: ["Weight Check", "Container Limit"],
      confirmedFraud: false,
      quantity: 5000,
      declaredWeight: 600,
      declaredValue: 1920,
      source: "demo"
    },
    {
      id: `check_demo_${Date.now()}_5`,
      portId: "PRT-DEMO3",
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      hsCode: "7408.11",
      material: "Copper Wire",
      hsDesc: "Copper wire, refined",
      riskScore: 2,
      riskLevel: "medium",
      originCountry: "India",
      declaredVKR: 2.8,
      wtDeviation: 5,
      triggeredRules: ["Packaging Ratio"],
      confirmedFraud: false,
      quantity: 1000,
      declaredWeight: 3000,
      declaredValue: 8400,
      source: "demo"
    }
  ];

  for (const check of demoChecks) {
    await storageSet(`checks:${check.id}`, check);
    await updateLeaderboardAggregates(check);
    if (check.riskLevel === "high" || check.riskLevel === "critical") {
      await createGlobalAlert(check);
    }
  }

  showToast("✓ Demo data loaded — 5 checks submitted", "success");
  loadAllIntelligenceData();
}
