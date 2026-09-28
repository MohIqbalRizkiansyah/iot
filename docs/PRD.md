# 📋 Dokumen Spesifikasi Kebutuhan Produk (PRD - Product Requirements Document)
Dokumen ini adalah landasan permenufakturan proyek yang menjadi acuan final untuk mengukur fitur, batasan, kualitas dan kesuksesan *Tugas Akhir: Sistem Pelacak Surya Dua Sumbu Berbasis IoT*.

---

## 1. Ikhtisar & Visi (Product Vision)
**Misi Produk:** Menciptakan mekanisme penangkapan pancaran surya secara dinamis (mengikuti matahari) dengan tingkat keakuratan optimal berbasis sistem kendali kecerdasan logika tidak pasti (*Fuzzy Logic Controller*), serta merangkap seluruh aliran datanya ke dalam satu Pusat Komando Digital (Dashboard) berstandar profesional.

Dashboard ini tak hanya menunjukkan status, namun dapat menyerap ratusan rekaman harian (historis data telemetri), meringkas metrik efisiensi secara visual, yang kelak menjadi inti pokok bukti *pengujian* pada laporan akademis.

---

## 2. Peta Kasus Penggunaan (Feature Matrix & Flow)

### 2.1 Domain Pemantauan (*Live Telemetry Panel*)
Mewajibkan tingkat latensi (keterlambatan) semaksimal mungkin 2 detik langsung dari wujud perangkat keras ke tampilan layar pengguna.
**Spesifikasi Kritis:**
- **Indikator Kesehatan Nadi (Heartbeat):** Menampilkan tulisan "ESP32 ONLINE" berwarna hijau neon dengan teks stempel jejak waktu "Terakhir terlihat" (last seen) hingga akurasi milidetik untuk mencegah ilusi data palsu saat konektivitas tumbang.
- **Kartu Indikator Performa (KPI Cards):** Empat bongkah nilai paling vital (Tegangan Panel, Arus Ampere Aktual, Daya Ekstraksi Sesaat, dan Akumulasi Kantung Energi Harian (Wh)).
- **Dasbor Cuaca Temporal:** Sistem melakukan panggilan HTTP ke Layanan `Open-Meteo API` berdasarkan koordinat geografis penempatan alat. Menampilkan cuaca aktual (Cerah/Hujan/Mendung) sebagai parameter rujukan mengapa daya yang dihasilkan alat sedang fluktuatif (naik-turun).
- **Penampang Transparansi Fuzzy:** Memberikan visualisasi langsung terhadap parameter input Fuzzy, meniadakan "kotak hitam" *(black-box)* algoritma. Membeberkan langsung seberapa besar *Error Horizontal* dan *Vertical* (selisih cahaya) yang dihadapi otak ESP32 per metrik detiknya.

### 2.2 Domain Ekstraksi Historis (*Time-Series Dashboard*)
Halaman arsip ini bertujuan murni untuk kapabilitas Analitik dan penyusunan lampiran Skripsi (Mencakup penarikan mundur 14 Hari Data).
**Spesifikasi Kritis:**
- **Deret Grafik Balok 14 Hari (Daily Energy Bar):** Menampilkan perbandingan performa hari ke hari alat ini dalam menjaring energi. Batang grafik bisa ditekan (*interactable*).
- **Rincian Lintas-Waktu per Harinya:** Saat salah satu balok hari ditekan, UI berekspansi memunculkan rekapitulasi 24 Jam. Menampilkan Metrik Komparasi (Rata-rata Tegangan, Puncak Tertinggi Daya hari tersebut, Daya Minimal, dll).
- **Ekspor Dokumen Baku (*CSV Extraction*):** Menekan tombol ekspor akan mengonversi memori seluruh tabel tanggal yang dipilih menjadi wujud *Comma-Separated Values (.csv)* ter-format sesuai tata tulis standar agar dapat dimuat dan diukur kembali di Microsoft Excel atau SPSS secara *copy-paste* langsung.

### 2.3 Domain Kendali Titah Fisik (*Override Control Mechanism*)
Kemampuan memaksa motor Servo berbelok tanpa menghiraukan respon sensor alam LDR.
**Spesifikasi Kritis:**
- **Sinkronisasi Posisi Antrian (Command Queueing):** Jika website menyuntikkan angka rotasi X dan Y namun konektivitas ESP32 terputus, perintah tersebut dimasukkan ke dalam pangkalan persinggahan (`system_commands`).
- **Resiliensi Pengulangan:** Segera setelah WiFi perangkat terbangun dari padam, ia memindai antrian perintah terbaru yang status *Is_Executed* nya ber-label `False`.
- **Penghentian Otomatis:** Sistem mikrokontroler diamanatkan secara mutlak setelah ia bermanuver, WAJIB membunyikan bel balik ke *Backend* agar mem-vonis perintah tersebut dengan status Selesai (`True`).

---

## 3. SLA dan Kriteria Toleransi Cacat Non-Fungsional (NFR)
Untuk kelayakan sidang kelulusan akhir, alat harus mematuhi batasan kualitas mekanis dan arsitektural berikut ini:

1.  **Ketahanan Hilang Sinyal (Auto-healing Recovery):** Jikalau WiFi *(hotspot)* penguji dimatikan dan dihidupkan ulang selama alat berpelacak, kode alat di `main.cpp` harus sanggup melakukan siklus *Auto-Ping Reconnect* tanpa harus mencabut fisik aliran listrik (*reset* manual) pada perangkat mikrokontrolernya.
2.  **Kelembutan Beban Komputasi Grafis (Client Memory Tolerances):** Mesin *render* batas muka (`Chart.js`) dilarang menahan *memory leak* (kebocoran ingatan) hingga peramban (*Chrome/Edge*) ter- *freeze*. Titik-titik usang (terlampau tua / lebih dari >100 deret waktu dalam halaman Harian) akan digulir *(sliding window / array slicing)* atau di kompres secara perbandingan sebelum dikirim ke grafik.
3.  **Toleransi Kepresisian Pelacakan (Mechanical Sensitivities):** 
    - Derajat toleransi nilai *Error* antara kutub Kiri dan Kanan pada kondisi siang terik tidak boleh melebihi `< 2 derajat` jeda simpangan. 
    - Jikalau hari terlampau mendung / gelap tanpa surya, alat dituntut merelakan pergerakan (terkunci mematung di posisi terakhir) untuk menghemat drainase arus baterai terhadap Motor Servo.

---
**TANDA TANGAN PENYETUJUAN DOKUMENTASI PROYEK**
Dokumen ini disahkan sebagai pedoman pengerjaan penuh dari awal iterasi mekanik hingga penghujung pengujian perangkat lunak sistem.
