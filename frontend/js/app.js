/**
 * app.js – Main application logic for Solar Tracker Dashboard
 * Handles: Supabase realtime, page switching, gauge updates, weather, export CSV
 */

import { createClient } from '@supabase/supabase-js';
import {
    initIotChart, pushIotData, setIotChartMode,
    initServoChart, pushServoData,
    initDailyBarChart, updateDailyBarChart,
    initDetailPowerChart, updateDetailPowerChart,
    initDetailServoChart, updateDetailServoChart
} from './charts.js';

// ══════════════════════════════════════════════
// CONFIG – ganti dengan kredensial Supabase kamu
// ══════════════════════════════════════════════
const SUPABASE_URL      = 'https://mbkhzmqgfynjeoousogb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ia2h6bXFnZnluamVvb3Vzb2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNjQ5MDUsImV4cCI6MjEwMTk0MDkwNX0.nEGN2EJI-TmVEiuEdBAXlSlklfZ2mQzhUVr4q_139Hw';
const BACKEND_URL       = 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
let currentPage   = 'iot';
let iotDataBuffer = [];       // raw sensor records for today
let servoBuffer   = [];       // servo records for today
let totalRecords  = 0;
let lastSeen      = null;
let selectedDate  = todayStr();
const OFFLINE_AFTER_MS = 90_000;

// 14-day cached labels & values
let bar14Labels = [];
let bar14Values = [];

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
async function init() {
    initIotChart();
    initServoChart();
    initDailyBarChart(onBarClick);
    initDetailPowerChart();
    initDetailServoChart();

    // Set date picker to today
    document.getElementById('detail-date').value = selectedDate;
    document.getElementById('detail-date').addEventListener('change', e => {
        selectedDate = e.target.value;
        loadDetailDate(selectedDate);
    });

    // Simulate data immediately if offline (placeholder config)
    if (SUPABASE_URL.includes('placeholder')) {
        startSimulation();
    } else {
        await loadTodayIot();
        await loadDailyBar();
        await loadDetailDate(selectedDate);
        setupRealtime();
        setInterval(() => {
            setOnline(lastSeen !== null && Date.now() - lastSeen.getTime() <= OFFLINE_AFTER_MS);
        }, 5000);
    }

    setupWeather();
}

// ══════════════════════════════════════════════
// PAGE SWITCHING
// ══════════════════════════════════════════════
window.showPage = function(page) {
    currentPage = page;
    document.getElementById('page-iot').style.display       = page === 'iot'       ? ''     : 'none';
    document.getElementById('page-dashboard').style.display = page === 'dashboard' ? ''     : 'none';
    document.getElementById('tab-iot').classList.toggle('active',       page === 'iot');
    document.getElementById('tab-dashboard').classList.toggle('active', page === 'dashboard');
    document.getElementById('btn-iot-nav').classList.toggle('active',   page === 'iot');
    document.getElementById('btn-dash-nav').classList.toggle('active',  page === 'dashboard');
    // Reinit dashboard charts after display
    if (page === 'dashboard') {
        setTimeout(() => {
            loadDailyBar();
            loadDetailDate(selectedDate);
        }, 50);
    }
};

// ── Tab nav ──────────────────────────────────
document.getElementById('tab-iot').addEventListener('click', e => { e.preventDefault(); showPage('iot'); });
document.getElementById('tab-dashboard').addEventListener('click', e => { e.preventDefault(); showPage('dashboard'); });
document.getElementById('btn-iot-nav').addEventListener('click', () => showPage('iot'));
document.getElementById('btn-dash-nav').addEventListener('click', () => showPage('dashboard'));

// ══════════════════════════════════════════════
// CHART MODE TOGGLE (IoT page)
// ══════════════════════════════════════════════
window.switchIotChart = function(mode) {
    setIotChartMode(mode);
    ['power','voltage','current'].forEach(m => {
        document.getElementById(`tog-${m === 'power' ? 'power' : m === 'voltage' ? 'volt' : 'curr'}`)
            ?.classList.toggle('active', m === mode);
    });
};

// ══════════════════════════════════════════════
// DETAIL TAB SWITCHING (Dashboard)
// ══════════════════════════════════════════════
window.switchDetailTab = function(tab) {
    ['grafik','tabel','log'].forEach(t => {
        document.getElementById(`dtab-${t}`)?.classList.toggle('active', t === tab);
        const el = document.getElementById(`dtab-content-${t}`);
        if (el) el.style.display = t === tab ? '' : 'none';
    });
};

// ══════════════════════════════════════════════
// LOAD TODAY'S IoT DATA (on init)
// ══════════════════════════════════════════════
async function loadTodayIot() {
    const today = todayStr();
    const { data: sensorData, error: se } = await supabase
        .from('readings')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: true });

    if (se) console.warn('Supabase sensor error', se);

    if (sensorData) {
        sensorData.forEach(row => {
            processSensorRow(row, false);
            // Servo data is baked into readings:
            if (row.servo_azimuth !== null && row.servo_azimuth !== undefined) {
                processServoRow({
                    created_at: row.created_at,
                    azimuth: row.servo_azimuth,
                    elevation: row.servo_elevation
                }, false);
            }
        });
    }

    if (sensorData?.length) {
        totalRecords = sensorData.length;
        refreshFuzzyCount();
    }
}

// ══════════════════════════════════════════════
// LOAD 14-DAY BAR CHART
// ══════════════════════════════════════════════
async function loadDailyBar() {
    const { data, error } = await supabase.rpc('daily_energy_14days');

    if (!data || error) {
        // Fallback: generate from readings group by date
        const since = new Date();
        since.setDate(since.getDate() - 13);
        const { data: raw } = await supabase
            .from('readings')
            .select('created_at, power')
            .gte('created_at', since.toISOString())
            .order('created_at', { ascending: true });

        if (!raw) return;

        const grouped = {};
        raw.forEach(r => {
            const d = r.created_at.slice(0, 10);
            grouped[d] = (grouped[d] || 0) + (r.power || 0) * (30 / 3600); // 30s interval → Wh
        });

        bar14Labels = Object.keys(grouped).sort();
        bar14Values = bar14Labels.map(d => +grouped[d].toFixed(1));
    } else {
        bar14Labels = data.map(r => r.day);
        bar14Values = data.map(r => +r.energy_wh.toFixed(1));
    }

    const todayIdx = bar14Labels.indexOf(todayStr());
    updateDailyBarChart(
        bar14Labels.map(d => fmtDateLabel(d)),
        bar14Values,
        todayIdx
    );

    // Update dashboard KPI cards
    const todayEnergy = todayIdx >= 0 ? bar14Values[todayIdx] : 0;
    const prevEnergy  = todayIdx > 0   ? bar14Values[todayIdx - 1] : null;
    setEl('dash-energy', todayEnergy.toFixed(1));

    if (prevEnergy !== null) {
        const diff = todayEnergy - prevEnergy;
        const pct  = prevEnergy > 0 ? ((diff / prevEnergy) * 100).toFixed(1) : '--';
        const diffEl = document.getElementById('dash-energy-diff');
        if (diffEl) {
            diffEl.textContent = `${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)} Wh (${pct}%) vs kemarin`;
            diffEl.className   = `kpi-diff ${diff >= 0 ? 'up' : 'down'}`;
        }
    }
}

function onBarClick(idx) {
    const date = bar14Labels[idx];
    if (!date) return;
    selectedDate = date;
    document.getElementById('detail-date').value = date;
    loadDetailDate(date);
    // Highlight selected bar
    updateDailyBarChart(
        bar14Labels.map(d => fmtDateLabel(d)),
        bar14Values, idx
    );
}

// ══════════════════════════════════════════════
// LOAD DETAIL DATE (Dashboard)
// ══════════════════════════════════════════════
async function loadDetailDate(date) {
    const { data: sensor } = await supabase
        .from('readings')
        .select('*')
        .gte('created_at', `${date}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`)
        .order('created_at', { ascending: true });

    if (!sensor || !sensor.length) {
        clearDetailCards();
        return;
    }

    const { data: servo } = { data: null }; // legacy fallback


    const labels  = sensor.map(r => fmtTime(r.created_at));
    const power   = sensor.map(r => +(r.power   || 0).toFixed(2));
    const voltage = sensor.map(r => +(r.voltage || 0).toFixed(2));
    const current = sensor.map(r => +((r.current || 0) / 1000).toFixed(3));

    const avgP   = avg(power);
    const maxP   = Math.max(...power);
    const minP   = Math.min(...power);
    const avgV   = avg(voltage);
    const energy = +(power.reduce((s, p) => s + p * (30/3600), 0)).toFixed(1);
    const eff    = maxP > 0 ? +((avgP / maxP) * 100).toFixed(1) : 0;

    setEl('ds-avgp', avgP.toFixed(1));
    setEl('ds-maxp', maxP.toFixed(1));
    setEl('ds-minp', minP.toFixed(1));
    setEl('ds-avgv', avgV.toFixed(2));
    setEl('ds-energy', energy);
    setEl('ds-eff', eff);

    // Dashboard KPIs
    setEl('dash-avg-power', avgP.toFixed(1));
    setEl('dash-max-power', maxP.toFixed(1));
    setEl('dash-avg-volt', avgV.toFixed(2));
    const relCount  = sensor.length;
    const relExpect = Math.max(relCount, Math.round((24 * 60 * 60) / 30));
    const rel = Math.min(100, +((relCount / relExpect) * 100).toFixed(1));
    setEl('dash-reliability', rel);
    setEl('dash-rel-sub', `${relCount} record terkumpul`);

    updateDetailPowerChart(labels, power, voltage, current);

    // Extract servo positions from the readings list:
    const sLabels = [];
    const az = [];
    const el = [];
    sensor.forEach(r => {
        if (r.servo_azimuth != null) {
            sLabels.push(fmtTime(r.created_at));
            az.push(r.servo_azimuth);
            el.push(r.servo_elevation);
        }
    });

    if (sLabels.length) {
        updateDetailServoChart(sLabels, az, el);
    }

    // Table mapping
    populateTable(sensor);

    // Log TX
    populateLog(sensor);
}

function clearDetailCards() {
    ['ds-avgp','ds-maxp','ds-minp','ds-avgv','ds-energy','ds-eff'].forEach(id => setEl(id, '--'));
}

function populateTable(sensor) {
    const tbody = document.getElementById('detail-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = sensor.slice(0, 200).map((r) => {
        return `<tr>
            <td>${fmtTime(r.created_at)}</td>
            <td>${(r.voltage||0).toFixed(2)}</td>
            <td>${((r.current||0)/1000).toFixed(3)}</td>
            <td>${(r.power||0).toFixed(2)}</td>
            <td>${r.servo_azimuth !== null && r.servo_azimuth !== undefined ? r.servo_azimuth : '--'}</td>
            <td>${r.servo_elevation !== null && r.servo_elevation !== undefined ? r.servo_elevation : '--'}</td>
        </tr>`;
    }).join('');
}

function populateLog(sensor) {
    const list = document.getElementById('log-list');
    if (!list) return;
    if (!sensor.length) {
        list.innerHTML = '<div class="log-empty">Tidak ada data pada tanggal ini</div>';
        return;
    }
    list.innerHTML = sensor.slice().reverse().slice(0, 100).map(r => `
        <div class="log-entry">
            <span class="log-ts">${fmtTime(r.created_at)}</span>
            <span class="log-ok">✓</span>
            <span class="log-msg">Sensor TX – P:${(r.power||0).toFixed(1)}W V:${(r.voltage||0).toFixed(1)}V</span>
        </div>
    `).join('');
}

// ══════════════════════════════════════════════
// REALTIME SUBSCRIPTION
// ══════════════════════════════════════════════
function setupRealtime() {
    supabase.channel('realtime-sensor')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'readings' }, payload => {
            processSensorRow(payload.new, true);
            if (payload.new.servo_azimuth !== null && payload.new.servo_azimuth !== undefined) {
                processServoRow({
                    created_at: payload.new.created_at,
                    azimuth: payload.new.servo_azimuth,
                    elevation: payload.new.servo_elevation
                }, true);
            }
        })
        .subscribe();
}

// ══════════════════════════════════════════════
// PROCESS INCOMING ROWS
// ══════════════════════════════════════════════
function processSensorRow(row, realtime = true) {
    // Prevent servo-only insert from resetting dashboard stats to 0
    if (row.voltage === null && row.power === null && row.ldr_top_left === null) {
        return; // It's just a servo update row, not sensor data
    }

    const ts = fmtTime(row.created_at);
    const power   = +(row.power   || 0);
    const voltage = +(row.voltage || 0);
    const current = +((row.current || 0) / 1000);

    // KPI
    setElAnimate('iot-voltage', voltage.toFixed(2));
    setElAnimate('iot-current', current.toFixed(3));
    setElAnimate('iot-power',   power.toFixed(1));
    const temperature = Number(row.temperature);
    const humidity = Number(row.humidity);
    if (row.temperature != null && Number.isFinite(temperature)) {
        setElAnimate('iot-temp', temperature.toFixed(1));
    }
    if (row.humidity != null && Number.isFinite(humidity)) {
        setElAnimate('iot-humid', humidity.toFixed(1));
    }

    // LDR
    const maxLdr = 4095;
    const ldr_tl = row.ldr_top_left ?? row.ldr_tl ?? 0;
    const ldr_tr = row.ldr_top_right ?? row.ldr_tr ?? 0;
    const ldr_bl = row.ldr_bottom_left ?? row.ldr_bl ?? 0;
    const ldr_br = row.ldr_bottom_right ?? row.ldr_br ?? 0;

    setLdr('tl', ldr_tl, maxLdr);
    setLdr('tr', ldr_tr, maxLdr);
    setLdr('bl', ldr_bl, maxLdr);
    setLdr('br', ldr_br, maxLdr);

    // Fuzzy (derive error from LDR differential)
    const errH = row.error_horizontal ?? row.fuzzy_dh;
    const errV = row.error_vertikal ?? row.fuzzy_dv;
    
    // Gunakan dari database jika ada, jika tidak, hitung manual (khusus untuk simulasi fallback)
    const dH = errH !== undefined ? errH : (Math.abs((ldr_tl + ldr_bl)/2 - (ldr_tr + ldr_br)/2) / maxLdr * 90);
    const dV = errV !== undefined ? errV : (Math.abs((ldr_tl + ldr_tr)/2 - (ldr_bl + ldr_br)/2) / maxLdr * 90);
    
    setFuzzy('dh', dH);
    setFuzzy('dv', dV);

    // Chart push
    pushIotData(ts, power, voltage, current);

    // Record count + today energy
    totalRecords++;
    refreshFuzzyCount();

    // Compute today's energy: sum of power * interval
    iotDataBuffer.push({ power, voltage, current });
    const energy = iotDataBuffer.reduce((s, r) => s + r.power * (30/3600), 0);
    setElAnimate('iot-energy', energy.toFixed(1));

    // Online status
    lastSeen = new Date(row.created_at);
    setOnline(Date.now() - lastSeen.getTime() <= OFFLINE_AFTER_MS);
}

function processServoRow(row, realtime = true) {
    const az = +(row.azimuth   || 0);
    const el = +(row.elevation || 0);
    setGauge('az', az, 180);
    setGauge('el', el, 180);
    const ts = fmtTime(row.created_at);
    pushServoData(ts, az, el);
}

// ══════════════════════════════════════════════
// GAUGE UPDATER
// ══════════════════════════════════════════════
function setGauge(id, value, max) {
    const circumference = 2 * Math.PI * 50; // r=50
    const dashArr = (value / max) * circumference;
    const fillEl = document.getElementById(`gauge-${id}-fill`);
    const valEl  = document.getElementById(`gauge-${id}-val`);
    if (fillEl) fillEl.setAttribute('stroke-dasharray', `${dashArr} ${circumference}`);
    if (valEl)  valEl.textContent = value.toFixed(1);
}

// ── LDR bar ──────────────────────────────────
function setLdr(pos, value, max) {
    setEl(`ldr-${pos}`, value);
    const bar = document.getElementById(`ldr-${pos}-bar`);
    if (bar) bar.style.width = `${Math.min(100, (value/max)*100).toFixed(1)}%`;
}

// ── Fuzzy bar ────────────────────────────────
function setFuzzy(id, deg) {
    setEl(`fuzzy-${id}`, `${deg.toFixed(2)}°`);
    const bar = document.getElementById(`fuzzy-${id}-bar`);
    if (bar) bar.style.width = `${Math.min(100, (deg/90)*100).toFixed(1)}%`;
}

// ── Record count ─────────────────────────────
function refreshFuzzyCount() {
    setEl('fuzzy-count', `${totalRecords} <span>record</span>`);
}

// ══════════════════════════════════════════════
// ONLINE STATUS
// ══════════════════════════════════════════════
function setOnline(online) {
    const dot  = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    const seen = document.getElementById('last-seen');
    if (!dot || !text) return;
    dot.className  = `status-dot ${online ? 'online' : 'offline'}`;
    text.textContent = online ? 'ESP32 ONLINE' : 'ESP32 OFFLINE';
    if (online && lastSeen) {
        seen.textContent = `· last seen ${fmtTime(lastSeen.toISOString())}`;
    }
}

// ══════════════════════════════════════════════
// WEATHER (Open-Meteo free API)
// ══════════════════════════════════════════════
async function setupWeather() {
    try {
        const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-6.2&longitude=106.8&current_weather=true&hourly=precipitation_probability&timezone=Asia%2FJakarta');
        const j = await r.json();
        const code = j.current_weather?.weathercode ?? 0;
        const rain = j.hourly?.precipitation_probability?.[new Date().getHours()] ?? 0;
        let icon = '☀️', label = 'Cerah';
        if (code >= 80)  { icon = '🌩️'; label = 'Hujan Lebat'; }
        else if (code >= 61) { icon = '🌧️'; label = 'Hujan'; }
        else if (code >= 51) { icon = '🌦️'; label = 'Gerimis'; }
        else if (code >= 2)  { icon = '⛅'; label = 'Berawan'; }
        else if (code === 1) { icon = '🌤️'; label = 'Sedikit Berawan'; }
        if (rain > 60)   { icon = '🌧️'; label = 'Mendung'; }
        setEl('weather-icon', icon);
        setEl('weather-label', label);
    } catch { /* offline */ }
}

// ══════════════════════════════════════════════
// CSV EXPORT
// ══════════════════════════════════════════════
window.exportCsvIot = function() {
    const rows = [['Waktu','Tegangan(V)','Arus(A)','Daya(W)','Energi(Wh)']];
    let energy = 0;
    iotDataBuffer.forEach((r, i) => {
        energy += r.power * (30/3600);
        rows.push([`record-${i+1}`, r.voltage.toFixed(2), r.current.toFixed(3), r.power.toFixed(2), energy.toFixed(3)]);
    });
    downloadCsv(rows, `solar_iot_${todayStr()}.csv`);
};

window.exportCsvDash = async function() {
    const date = document.getElementById('detail-date').value || todayStr();
    const { data } = await supabase
        .from('readings').select('*')
        .gte('created_at', `${date}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`)
        .order('created_at', { ascending: true });
    if (!data?.length) return alert('Tidak ada data untuk tanggal ini.');
    const rows = [['Waktu','Tegangan(V)','Arus(A)','Daya(W)']];
    data.forEach(r => rows.push([fmtTime(r.created_at), (r.voltage||0).toFixed(2), ((r.current||0)/1000).toFixed(3), (r.power||0).toFixed(2)]));
    downloadCsv(rows, `solar_detail_${date}.csv`);
};

function downloadCsv(rows, filename) {
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click(); URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════
// DEMO SIMULATION (when using placeholder URLs)
// ══════════════════════════════════════════════
let simAz = 90, simEl = 45, simPhase = 0;
function startSimulation() {
    setOnline(true);
    lastSeen = new Date();
    setEl('last-seen', `· last seen ${fmtTime(new Date().toISOString())}`);

    // Seed initial data for charts
    const now = new Date();
    for (let i = 59; i >= 0; i--) {
        const t = new Date(now - i * 30000);
        const h = t.getHours() + t.getMinutes() / 60;
        const sunPow = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI)) * 80;
        processSensorRow({
            created_at: t.toISOString(),
            power:    +(sunPow + (Math.random() - 0.5) * 5).toFixed(2),
            voltage:  +(17 + Math.random() * 0.5).toFixed(2),
            current:  +(((sunPow / 17) * 1000) + (Math.random() - 0.5) * 50).toFixed(0),
            ldr_tl: Math.round(1500 + Math.random() * 1000),
            ldr_tr: Math.round(1400 + Math.random() * 1000),
            ldr_bl: Math.round(1300 + Math.random() * 1000),
            ldr_br: Math.round(1200 + Math.random() * 1000),
        }, false);
        processServoRow({ created_at: t.toISOString(), azimuth: simAz + i, elevation: simEl }, false);
    }

    // Dashboard 14-day
    const labels14 = []; const vals14 = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        labels14.push(d.toISOString().slice(0, 10));
        vals14.push(+(400 + Math.random() * 350).toFixed(1));
    }
    bar14Labels = labels14; bar14Values = vals14;
    const tidx = labels14.length - 1;
    updateDailyBarChart(labels14.map(fmtDateLabel), vals14, tidx);
    setEl('dash-energy', vals14[tidx].toFixed(1));

    // Populate detail charts with simulated day data
    const now2 = new Date();
    const dl = [], dp = [], dv = [], dc = [], daz = [], del_ = [];
    for (let i = 0; i < 120; i++) {
        const t = new Date(new Date().setHours(6, 0, 0, 0));
        t.setMinutes(t.getMinutes() + i * 4);
        const h = t.getHours() + t.getMinutes() / 60;
        const p = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI) * 90 + (Math.random()-0.5) * 5);
        dl.push(fmtTime(t.toISOString()));
        dp.push(+p.toFixed(2));
        dv.push(+(17 + Math.random()*0.5).toFixed(2));
        dc.push(+((p/17*1000)/1000).toFixed(3));
        daz.push(Math.min(180, Math.max(0, i * 1.5)));
        del_.push(Math.min(90, Math.max(0, 90 - i * 0.6)));
    }
    updateDetailPowerChart(dl, dp, dv, dc);
    updateDetailServoChart(dl, daz, del_);
    setEl('ds-avgp', avg(dp).toFixed(1)); setEl('ds-maxp', Math.max(...dp).toFixed(1));
    setEl('ds-minp', Math.min(...dp).toFixed(1)); setEl('ds-avgv', avg(dv).toFixed(2));
    setEl('ds-energy', dp.reduce((s,p)=>s+p*(4*60/3600),0).toFixed(1)); setEl('ds-eff', '89.2');
    setEl('dash-avg-power', avg(dp).toFixed(1)); setEl('dash-max-power', Math.max(...dp).toFixed(1));
    setEl('dash-avg-volt', avg(dv).toFixed(2));
    setEl('dash-reliability', '94.4'); setEl('dash-rel-sub', '566 record terkumpul');
    setEl('dash-power-diff', ''); setEl('dash-volt-sub', `Maks: ${Math.max(...dv).toFixed(1)}V · Min: ${Math.min(...dv).toFixed(1)}V`);
    setEl('dash-max-sub', 'Puncak pagi pukul 11:30');

    // Live update loop
    setInterval(() => {
        simPhase++;
        const now3 = new Date();
        const h = now3.getHours() + now3.getMinutes() / 60;
        const sunPow = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI)) * 80;
        processSensorRow({
            created_at: now3.toISOString(),
            power:    +(sunPow + (Math.random()-0.5)*4).toFixed(2),
            voltage:  +(17 + Math.random()*0.5).toFixed(2),
            current:  +(((sunPow/17)*1000) + (Math.random()-0.5)*40).toFixed(0),
            ldr_tl: Math.round(1500 + Math.random()*600),
            ldr_tr: Math.round(1400 + Math.random()*600),
            ldr_bl: Math.round(1300 + Math.random()*600),
            ldr_br: Math.round(1200 + Math.random()*600),
        }, true);
        simAz = constrain(simAz + (Math.random()-0.48) * 2, 0, 180);
        simEl = constrain(simEl + (Math.random()-0.52) * 1, 0, 90);
        processServoRow({ created_at: now3.toISOString(), azimuth: simAz, elevation: simEl }, true);
    }, 3000);
}

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function setEl(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}
function setElAnimate(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.textContent !== val) {
        el.textContent = val;
        el.style.transition = 'color 0.3s';
        el.style.color = 'var(--green)';
        setTimeout(() => { el.style.color = ''; }, 600);
    }
}
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}
function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDateLabel(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}
function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function constrain(v, min, max) { return Math.min(max, Math.max(min, v)); }

// Start
document.addEventListener('DOMContentLoaded', init);
