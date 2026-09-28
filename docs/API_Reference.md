# 📖 Referensi Antarmuka Pemrograman Aplikasi (API Reference)
Dokumen ini menguraikan spesifikasi kontrak JSON (JSON Payload Contract) yang digunakan oleh *Firmware* perangkat (ESP32) untuk berkomunikasi secara aman dengan *Server* Node.js melalui protokol HTTP/REST.

---

## 1. Otentikasi (Keamanan Lapisan Edge)
Setiap permintaan ke rute awalan `/api/*` dilindungi middleware keamanan internal. 
Untuk mendapatkan izin akses, seluruh perangkat keras pengirim **wajib** mencantumkan kunci rahasia pada *Headernya*. Jika lolos, barulah proses iterasi data diproses ke *Database*.

*   **Header Wajib:** `x-api-key`
*   **Contoh:** `x-api-key: arduino_solar_tracker_key`
*   **Respons Gagal:** HTTP 401 `{"success": false, "error": "Akses Ditolak: API Key tidak valid"}`

---

## 2. Endpoint: Pengiriman Telemetri Cerdas (`/api/sensor`)
Jalur khusus untuk menampung kondisi cuaca optik dan pasokan perlistrikan.
*   **Method:** `POST`
*   **Data Tipe (Content-Type):** `application/json`

**Contoh Beban Data yang Dikirim (Request Payload):**
```json
{
    "ldr_tl": 2400,
    "ldr_tr": 2350,
    "ldr_bl": 2800,
    "ldr_br": 2700,
    "voltage": 12.5,
    "current": 1500,
    "capacity": 50.0,
    "fuzzy_dh": -1.25,
    "fuzzy_dv": 0.80,
    "temperature": 32.5,
    "humidity": 65.0
}
```
*Catatan Sisi Server: Server akan memproses "power" secara mandiri lewat perkalian (voltage × current/1000). Field `temperature`, `humidity`, `fuzzy_dh`, dan `fuzzy_dv` bersifat opsional — jika kolom belum ada di database, server akan mencoba menyimpan data inti tanpa menggagalkan request.*

**Respons Suksess (HTTP 200):**
```json
{ 
    "success": true, 
    "message": "Sensor data saved" 
}
```

---

## 3. Endpoint: Posisi Trajektori Papan Surya (`/api/servo`)
Dipisah dari Payload Sensor agar arsip data lintasan motor tidak membebani database jika dikirim terlalu intens dalam hitungan pecahan detik.
*   **Method:** `POST`

**Request Payload:**
```json
{
    "azimuth": 95,
    "elevation": 45
}
```

---

## 4. Endpoint: Polling Perintah Eksternal (`/api/command`)
Endpoint ini ditelepon (GET) oleh perangkat ESP32 setiap jeda paruh waktu (secara kontinyu) untuk bertanya kepada pelayan: *Adakah perintah paksa dari Operator Dashboard?*
*   **Method:** `GET`
*   **Request Params:** Tidak Ada

**Respons Sukses (Ada Perintah Antrian - HTTP 200):**
```json
{
    "success": true,
    "command": {
        "id": "a9c2b4d1-87z0-...",
        "command_type": "manual",
        "payload": {
            "azimuth": 120,
            "elevation": 90
        }
    }
}
```

**Respons Sukses (Antrian Kosong - HTTP 200):**
```json
{
    "success": true,
    "command": null
}
```

---

## 5. Endpoint: Pelaporan Perintah Tertunaikan (`/api/command/mark-executed`)
Melawan jebakan infinite-loop; dipanggil tepat setelah sumbu poros motor selesai terputir secara manual.
*   **Method:** `POST`

**Request Payload:**
```json
{
    "command_id": "a9c2b4d1-87z0-..."
}
```
**Respons Sukses (HTTP 200):**
```json
{ "success": true }
```

---

## 6. Endpoint: Pengujian Detak Jantung (`/api/health`)
Guna memvalidasi di awal setup alat, apakah relai Server → Database (Supabase) berhasil terjadi tanpa kecelakaan (crash).
*   **Method:** `GET`
*   **Respons Sukses (HTTP 200):** `{"success": true, "message": "Backend & Supabase Online"}` 
*   **Respons Gagal (HTTP 500):** `{"success": false, "error": "Database disconnected"}`
