# 🎨 Rencana dan Sistem Desain UI/UX (UI/UX Design System)
Dokumen ini mengkodifikasi standar tata letak, hierarki tipografi, perpaduan palet warna, serta interaksi gerak *(micro-interactions)* untuk Dashboard Monitoring Solar Tracker Anda. Tujuannya adalah menciptakan representasi antarmuka yang sangat profesional, memukau (*wow-factor*), responsif layaknya perangkat lunak kendali industri modern.

---

## 1. Filosofi Desain Inti
Gaya yang dianut adalah **"Glassmorphism dalam Nuansa Industri IoT"**.
*   **Aura Premium (Cyber-Instrument):** Menggabungkan latar belakang mode gelap pekat (*Pitch-Black / Deep Navy*) dengan elemen kartu tembus pandang ber-efek kabur (*frosted-glass blur*). 
*   **Perhatian Terfokus (Focus by Color):** Kebanyakan teks dibuat meredup (*dimmed*), warna-warna seterang neon (*Cyan, Emerald Green, Warning Yellow*) hanya disematkan murni untuk menyorot angka utama, grafik, dan status pergerakan.
*   **Representasi Nyata (Real-World Mapping):** Antarmuka Gauge (Speedometer) dan LDR-Bars didesain sedemikian rupa agar bentuk visualnya semirip mungkin dengan keadaan fisik aktual panel surya, meniadakan beban kognitif pengguna saat membaca data.

---

## 2. Palet Warna (Color Theory)

### Warna Latar (Atmosphere Colors)
- `Background Base (Deep Space)`: **#0a0d14** (Hitam pekat namun tidak buta, merepresentasikan absennya cahaya).
- `Glass Surface`: **rgba(16, 22, 38, 0.85)** (Memberi bentuk visual 'kaca' di atar latar).
- `Card Border`: **rgba(100, 140, 255, 0.08)** normal, **0.15** saat tersentuh mouse (hover).

### Warna Aksen & Indikator Data (Neon Accents)
- `Azimuth & Primary Metrics`: **#00d4ff (Electric Cyan)** 
- `Elevation & System Live Status`: **#00e5a0 (Emerald Green)** 
- `Maximum / Warn Status`: **#f5a623 (Golden Yellow)**
- `Error / Downtime`: **#ff5252 (Alert Red)**

### Warna Tipografi (Text)
- `Primary Value (Data Besar)`: **#e8edf5** (Putih dingin yang lembut di mata).
- `Secondary Label (Unit & Judul)`: **#7a8aaa** (Biru-keabuan redup untuk tidak mengganggu nilai utama).

---

## 3. Sistem Komponen & Anatomi Elemen

### A. Kartu Glassmorphism (Glass Card Base)
```css
.glass-card {
    background: rgba(16, 22, 38, 0.85); /* 85% opacity */
    backdrop-filter: blur(16px);        /* Efek Frosted Glass utama */
    border: 1px solid rgba(100, 140, 255, 0.08); /* Garis batas tipis hologram */
    border-radius: 12px;                /* Sudut ramah/lembut modern */
    transition: all 0.3s ease;          /* Keluesan transisi */
}
/* Efek interaktif mengangkat kartu */
.glass-card:hover {
    transform: translateY(-2px); 
    border-color: rgba(100, 140, 255, 0.15);
}
```

### B. Indikator Sumbu "Gauge" Melingkar (Untuk Posisi Panel)
Didesain menyerupai HUD (Head-Up Display) pada dashboard pesawat jet. Memanfaatkan SVG natif dengan kalkulasi lingkaran matematika asli.
*   **Base Track:** Lingkaran penuh bergaris abu-abu transparan tebal 8px.
*   **Progress Fill:** Lingkaran neon yang menumpuk seiring dengan sudut, dianimasikan memanjang secara dinamis menggunakan properti CSS `stroke-dasharray` dan `stroke-dashoffset`.
*   **Angka Pusat:** Tabular angka derajat yang bergulir instan.

### C. Visualisasi Data (Perilaku Chart.js)
Grafik bukan sekedar garis gundul, melainkan menggunakan tipe *Area Chart* dengan gradien memudar menjuntai ke bagian bawah (X-axis).
*   **Smooth Curves (`tension: 0.4`):** Menggambarkan fluktuasi cuaca/matahari yang selalu mulus (analog), tidak kaku/patah.
*   **Hilangkan Titik Bebas (`pointRadius: 0`):** Titik pada garis hilangkan untuk menjaga tampilan jernih, dan hanya muncul membesar (`radius: 4`) ketika jari/kursor tepat menyorot satu slot waktu.

---

## 4. Mikro-Animasi & Pengalaman Pengguna (Micro-Interactions)
Tugas utama animasi di sini adalah **"berbisik bahwa sistemnya hidup (Live)"**.
1.  **Detak Jantung Alat (Status Dot):** Lingkaran kecil `ONLINE` melakukan efek berkedip bayangan neon (*Pulse Glow Box-Shadow*) terus menerus setiap 2 detik. 
2.  **Flash Update Nilai:** Apabila data tegangan dari ESP32 berubah (contoh: 12.0V menjadi 12.3V), warna teks tersebut akan menyala menjadi *Emerald Green* sesaat (600 milidetik) sebelum memudar kembali ke putih. Menarik mata pengamat langsung ke data penting yang baru saja bergerak.
3.  **Bilah LDR Berjalan:** Empat buah lampu batang indikator sensor cahaya menggunakan properti transisi `width`, sehingga bergerak mulus layaknya air saat cahaya lewat perlahan di atas alat (bukan patah-patah mengejutkan).

---

## 5. Kaidah Responsif (Layout Breakpoints)
Dirancang dengan pendekatan responsif berbasis *CSS Grid* fleksibel agar luwes saat dibuka di monitor pusat kontrol raksasa maupun layar tablet penguji alat.

*   **Layar Lebar (>1024px):** Grid 4 hingga 5 Kolom sejajar rata (Kondisi Ideal).
*   **Tablet / Laptop Kecil (<1024px):** Kartu KPI runtuh terlipat menjadi 3 Kolom sejajar, memastikan angka tidak gencet dan font-size terjaga.
*   **Ponsel Potret (Mobile <768px):** Keseluruhan elemen runtuh tegak lurus menjadi 1 kolom panjang tanpa paksaan mengecilkan (*Squishing*) bentuk komponen. Menu Navigasi disederhanakan dari teks menjadi *Badge Buttons*.
