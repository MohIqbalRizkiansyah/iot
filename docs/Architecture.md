# 🏗️ Arsitektur Sistem Komprehensif (System Architecture)
Dokumen ini mendeskripsikan rancang bangun topologi jaringan, distribusi *layer*, aliran data, dan keputusan teknis di balik sistem **Dual Axis Solar Tracker IoT**. Struktur ini dirancang spesifik untuk ketahanan (resilience), latensi rendah, dan pemantauan jarak jauh secara wajik waktu (*Real-Time*).

---

## 1. Topologi End-to-End (High-Level Topology)
```text
[ ENERGI MATAHARI ]
       │ (Menerangi 4 Kuadran)
       ▼
 ┌─────────────────────┐                   ┌──────────────────────┐
 │   HARDWARE LAYER    │                   │   DATABASE LAYER     │ (Supabase / PostgreSQL)
 │  (ESP32-S2 Node)    │                   │                      │
 │                     │    HTTP/REST      │  - sensor_readings   │
 │ - LDR Sensors (4x)  ├───────────────────►  - servo_positions   │
 │ - INA219 (Tegangan) │  JSON Payloads    │  - system_commands   │
 │ - Motor Servo (2x)  │                   └──────────┬───────────┘
 └─────────▲───────────┘                              │ 
           │ (Polling /api/command)                   │ WebSocket (Supabase Realtime)
           │                                          │ postgres_changes (INSERT events)
 ┌─────────┴───────────┐                              ▼
 │    BACKEND LAYER    │                   ┌──────────────────────┐
 │ (Node.js/Express)   │                   │   FRONTEND LAYER     │ (Vite + Vanilla JS)
 │                     │                   │                      │
 │ - API Gateway       │                   │ - Realtime IoT Page  │
 │ - Auth Middleware   │                   │ - Analytics Dashboard│
 │ - Data Validator    │                   │ - Chart.js Engine    │
 └─────────────────────┘                   └──────────────────────┘
```

---

## 2. Rincian Layering & Komponen Terdistribusi

### A. Hardware (Edge & Sensing Layer)
Berada di fisik perangkat (Taman/Atap). Menangani sensing lokal dan koreksi pergerakan fisik.
*   **Mikrokontroler:** ESP32-S2 (Single-core Xtensa LX7). Dipilih karena ketersediaan pin ADC beresolusi tinggi dan kapabilitas native Wi-Fi.
*   **Sensor Cahaya (LDR):** Terhubung ke ADC (Analog-to-Digital Converter) via Voltage Divider. 
*   **Algoritma Kontrol Sentral:** Menggunakan pendekatan **Differential Threshold Logic**.
    *   `Error Horizontal (dH) = Rata-rata Kiri - Rata-rata Kanan`
    *   `Error Vertikal (dV) = Rata-rata Atas - Rata-rata Bawah`
    *   PWM dikirim ke Servo hanya jika threshold dilewati (mencegah osilasi servo / *jittering* berlebihan).
*   **Protokol Komunikasi:** Menggunakan `HTTPClient` (Protokol HTTP 1.1) secara sinkron setiap 500ms. Library `ArduinoJson v7` bekerja menyusun *payload* `application/json`.

### B. Backend (Middleman / API Gateway Layer)
Berfungsi menjembatani dunia *Hardware* dan *Warehouse Database* dengan prinsip *stateless*.
*   **Stack:** Node.js + Express.js dengan module sistem ES6.
*   **Security (Otentikasi Edge):** Menerapkan perlindungan berlapis di mana ESP32 wajib membawa *header* `x-api-key`. Middleware `requireApiKey` memblokir pengajuan data liar jika string tidak *match* dengan `HARDWARE_API_KEY`.
*   **Manajemen Tugas:**
    *   `/api/sensor`: Mencegat data Sensor Tegangan, Arus, Cuaca, lalu diinjeksikan ke tabel `sensor_readings`. Menanggulangi kekosongan (NULL handling) dengan kalkulasi daya manual `Power = V * I`.
    *   `/api/servo`: Memverifikasi koordinat sudut servo untuk analitik.
    *   `/api/command`: Endpoint *Polling* khusus ESP32 guna mendengarkan jika ada perintah "Manual Override" dari *Dashboard*.
    *   `/api/command/mark-executed`: Mewajibkan ESP32 mengkonfirmasi "Tugas Selesai", untuk memecah *infinite loop* perintah manual.

### C. Database (Storage & Pub/Sub Layer)
*   **Platform:** Supabase (Database PostgreSQL yang dilengkapi PostgREST API).
*   **Arsitektur Penyimpanan:**
    *   `sensor_readings`: Skema *time-series* untuk pencatatan jejak daya historis mentah (raw log).
    *   `servo_positions`: Mencatat lintasan pelacakan (Tracker Trajectory) untuk evaluasi efisiensi mekanik.
*   **Row Level Security (RLS):** Secara default akses penulisan (INSERT/UPDATE) diblokir dari luar, HANYA diizinkan via kapabilitas "Service Role Key" dari *Backend* Express.js.
*   **Supabase Realtime (Pub/Sub):** Mengaktifkan *publication* untuk perubahan pada tabel. Ini mendelegasikan tugas *streaming data* langsung dari Supabase ke *Browser Client* tanpa membebani *Backend* Node.js.

### D. Frontend (Presentation & Analytics Layer)
*   **Build Tool:** Vite (menjamin waktu parsel *bundling* ultra-cepat).
*   **Library Fokus:** `Chart.js` via HTML5 `<canvas>` untuk mengakomodasi pe-render-an grafik ratusan titik data tanpa memberatkan CPU.
*   **Data Consumption:**
    1.  *Bootstrapping:* Mengambil data historis (`SELECT` via API) saat memuat ulang halaman (*on-load*).
    2.  *Live Feeding:* Menggunakan `Realtime Channel` dari perpustakaan `@supabase/supabase-js` untuk mendengarkan *event* `INSERT`.
*   **Reaktivitas (Reactivity):** Menggunakan DOM Manipulation secara natif (Vanilla JS) demi efisiensi, tanpa overhead dari *Virtual DOM* (seperti React/Vue).

---

## 3. Data Flow Diagram (DFD - Interaksi Sinkron/Asinkron)

### DFD Level 1: Pengiriman Telemetri (Normal Operation)
1.  **[ESP32]** membaca tegangan analog (0-4095) di ADC.
2.  **[ESP32]** mengeksekusi logika motor (write PWM).
3.  **[ESP32]** Serialization: Menyusun `{ldr_tl: 2400, voltage: 12.4, current: 800}`.
4.  **[ESP32]** POST HTTP request ke **[Backend Node.js]** `/api/sensor` dengan *Header Key*.
5.  **[Backend]** Memvalidasi Key -> Hitung *Power* -> Insert *Postgres Query*.
6.  **[Supabase]** Menulis baris tabel. Memicu *WebSocket Event trigger* (`postgres_changes`).
7.  **[Frontend]** Menerima *Payload Event* via Socket, mengeksekusi `processSensorRow()`, lalu memperbarui GUI dan *Chart.js*.

### DFD Level 2: Eksekusi Override Kendali Manual
1.  **[User]** Menekan tombol rotasi Servo di **[Frontend]**.
2.  **[Frontend]** Insert *Record* ke tabel `system_commands`: `{command_type: 'manual', payload: {azimuth: 45}, is_executed: false}`.
3.  **[ESP32]** Menjalankan rutin tiap 500ms: GET `/api/command`.
4.  **[Backend Node.js]** Mengecek `system_commands`, menemukan perintah baru, merespon ke **[ESP32]**.
5.  **[ESP32]** Parsing perintah, memaksa motor berbelok *(override)*.
6.  **[ESP32]** Memanggil POST `/api/command/mark-executed` membawa `id` tugas.
7.  **[Backend Node.js]** Melakukan operasi Postgres `UPDATE ... SET is_executed = true`.
8.  Siklus *polling* ESP32 berikutnya aman (merespon null).

---

## 4. Keputusan & Desain Keamanan (Security Design)
*   **IoT Edge Isolation:** ESP32 tidak pernah diberi izin langsung mengakses koneksi kredensial ke Database. Titik masuk tunggal dijaga secara ketat oleh Backend Node.js sebagai loket verifikasi (API Gateway Layer).
*   **Read-Only Frontend:** Web Dashboard hanya memiliki kredensial "Anon Key" yang dibatasi oleh RLS untuk operasi baca (SELECT) saja. Hal ini menghilangkan resiko eksekusi modifikasi data (SQL Injection) dari sisi pengguna browser.
