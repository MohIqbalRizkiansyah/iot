# 🔧 Panduan Komprehensif Perakitan Hardware (Dual Axis Solar Tracker)

Dokumen ini adalah panduan teknis mendetail langkah demi langkah untuk merakit fisik alat pelacak matahari ganda (*Dual Axis Solar Tracker*) yang telah terintegrasi dengan pengiriman data IoT ESP32.

---

## 1. Daftar Komponen Utama (Bill of Materials)

Sebelum merakit, pastikan Anda telah menyiapkan seluruh komponen berikut:
- **Mikrokontroler:** 1x ESP32 (Dalam kode digunakan NodeMCU ESP32-S2 / varian Feather).
- **Aktuator:** 2x Motor Servo (Sangat disarankan menggunakan **MG996R** atau servo metal gear yang kuat untuk menahan beban panel. Jika panel sangat kecil, SG90 bisa digunakan).
- **Sensor Cahaya:** 4x LDR (Light Dependent Resistor).
- **Komponen Pasif:** 4x Resistor 10k Ω (Wajib digunakan untuk membuat *Voltage Divider* sensor LDR).
- **Sensor Daya:** 1x Sensor Arus & Tegangan **INA219** (Opsional/Tahap Lanjut: Untuk membaca Arus, Tegangan, dan Daya panel surya ke *database*).
- **Catu Daya (Power):** 
  - Adaptor / Step Down Module (misal LM2596) *atau* Baterai Lipo terpisah.
- **Lain-lain:** Breadboard, Kabel Jumper (Male-Female, Male-Male), Akrilik/Kayu untuk kerangka, dan Sekat Hitam untuk LDR.

---

## 2. Pemetaan Pin (Detail Wiring Pinout)

Berdasarkan *firmware* `main.cpp`, berikut adalah colokan (pin) yang ditarik dari ESP32 menuju ke komponen-komponen:

### A. Konfigurasi 4 Sensor LDR (Input Analog)
LDR mendeteksi sisi mana yang paling terang posisinya.
| Posisi Sensor LDR | Warna Kabel (Saran) | Pin ESP32 (Analog) |
| :--- | :--- | :--- |
| **Kiri Atas (Top Left)** | Putih | **Pin 34** |
| **Kanan Atas (Top Right)** | Kuning | **Pin 35** |
| **Kiri Bawah (Bottom Left)** | Biru | **Pin 32** |
| **Kanan Bawah (Bottom Right)** | Hijau | **Pin 33** |

> [!NOTE]
> **Cara Merangkai LDR (Rumus Pembagi Tegangan):**
> 1. Sambungkan Kaki-1 Semua LDR menjadi satu, lalu hubungkan ke **Pin 3V3 ESP32**.
> 2. Kaki-2 LDR disambungkan dengan Resistor 10k Ω.
> 3. Kaki Resistor 10k Ω yang ujung satunya lagi dikumpulkan jadi satu lalu dihubungkan ke **GND ESP32**.
> 4. Tarik kabel jumper tepat **di tengah-tengah / di antara** Kaki-2 LDR dan Resistor tadi. Kabel tengah inilah yang dicolokkan ke pin 34, 35, 32, 33 ESP32.

### B. Konfigurasi Aktuator Motor Servo (Output PWM)
| Posisi Motor Servo | Fungsi | Kabel Data/Sinyal | Pin ESP32 |
| :--- | :--- | :--- | :--- |
| **Servo Azimuth** | Memutar Base Bawah Kiri-Kanan | Kuning / Oranye | **Pin 13** |
| **Servo Elevasi** | Menekuk Panel Naik-Turun | Kuning / Oranye | **Pin 12** |

> [!CAUTION]
> **ATURAN WAJIB SUMBER DAYA MOTOR SERVO:**
> Jangan **PERNAH** mencolokkan Kabel Power VCC Motor Servo (Kabel Merah) secara langsung ke Pin 5V (VIN) atau 3V3 di papan ESP32 Anda. Menarik arus beban motor dari papan ESP32 secara langsung beresiko 99% membuat ESP32 berkedip mati (*brownout*), *restart* sendiri (nge-hang), alat diam mematung, atau papan ESP lenyap terbakar.
> 
> **Cara yang Benar:** Kabel Merah servo dihubungkan ke Sumber Daya Eksternal 5V (Minimal 2 Ampere / dari modul LM2596 atau baterai). 

> [!IMPORTANT]
> **GND (Common Ground) Wajib Disatukan:**
> Jika Anda memakai Power Eksternal, Anda **WAJIB** menghubungkan kabel kutub negatif (GND / Kabel Hitam) Baterai Eksternal dengan kutub negatif (GND) si ESP32 dengan sehelai kabel. Sistem tidak akan pernah bergerak jika *Ground* ini lupa disatukan.

---

## 3. Perakitan Desain Fisik (Langkah demi Langkah)

### Langkah 1: Merakit *Base* & Servo Azimuth
1. Pasang servo Azimuth tegak lurus sejajar dengan tanah / lantai mendatar (*Base* bawah).
2. Hubungkan rangka atas pada lengan (*horn*) Servo Azimuth. Servo ini nanti akan membanting sistem ke kiri atau ke kanan mengikuti lintasan sinar mentari harian (Timur ke Barat).

### Langkah 2: Merakit Sendi Elevasi & Panel Surya
1. Di atas sendi rangka Azimuth, paku/tempel Motor Servo Elevasi dalam posisi mendatar.
2. Hubungkan papan dasar panel surya pada lengan Servo Elevasi ini, sehingga lengan ini dapat menaik-turunkan (mendongakkan) panel.
3. Kencangkan atau rekatkan Panel Surya pada papan tersebut.

### Langkah 3: Membuat Cangkang Penutup (Sekat LDR)
Ini rahasia inti dari Solar Tracker, tanpa penyekat bayangan, alat LDR Anda buta alias tak merespon dengan masuk akal.
1. Potong sebuah kardus, impraboard, balsa, atau pakai balok 3D Print, silangkan berbentuk tanda **Tambang / Plus (+)** layaknya penunjuk arah mata angin. Buat agak tinggi (sekitar 2-4 cm dari dasar alas).
2. Letakkan 4 LDR menempel rata di 4 sudut pojokan lantai yang dipisahkan oleh sekat plus (+) tersebut. 
3. *Logikanya:* Jika sinar datang dari arah serong, dinding sekat plus ini akan membuat sebuah siluet panjang bayangan dan menutupi sebagian lensa LDR di belakangnya. Sensor belakang ini akan membaca nilai redup, memicu ESP32 berputar mencari sumber mentari baru tempat keempat sensor ini tidak ada yang disinggahi bayangan.

### Langkah 4: Penyambungan Kabel (Wiring)
1. Sambungkan kabel LDR seperti yang dipandu pada Tabel diatas.
2. Sambungkan kabel Data 2 Motor Servo ke ESP32.
3. (Tahap selanjutnya): Sambung pin Data SDA&SCL I2C INA219 ke panel surya (kabel panel masuk ke `Vin+ / Vin-` rangkaian).

### Langkah 5: Kalibrasi Pertama 
1. *Upload* program ESP32. Setel WiFi Hostspot dengan benar. 
2. Ambil **Senter HP**. 
3. Sorot lampu miring dari kanan atas LDR, motor harus berputar secara perlahan seolah menatap / mencari letak Senter. Jika saat disenter dari kanan panel malah membuang layar ke sebelah Kiri, Anda harus mencabut dan menukar colokan kabel data/jumper di Pin 34, 35, 32, 33 di atas hingga arah pergerakan naluriahnya merespon wajar dan harmonis.

---
**Akhir Panduan Hardware**
Selamat merakit! Uji setiap pergerakan modul dengan teliti. Pantau terus *Log Konsol* serial monitor di Laptop dan juga *Database* untuk memastikan parameter berjalan normal.
