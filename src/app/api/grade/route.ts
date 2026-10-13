import { NextRequest, NextResponse } from "next/server";
import { GradingRequest, GradingResult } from "@/types/grading";

export const maxDuration = 60; // Allow sufficient time for Vision AI on Vercel Pro/Hobby

export async function POST(req: NextRequest) {
  try {
    const body: GradingRequest = await req.json();

    const {
      imageBase64,
      imageMimeType = "image/jpeg",
      questionText = "",
      teacherAnswerKey,
      mode = "semantic_argument",
      harakatRule = "ignore",
      maxScore = 100,
      customApiKey,
    } = body;

    // Prioritas API key: custom key dari user di UI, atau environment variable di server
    const apiKey = customApiKey?.trim() || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "API Key Google Gemini belum dikonfigurasi. Masukkan API Key di pengaturan web atau setel GEMINI_API_KEY di environment variables Vercel.",
        },
        { status: 400 }
      );
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Foto lembar jawaban siswa wajib diunggah." },
        { status: 400 }
      );
    }

    if (!teacherAnswerKey) {
      return NextResponse.json(
        { error: "Kunci jawaban / inti argumen dari guru wajib diisi." },
        { status: 400 }
      );
    }

    // Bersihkan base64 data jika ada prefix data:image/...;base64,
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    const systemPrompt = `
Kamu adalah sistem pakar penilai ujian Bahasa Arab (Muhaqqiq / Pemeriksa Ujian Tulis Tangan Bahasa Arab).
Tugasmu adalah menganalisis foto tulisan tangan siswa berbahasa Arab, mentranskripsikannya secara akurat, dan melakukan penilaian objektif terhadap Kunci Jawaban Guru.

Informasi Ujian:
- Pertanyaan / Soal: ${questionText || "(Tidak disertakan, fokus pada kesesuaian jawaban)"}
- Kunci Jawaban / Inti Argumen Guru: "${teacherAnswerKey}"
- Mode Penilaian: ${
      mode === "semantic_argument"
        ? "PENILAIAN INTI ARGUMEN & MAKNA (ESAI/PEMAHAMAN). Jangan kaku pada susunan kata! Jika siswa menggunakan susunan kalimat berbeda, kata alternatif, atau sinonim sah, TETAPI maksud esensi dan logika argumennya selaras dengan kunci guru, BERIKAN NILAI PENUH atau mendekati penuh."
        : "PENILAIAN KETAT / LITERAL. Nilai berdasarkan kesesuaian kosakata dan susunan kalimat persis dengan kunci guru."
    }
- Aturan Harakat: ${
      harakatRule === "strict_irab"
        ? "KETAT I'RAB & HARAKAT. Periksa ketepatan harakat huruf akhir kata (tata bahasa Nahwu). Berikan penalti skor jika harakat salah."
        : "ABAIKAN HARAKAT. Fokus pada kata dasar dan makna. Jangan kurangi nilai jika siswa tidak menulis harakat lengkap."
    }
- Skor Maksimal: ${maxScore}

Langkah yang WAJIB kamu lakukan:
1. Baca tulisan tangan Arab pada gambar secara teliti. Perhatikan titik huruf (i'jam), lekukan sambung huruf kursif, dan harakat jika ada.
2. Transkripsikan apa adanya teks Arab yang ditulis siswa ke dalam tulisan digital standar.
3. Terjemahkan teks yang ditulis siswa ke bahasa Indonesia.
4. Lakukan evaluasi mendalam:
   - Apakah inti argumen/maksud siswa sudah mencakup substansi kunci guru?
   - Jika redaksi berbeda, jelaskan korelasi maknanya (apakah sinonim, penjelasan alternatif, atau tafsir yang sah).
   - Hitung skor proporsional (0 - ${maxScore}).
5. Berikan feedback yang ramah dan mendidik untuk siswa, serta catatan teknis untuk guru.

Kembalikan respon HANYA dalam format JSON murni (valid JSON tanpa teks pembuka/penutup, tanpa markdown backticks \`\`\`json):
{
  "studentTranscription": "Teks bahasa Arab digital hasil pembacaan tulisan tangan siswa",
  "transcriptionConfidence": "high" | "medium" | "low",
  "studentTranslation": "Terjemahan bahasa Indonesia dari tulisan siswa",
  "score": 85,
  "maxScore": ${maxScore},
  "status": "CORRECT" | "PARTIAL" | "INCORRECT",
  "isCoreMeaningMatched": true,
  "semanticAnalysis": {
    "coreArgumentEvaluation": "Penjelasan mengapa inti argumen dinilai sesuai atau tidak",
    "differencesWithKey": "Perbedaan redaksi antara tulisan siswa dan kunci guru",
    "synonymNotes": "Catatan penggunaan sinonim kata jika ada"
  },
  "harakatEvaluation": {
    "ruleApplied": "${harakatRule}",
    "status": "sesuai" | "ada_kekurangan" | "diabaikan",
    "details": "Evaluasi harakat dan i'rab"
  },
  "rubricBreakdown": [
    {
      "aspect": "Kesesuaian Inti Argumen / Makna",
      "score": 50,
      "maxScore": 50,
      "comment": "Komentar komponen argumen"
    },
    {
      "aspect": "Kelengkapan Gagasan",
      "score": 30,
      "maxScore": 30,
      "comment": "Komentar kelengkapan ide"
    },
    {
      "aspect": "Kaidah Bahasa & Keterbacaan",
      "score": 20,
      "maxScore": 20,
      "comment": "Komentar kaidah bahasa Arab"
    }
  ],
  "teacherNotes": "Catatan ringkas untuk guru pemeriksa",
  "studentFeedback": "Catatan dan saran apresiatif untuk siswa"
}
`;

    // Coba model multimodal: prioritaskan gemini-2.5-flash, fallback ke gemini-2.0-flash / gemini-1.5-flash
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];

    let lastError: any = null;
    let resultJson: GradingResult | null = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: systemPrompt,
                    },
                    {
                      inline_data: {
                        mime_type: imageMimeType,
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1, // Rendah agar evaluasi konsisten & objektif
                response_mime_type: "application/json",
              },
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.text();
          console.warn(`Model ${modelName} failed with:`, errData);
          lastError = new Error(`Gemini API (${modelName}) error: ${errData}`);
          continue; // coba model berikutnya
        }

        const data = await response.json();
        const candidateText =
          data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!candidateText) {
          throw new Error("Respon kosong dari AI model.");
        }

        // Parse JSON
        const cleanedText = candidateText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        resultJson = JSON.parse(cleanedText);
        break; // Berhasil! Keluar dari loop model
      } catch (err: any) {
        console.warn(`Attempt with ${modelName} encountered error:`, err);
        lastError = err;
      }
    }

    if (!resultJson) {
      return NextResponse.json(
        {
          error:
            lastError?.message ||
            "Gagal memproses gambar ujian dengan AI. Pastikan format gambar valid dan API Key aktif.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(resultJson);
  } catch (error: any) {
    console.error("Grading API error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan server internal." },
      { status: 500 }
    );
  }
}
