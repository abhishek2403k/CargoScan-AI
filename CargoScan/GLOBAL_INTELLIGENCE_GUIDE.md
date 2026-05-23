# GLOBAL INTELLIGENCE NETWORK — Feature Implementation Guide

## Overview

The **GLOBAL INTELLIGENCE NETWORK** is a brand-new federated fraud detection sharing system built into CARGOSCAN. It enables real-time synchronization of customs intelligence data across multiple users/ports using the Anthropic artifact storage API.

When Student A submits a declaration check in their browser, Student B sees that data immediately on the Global Intelligence dashboard in theirs — creating a live, shared intelligence network.

---

## ✅ What Was Added

### 1. **New Navigation System**
- **Tab Navigation Bar** (fixed below top header)
  - `🛃 DECLARATION CHECK` — Shows the existing checking interface (default view)
  - `🌐 GLOBAL INTELLIGENCE` — Shows the new intelligence dashboard
  - Port ID display: `Port: PRT-XXXX` (unique per session)

- **CSS-Driven View Switching** — No conflicts with existing code
  - `.declaration-view` container wraps the original app-layout
  - `.intelligence-view` container holds the new dashboard
  - CSS toggles visibility; JavaScript switches classes

### 2. **New Global Intelligence Dashboard** (`global-intelligence.js`)

When you click the `🌐 GLOBAL INTELLIGENCE` tab, you see:

#### **Section A: Global Stats Bar**
- Total checks submitted across all ports
- Breakdown by risk level: LOW, MEDIUM, HIGH, CRITICAL
- Automatically updated every 15 seconds

#### **Section B: Active Alerts Panel**
- Real-time alerts for HIGH and CRITICAL risk submissions
- Shows: fraud type, origin country, expiration time (72 hours)
- Auto-refreshes to show new alerts from other ports

#### **Section C: Most Flagged Commodities Leaderboard**
- Top 10 HS codes by number of high-risk flags
- Displays: total checks, high-risk count, average risk score
- Risk percentage bar visualization

#### **Section D: Origin Country Risk Ranking**
- Countries sorted by average risk score
- Risk level badges: 🔴 CRITICAL / 🔴 HIGH / 🟡 ELEVATED / 🟢 NORMAL
- Most flagged commodity per country

#### **Section E: Live Global Feed**
- Real-time stream of declarations from all ports (last 20)
- Format: Time · Port ID · HS Code · Material · Score · Risk Badge
- Your port's submissions highlighted with blue left border

#### **Section F: Fraud Type Distribution**
- Pie charts showing % breakdown of fraud types detected
- Types: Tariff Misclassification, Under-valuation, Weight Misdeclaration, etc.

#### **Section G: Network Status Bar** (Fixed Bottom)
- Connection status: ● CONNECTED
- Your port ID
- Last sync time (auto-updates)
- Total active ports on network
- Buttons: REFRESH NOW · LOAD DEMO DATA · CLEAR MY DATA

---

## 🔌 Storage API Integration

All data is shared using the Anthropic artifact storage API:

```javascript
// READ
const result = await window.storage.get(key, true)

// WRITE  
await window.storage.set(key, JSON.stringify(data), true)

// LIST KEYS
const keys = await window.storage.list(prefix, true)

// DELETE
await window.storage.delete(key, true)
```

**Data Storage Keys:**
- `checks:TIMESTAMP` — Individual check records
- `alerts:TIMESTAMP` — High-risk alert records
- `leaderboard:hs:HSCODE` — HS code aggregates
- `leaderboard:route:COUNTRY` — Origin risk data
- `leaderboard:stats` — Global statistics summary

---

## 📊 Data Flow

### When You Submit a Declaration Check:

1. **Analysis completes** → `renderResults()` displays results
2. **Auto-submission triggers** → `submitToGlobalNetwork(checkResult)` called
3. **Check record created** with all fields:
   - HS code, material, description
   - Risk score (0-9+)
   - Weight & value metrics
   - Origin country
   - Triggered validation rules
4. **Stored in shared storage** with timestamp key
5. **Leaderboards updated** automatically:
   - HS code aggregate (total checks, high-risk count, avg score)
   - Country route aggregate (checks, high-risk count, avg score)
   - Global stats (totals by risk level)
6. **Alert generated** if HIGH or CRITICAL risk
   - Expires in 72 hours
   - Visible to all ports on network
7. **Toast notification** shows: `✓ Check shared with global network`

### Auto-Refresh on Intelligence Dashboard:

- **Every 15 seconds:** All data reloaded from storage
- **Real-time sync:** Other ports' data appears instantly
- **Stops when tab inactive** to save resources
- **"X seconds ago" counter** shows last sync time

---

## 👤 Port ID System

**Generated once per session, persisted for entire browsing session:**

```javascript
function getOrCreatePortId() {
  let portId = sessionStorage.getItem("cargoPortId")
  if (!portId) {
    // Generate random 4-character port code
    portId = `PRT-${randomChars}`
    sessionStorage.setItem("cargoPortId", portId)
  }
  return portId
}
```

**Behavior:**
- Same browser tab → Same port ID (consistent)
- New tab/window → New port ID (simulates different port)
- Page refresh → **Same port ID** (persisted in sessionStorage)
- Close browser → Port ID discarded (new session creates new ID)

This allows a single instructor to open multiple tabs and simulate multiple customs ports interacting on the network.

---

## 🎮 Demo Mode

**"LOAD DEMO DATA"** button injects 12 pre-built sample checks:

- 3 smartphone checks (high risk, medium risk, low risk)
- 2 copper wire checks
- 2 cotton garment checks  
- 2 steel rod checks
- 2 laptop checks
- 1 polyethylene check

**Features:**
- Different fake port IDs: PRT-DEMO1, PRT-DEMO2, PRT-DEMO3
- Timestamps spread over last 2 hours
- Diverse origin countries: China, Vietnam, Bangladesh, India, Germany
- Various risk levels and triggered rules
- Instantly populates realistic leaderboard

**Tagged:** `source: "demo"` so demo data can be identified/cleared separately

**Use case:** Presenter can load demo data once, then open audience members' browsers to show real-time network effects

---

## 🔧 Integration Points

### **Only 1 Line Added to Existing Code:**

In `heuristics.js` after `renderResults(results);`:

```javascript
// Submit to global intelligence network
if (typeof submitToGlobalNetwork === 'function') {
    submitToGlobalNetwork(results).catch(err => console.error('Network submission failed:', err));
}
```

**Why this approach?**
- ✅ Non-invasive — doesn't modify existing logic
- ✅ Async/fail-safe — errors don't break the check interface
- ✅ Conditional check — graceful fallback if global-intelligence.js fails to load
- ✅ No data flow dependency — works seamlessly with existing modules

### **HTML Changes:**
- Added tab navigation bar with two buttons
- Wrapped existing app-layout in `<div class="declaration-view">`
- Added new `<div class="intelligence-view">` for dashboard
- Added font imports (Bitter, Syne for design system)
- Loaded `global-intelligence.js` script

### **CSS Changes:**
- Display toggles for views (`.active` class shows/hides)
- Tab navigation styling matching design system
- Intelligence content area with proper padding
- Fixed status bar at bottom
- Responsive grid layouts

---

## 🎨 Design System Consistency

All colors, fonts, and animations match the existing CARGOSCAN theme:

**Colors:**
- Surface: `#0D1117` (dark terminal aesthetic)
- Text: `#E8F0F8` (light blue-gray)
- Accent: `#00D4FF` (cyan highlighting)
- Danger: `#FF4757` (red alerts)
- Success: `#00FF9D` (green safe/normal)
- Muted: `#4A6380` (gray labels)

**Fonts:**
- Headers: Syne 700-800 weight
- Monospace: JetBrains Mono (data, timestamps)
- Body: Bitter for descriptions
- UI labels: JetBrains Mono uppercase with letter-spacing

**Animations:**
- Tab fade-in: 0.2s ease
- Data load: skeleton shimmer placeholder
- Toast notifications: slide-in from right
- Critical alerts: 2s pulse border animation

---

## 📱 Responsive Behavior

- **Desktop (>1024px):** Full side-by-side tables, grid leaderboards
- **Tablet (768px-1024px):** Stacked columns, adjusted spacing
- **Mobile (<768px):** Single column, horizontal scroll tables, simplified stats

---

## 🚨 Toast Notifications

Shown at bottom-right corner, auto-dismiss after 3 seconds (5s for alerts):

| Event | Message | Type |
|-------|---------|------|
| Check submitted | ✓ Check shared with global network | success |
| Dashboard refresh | ↻ Intelligence data updated | info |
| New high-risk alert | 🚨 New high-risk alert from [port] | warning |
| Network error | ⚠ Network sync failed — retrying | error |

---

## 🔒 Data Clearing

**"CLEAR MY DATA"** button removes your port's submissions:

1. Prompts confirmation dialog
2. Finds all checks where `portId === yourPortId`
3. Deletes from shared storage
4. Updates leaderboards to reflect removal
5. Shows confirmation toast

**Use case:** Clean slate for new demo scenarios

---

## 🔄 Auto-Refresh Mechanics

```javascript
const REFRESH_INTERVAL = 15000  // 15 seconds

function startAutoRefresh() {
  // Initial load
  loadAllIntelligenceData()
  
  // Reload every 15 seconds
  setInterval(async () => {
    await loadAllIntelligenceData()
    lastRefresh = Date.now()
  }, REFRESH_INTERVAL)
  
  // Update "X seconds ago" counter every second
  setInterval(() => {
    const secs = Math.floor((Date.now() - lastRefresh) / 1000)
    updateDisplayedTime(secs)
  }, 1000)
}

function stopAutoRefresh() {
  // Called when switching back to declaration tab
  // Saves resources, prevents unnecessary storage queries
}
```

---

## ✨ Key Features at a Glance

| Feature | Detail |
|---------|--------|
| **Real-time Sync** | 15-second refresh cycle, instant cross-browser updates |
| **Port ID System** | Unique identifier per browser session |
| **2-Way Network** | All data shared to all ports simultaneously |
| **Leaderboards** | Commodities & countries ranked by risk |
| **Live Feed** | 20 most recent submissions from all ports |
| **Expiring Alerts** | 72-hour lifecycle for high-risk alerts |
| **Demo Data** | 1-click population of 12 sample checks |
| **Toast Notifications** | Non-blocking feedback for user actions |
| **Data Clearing** | Remove your submissions from network |
| **Non-invasive** | Only 1 line added to existing code |
| **Display Consistency** | Matches existing CARGOSCAN design exactly |

---

## 📝 Usage Scenarios

### **Scenario 1: Single Instructor Demo**

1. **Instructor** opens Browser Tab A → DECLARATION CHECK view
2. **Instructor** submits a check → Auto-shared to network
3. **Instructor** opens Browser Tab B (new tab = new port) → GLOBAL INTELLIGENCE
4. **Tab B** shows Tab A's check immediately
5. **Instructor** submits another check from Tab A → Tab B updates in real-time
6. Demonstrates federated intelligence network concept

### **Scenario 2: Multi-User Classroom**

1. **Each student** opens CARGOSCAN in their own browser
2. **All students** connected to same shared storage (artifact storage API)
3. **Students** each submit declarations from their browser
4. **All students** see entire class's submissions on intelligence dashboard
5. **Real-time leaderboard** shows which commodities/countries flagged most
6. **Collaborative learning:** Students see patterns across all submissions

### **Scenario 3: Presentation with Demo Data**

1. **Presenter** clicks "LOAD DEMO DATA" → 12 checks injected
2. **Leaderboard instantly populates** with realistic risk patterns
3. **Presenter** shows audience the intelligence dashboard
4. **Audience can open their own** browser tabs → see same data
5. **Presenter** can then have audience submit real checks → merges with demo

---

## 🔍 Testing the Feature

**To test real-time sync:**

1. Open Browser Tab A → CARGOSCAN → **DECLARATION CHECK**
2. Upload a PDF, review fields, click **INITIATE PLAUSIBILITY SCAN**
3. Wait for analysis complete → check auto-submitted
4. See toast: `✓ Check shared with global network`
5. Open Browser Tab B → CARGOSCAN → **GLOBAL INTELLIGENCE**
6. Should show Tab A's check in:
   - Global Stats Bar (count: 1)
   - Live Feed (newest entry)
   - Commodity Leaderboard (if HS code matches database)
   - New Tab page shows green circle under `🌐 tab`
7. **Back to Tab A** → Submit another check
8. **Check Tab B** →  **REFRESH NOW** or wait 15 seconds
9. New check appears instantly

---

## 📦 Files Modified/Created

| File | Change | Type |
|------|--------|------|
| `global-intelligence.js` | Created (900+ lines) | New Module |
| `index.html` | Updated | Navigation + containers |
| `heuristics.js` | Updated | +1 line for submission |
| `app.js` | No changes | (Integration auto-works) |
| `constants.js` | No changes | (Data used as-is) |
| `parser.js` | No changes | (Data used as-is) |
| `renderer.js` | No changes | (Data used as-is) |
| `pdf-handler.js` | No changes | (Data used as-is) |

---

## 🎯 Next Steps / Enhancements

Possible future additions:

- [ ] **Advanced Filtering:** Filter by country, HS code, risk level
- [ ] **Export Leaderboard:** Download CSV of fraud patterns
- [ ] **Alert Customization:** Set custom alert thresholds per user
- [ ] **Port Profiles:** Store port metadata (country, authority name)
- [ ] **Fraud Case Linking:** Mark checks as "confirmed fraud" for investigation
- [ ] **Rules Insights:** Show which validation rules triggered most
- [ ] **Trend Analysis:** Charts showing fraud patterns over time
- [ ] **Multi-language Support:** Translate alerts and labels
- [ ] **API Integration:** Connect to real GraphQL API for production

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Tab doesn't switch | Check console for errors. Make sure `switchView()` is called. |
| No demo data appears | Click "LOAD DEMO DATA" button, wait 2 seconds for load. |
| Stats not updating | Ensure storage API is available (artifact environment). |
| Toast doesn't show | Check z-index conflicts with other elements. |
| Feed not refreshing | Try manual "REFRESH NOW" button. Check 15s interval. |
| Port ID always different | Make sure using same browser tab (not new tab). |

---

## 📞 Support

All feature code is self-contained in:
- `global-intelligence.js` — Main logic (~900 lines)
- Inline HTML/JavaScript — Navigation switching

For issues, check browser console for error messages. The system is designed to fail gracefully without breaking the main declaration checking interface.

---

**Implementation Complete!** ✅

The GLOBAL INTELLIGENCE NETWORK is now fully integrated into your CARGOSCAN customs plausibility checking system. Start checking declarations and watch the intelligence network populate in real-time across browser tabs.

