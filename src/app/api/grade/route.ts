import { NextRequest, NextResponse } from "next/server";
import { GradingRequest, GradingResult } from "@/types/grading";
import { callGeminiJson } from "@/lib/gemini";

export const maxDuration = 60;

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
    } = body;

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

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");

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

Kembalikan respon HANYA dalam format JSON valid tanpa tanda markdown:
{
  "studentTranscription": "Teks bahasa Arab digital hasil pembacaan tulisan tangan siswa",
  "transcriptionConfidence": "high",
  "studentTranslation": "Terjemahan bahasa Indonesia dari tulisan siswa",
  "score": 85,
  "maxScore": ${maxScore},
  "status": "CORRECT",
  "isCoreMeaningMatched": true,
  "semanticAnalysis": {
    "coreArgumentEvaluation": "Penjelasan mengapa inti argumen dinilai sesuai atau tidak",
    "differencesWithKey": "Perbedaan redaksi antara tulisan siswa dan kunci guru",
    "synonymNotes": "Catatan penggunaan sinonim kata jika ada"
  },
  "harakatEvaluation": {
    "ruleApplied": "${harakatRule}",
    "status": "sesuai",
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

    const result = await callGeminiJson<GradingResult>(
      systemPrompt,
      [{ mimeType: imageMimeType, data: cleanBase64 }]
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Grading API error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan server internal." },
      { status: 500 }
    );
  }
}
