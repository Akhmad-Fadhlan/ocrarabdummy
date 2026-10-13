import { NextRequest, NextResponse } from "next/server";
import { GradingRequest, GradingResult } from "@/types/grading";

export const maxDuration = 60; // Allow sufficient time for Vision AI on Vercel Pro/Hobby

interface ModelCandidate {
  apiVersion: "v1beta" | "v1";
  modelName: string;
}

// Fungsi cerdas untuk mendeteksi model yang benar-benar aktif untuk API Key ini
async function resolveWorkingModels(apiKey: string): Promise<ModelCandidate[]> {
  const candidates: ModelCandidate[] = [];

  // 1. Coba deteksi via ListModels di v1beta
  try {
    const resBeta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (resBeta.ok) {
      const data = await resBeta.json();
      const models: any[] = data.models || [];
      const supported = models
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""));

      // Urutkan berdasarkan model multimodal terbaik
      const scoreModel = (name: string) => {
        if (name.includes("2.5-flash")) return 100;
        if (name === "gemini-2.0-flash") return 90;
        if (name.includes("2.0-flash")) return 85;
        if (name === "gemini-1.5-flash-latest") return 80;
        if (name === "gemini-1.5-flash") return 75;
        if (name.includes("1.5-flash")) return 70;
        if (name.includes("flash")) return 60;
        if (name.includes("1.5-pro")) return 50;
        if (name.includes("pro")) return 40;
        return 10;
      };

      supported.sort((a, b) => scoreModel(b) - scoreModel(a));

      for (const name of supported) {
        candidates.push({ apiVersion: "v1beta", modelName: name });
      }
    }
  } catch (err) {
    console.warn("Gagal mengecek v1beta ListModels:", err);
  }

  // 2. Coba deteksi via ListModels di v1 (jika v1beta tidak mengembalikan)
  if (candidates.length === 0) {
    try {
      const resV1 = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
      );
      if (resV1.ok) {
        const data = await resV1.json();
        const models: any[] = data.models || [];
        const supported = models
          .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m) => m.name.replace(/^models\//, ""));

        for (const name of supported) {
          candidates.push({ apiVersion: "v1", modelName: name });
        }
      }
    } catch (err) {
      console.warn("Gagal mengecek v1 ListModels:", err);
    }
  }

  // 3. Fallback daftar model umum jika ListModels diblokir/gagal
  if (candidates.length === 0) {
    return [
      { apiVersion: "v1beta", modelName: "gemini-2.0-flash" },
      { apiVersion: "v1beta", modelName: "gemini-1.5-flash-latest" },
      { apiVersion: "v1", modelName: "gemini-1.5-flash" },
      { apiVersion: "v1beta", modelName: "gemini-2.0-flash-exp" },
      { apiVersion: "v1beta", modelName: "gemini-1.5-flash-002" },
      { apiVersion: "v1beta", modelName: "gemini-1.5-pro-latest" },
      { apiVersion: "v1", modelName: "gemini-1.5-pro" },
    ];
  }

  return candidates;
}

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
            "API Key Google Gemini belum diisi. Silakan klik tombol 'Set API Key' di pojok kanan atas atau atur variabel GEMINI_API_KEY di Vercel.",
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

Kembalikan respon HANYA dalam format JSON murni (valid JSON tanpa markdown backticks):
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

    // Deteksi daftar model yang tersedia untuk API key ini
    const availableModels = await resolveWorkingModels(apiKey);
    console.log(
      "Daftar model yang akan dicoba:",
      availableModels.map((m) => `${m.apiVersion}/${m.modelName}`)
    );

    let lastErrorDetails = "";
    let resultJson: GradingResult | null = null;

    for (const { apiVersion, modelName } of availableModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`;

        const payload = {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: systemPrompt,
                },
                {
                  inlineData: {
                    mimeType: imageMimeType,
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        };

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.text();
          console.warn(`Model ${apiVersion}/${modelName} gagal:`, errData);

          // Cek jika API key tidak valid sama sekali
          if (errData.includes("API_KEY_INVALID") || response.status === 400 && errData.includes("key")) {
            return NextResponse.json(
              {
                error:
                  "API Key Google Gemini tidak valid. Harap periksa kembali API Key dari Google AI Studio (https://aistudio.google.com/).",
              },
              { status: 400 }
            );
          }

          lastErrorDetails = errData;
          continue; // coba kandidat model berikutnya
        }

        const data = await response.json();
        const candidateText =
          data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!candidateText) {
          throw new Error("Respon teks kosong dari AI model.");
        }

        // Ekstrak blok JSON dengan aman (mengantisipasi jika ada wrapper markdown ```json)
        const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : candidateText;

        resultJson = JSON.parse(jsonString);
        console.log(`Berhasil dikoreksi menggunakan model: ${apiVersion}/${modelName}`);
        break; // Sukses! Keluar dari perulangan
      } catch (err: any) {
        console.warn(`Percobaan dengan ${apiVersion}/${modelName} error:`, err);
        lastErrorDetails = err.message || String(err);
      }
    }

    if (!resultJson) {
      return NextResponse.json(
        {
          error: `Gagal memproses penilaian dengan AI. Detail error: ${lastErrorDetails || "Model tidak merespon."}`,
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
