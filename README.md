# Tashih Arabi (تصحيح) — Sistem Koreksi Ujian Bahasa Arab Tulis Tangan

Aplikasi web modern berbasis **React / Next.js** yang dirancang untuk mengoreksi ujian Bahasa Arab tulis tangan secara otomatis menggunakan AI Multimodal Vision (Google Gemini) dengan pendekatan **Penilaian Semantik Inti Argumen (Semantic / Core Meaning Evaluation)**.

---

## 🌟 Fitur Utama

1. **Pengenalan Tulisan Tangan Arab (Vision HTR)**:
   - Membaca foto tulisan tangan siswa (kamera HP / scan berkas) menggunakan model Vision AI canggih.
   - Mengubah tulisan tangan kursif Arab ke teks digital standar beserta harakatnya.
2. **Penilaian Berbasis Inti Argumen (Semantic / Meaning-Based)**:
   - Tidak kaku pada susunan kata perkata. Jika redaksi siswa berbeda atau menggunakan sinonim sah namun **esensi argumennya sama dengan kunci guru**, siswa mendapatkan nilai penuh/mendekati penuh.
   - Pilihan mode: **Inti Argumen & Makna** (untuk esai/pemahaman) vs **Ketat/Literal** (untuk hafalan/rumus).
3. **Fleksibilitas Aturan Harakat (I'rab)**:
   - Opsi *Abaikan Harakat* (fokus makna) atau *Ketat I'rab* (memeriksa ketelitian tata bahasa Nahwu pada huruf akhir kata).
4. **Input Fleksibel**:
   - Upload file foto lembar ujian (JPG, PNG, WebP).
   - Kanvas Coret Digital interaktif: Anda atau siswa bisa menulis Arab langsung di layar dengan mouse/stylus/jari.
   - Dilengkapi **3 Kasus Sampel Uji Coba Siap Pakai** (1-klik langsung tes).
5. **Output Lengkap & Terstruktur**:
   - Transkripsi digital teks Arab siswa.
   - Terjemahan bahasa Indonesia.
   - Nilai akhir (0 - 100) dan status (Benar Penuh / Benar Sebagian / Belum Tepat).
   - Analisis mendalam alasan penilaian dan catatan sinonim.
   - Rincian rubrik komponen nilai.
   - Saran umpan balik untuk siswa dan fitur cetak laporan / PDF.

---

## 🚀 Panduan Deploy ke Vercel (1 Menit)

Aplikasi ini sudah **100% Vercel Ready** tanpa konfigurasi tambahan:

### Langkah 1: Push ke GitHub / GitLab
```bash
git add .
git commit -m "feat: initial commit tashih arabi"
git push origin main
```

### Langkah 2: Import ke Vercel
1. Masuk ke [vercel.com](https://vercel.com) dan klik **"Add New Project"**.
2. Pilih repositori GitHub proyek ini.
3. Pada bagian **Environment Variables**, tambahkan:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `API Key Anda dari Google AI Studio` (dapatkan gratis di [aistudio.google.com](https://aistudio.google.com/))
4. Klik **Deploy**. Selesai! Web Anda langsung aktif dan dapat diakses publik.

> *Catatan*: Jika Anda tidak memasukkan environment variable saat deploy, pengguna tetap dapat memasukkan API Key secara mandiri melalui tombol **"Set API Key"** di pojok kanan atas aplikasi.

---

## 💻 Menjalankan di Lokal (Development)

1. Pastikan Node.js (v18+) telah terpasang.
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Buat file `.env.local` dan tambahkan API Key Anda:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
4. Jalankan server lokal:
   ```bash
   npm run dev
   ```
5. Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router), React 19
- **Bahasa**: TypeScript
- **Styling**: Tailwind CSS v4, Google Fonts (Amiri - Tipografi Arab)
- **Icons**: Lucide React
- **AI Engine**: Google Gemini Multimodal Vision API (`gemini-2.5-flash` / `gemini-2.0-flash`)
