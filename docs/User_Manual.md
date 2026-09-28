# 📘 Buku Panduan Pengoperasian Alat (User Manual)

Dokumen ini mendemontrasikan cara cepat mengaktifkan sistem **Dual Axis Solar Tracker** dan cara menguasai antarmuka *Dashboard* bagaikan seorang teknisi ahli.

---

## 1. Menghidupkan Mesin (Cara Menjalankan Sistem Ekosistem)

Pastikan semua persyaratan *(Hardware sudah beraliran, Node.js dan Vite sudah terinstall di PC)* terpenuhi sebelum bergerak. 

1. **Jalankan Terminal 1 (Otak Server):**
   * Buka Terminal, arahkan (cd) ke dalam folder `iot/backend`.
   * Ketik: `npm install` (cukup sekalik saja jika baru awal) lalu diikuti **`node server.js`**.
   * Pastikan layar terminal merespon *"IoT Backend running..."*.

2. **Jalankan Terminal 2 (Kanvas Tampilan):**
   * Buka Terminal baru, arahkan (cd) ke dalam folder `iot/frontend`.
   * Ketik: `npm install` lalu jalankan **`npm run dev`**.
   * Panel antarmuka akan hidup dan dapat ditekan dengan klik tautan *Localhost* di terminal (biasanya `http://localhost:5173`).

3. **Injeksi Perangkat Listrik:**
   * Colokkan kabel daya USB sistem *Tracker ESP32-S2* menancap ke lubang asupan listrik.
   * Amati indikator (titik putih status DOT) di ujung kiri atas *Monitoring Layout* berubah dari Keabu-abuan (OFFLINE) ➡️ Hijau Cerah Mengedip (ONLINE).

---

## 2. Pemandu Tatap Muka (Membaca Halaman 'REALTIME IOT')

Panel utama untuk operasi masa-kini. Jika mata melihat halaman ini, grafik akan bergerak tiap detik tanpa kedip layar utuh.

*   **Pita Cuaca (Weather Badge):** Mengambil rekap cuaca Open-Meteo di Jakarta. Jika suhu mendingin (Hujan/Berawan), biasanya grafik Produksi Daya (Daya W & Tegangan V) akan menukik layu seketika.
*   **Gauges Elevasi & Azimuth:** Tiga cincin bulat bercahaya layaknya kompas analog. Mengikuti ke sudut presisi kemana badan robotik menatap dewa matahari. 
*   **Panel Logika Pengontrol Otak (Fuzzy Output):** Jangan panik jika grafik balok berwarna ini bergeser panjang. Ini membuktikan ESP32 pusing mencari arah pantul yang benar (Error Horisontal dH dan dV). Idealnya, balok ini nyaris rata jika alat sudah lurus menatap Cahaya. 

---

## 3. Menghakimi Masa Lalu (Membaca Halaman 'DASHBOARD ANALITIK')

Tab `DASHBOARD` menjejal arsip perjalanan selama kurun 14 Kancah (Hari) terakhir. Mode pilar pengawasan. 

*   **14-Days Bar Chart (Batang Tegak Emas Tua):** Melambangkan jejak panen kumulatif energi `Wh` tiap satu hari bulat. Batang akan meninggi ke angkasa di siang bolong nan terik, dan mengempis di hari hujan badai.
*   **Interaksi Ketuk (Click Details):** Anda BISA MENYENTUH (KLIK) setiap Batang (Bar) Hari Tersebut! Mengusap salah satu batang akan menyihir barisan data dan layar bawah terganti menceritakan "apa yang sebenarnya terjadi pada hari tersebut". (Maks dan Min kekuatan Puncak Panel).

---

## 4. Ekspor Berkas Mentah (Ekstraksi CSV)

Apabila alat sedang dihakimi (sedang masuk sesi Pengujian Laporan Akhir), Anda dituntut mencetak hasil pergerakaan mesin di atas kertas.
1. Carilah tombol bersimbol Unduh Panah-Bawah (Export CSV) di sudut kanan atas layar per Tab Panel.
2. Saat diklik, sistem mengekspor dan menyimpan pangkasan Tabel berformat MS Excel rapi ke memori Laptop / Diska Anda seketika (mengandung Timestamp, Daya V, I, Elevasi).

---

*Penutup Panduan, simpan dokumen ini sebagai penuntun jalannya presentasi perangkat.*
