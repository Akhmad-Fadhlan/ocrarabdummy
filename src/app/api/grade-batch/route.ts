import { NextRequest, NextResponse } from "next/server";
import { BatchGradingRequest, BatchGradingResult, ExamQuestion } from "@/types/grading";
import { callGeminiJson, extractTextFromDocx } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body: BatchGradingRequest = await req.json();
    const {
      questions,
      studentFileBase64,
      studentFileMimeType,
      studentFileName,
      mode = "semantic_argument",
      harakatRule = "ignore",
      customApiKey,
    } = body;

    const apiKey = customApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key Google Gemini belum diatur. Masukkan API Key di pengaturan web atau setel GEMINI_API_KEY di Vercel." },
        { status: 400 }
      );
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: "Daftar soal dan kunci jawaban dari guru belum tersedia." },
        { status: 400 }
      );
    }

    if (!studentFileBase64) {
      return NextResponse.json(
        { error: "Lembar jawaban siswa (Word, PDF, atau Foto) wajib diunggah." },
        { status: 400 }
      );
    }

    const cleanBase64 = studentFileBase64.replace(/^data:[^;]+;base64,/, "");
    const fileBuffer = Buffer.from(cleanBase64, "base64");

    const isDocx =
      studentFileName?.toLowerCase().endsWith(".docx") ||
      studentFileMimeType?.includes("wordprocessingml") ||
      studentFileMimeType?.includes("docx");

    let textContent = "";
    let fileParts: Array<{ mimeType: string; data: string }> = [];

    if (isDocx) {
      try {
        textContent = await extractTextFromDocx(fileBuffer);
        if (!textContent.trim()) {
          return NextResponse.json(
            { error: "File Word (.docx) lembar jawaban siswa kosong atau tidak dapat diekstrak." },
            { status: 400 }
          );
        }
      } catch (err: any) {
        return NextResponse.json(
          { error: `Gagal membaca file Word siswa: ${err.message}` },
          { status: 400 }
        );
      }
    } else {
      const mime =
        studentFileMimeType ||
        (studentFileName?.toLowerCase().endsWith(".pdf")
          ? "application/pdf"
          : "image/jpeg");
      fileParts = [{ mimeType: mime, data: cleanBase64 }];
    }

    // Format daftar soal & kunci guru
    const questionsContext = questions
      .map(
        (q: ExamQuestion, idx: number) => `
SOAL #${q.number || idx + 1}:
- Pertanyaan: ${q.text}
- Kunci Jawaban / Inti Argumen Guru: "${q.answerKey}"
- Bobot Skor Maksimal: ${q.maxScore} poin
`
      )
      .join("\n-------------------------\n");

    const maxTotalScore = questions.reduce(
      (sum: number, q: ExamQuestion) => sum + (q.maxScore || 0),
      0
    );

    const systemPrompt = `
Kamu adalah sistem pakar penilai ujian Bahasa Arab (Pemeriksa Ujian Berkas Tulis Tangan dan Ketikan Bahasa Arab).
Tugasmu adalah memeriksa lembar jawaban siswa yang diunggah (bisa berupa PDF hasil scan tulisan tangan, dokumen Word, atau foto lembar ujian), mencocokkannya dengan daftar soal dan kunci jawaban dari guru, lalu memberikan penilaian objektif berbasis SEMANTIK / INTI MAKNA.

DAFTAR SOAL & KUNCI JAWABAN DARI GURU:
${questionsContext}

ATURAN PENILAIAN:
- Mode Penilaian: ${
      mode === "semantic_argument"
        ? "PENILAIAN INTI ARGUMEN & MAKNA (ESAI/PEMAHAMAN). JANGAN KAKU PADA SUSUNAN KATA! Jika siswa menggunakan susunan kalimat berbeda, kata alternatif, atau sinonim sah, TETAPI maksud esensi dan logika argumennya selaras dengan kunci guru, BERIKAN NILAI PENUH atau mendekati penuh."
        : "PENILAIAN KETAT / LITERAL. Nilai berdasarkan kesesuaian kosakata dan susunan kalimat persis dengan kunci guru."
    }
- Aturan Harakat: ${
      harakatRule === "strict_irab"
        ? "KETAT I'RAB & HARAKAT. Periksa ketepatan harakat huruf akhir kata (tata bahasa Nahwu). Berikan penalti skor jika harakat salah."
        : "ABAIKAN HARAKAT. Fokus pada kata dasar dan makna esensi. Jangan kurangi nilai jika siswa tidak menulis harakat lengkap."
    }
- Total Skor Maksimal Seluruh Ujian: ${maxTotalScore}

PETUNJUK PEMERIKSAAN PER NOMOR SOAL:
1. Temukan jawaban siswa untuk setiap nomor soal (#1, #2, dst.) pada berkas lembar ujian yang diunggah.
2. Transkripsikan tulisan siswa (Arab digital) apa adanya.
3. Terjemahkan jawaban siswa ke bahasa Indonesia.
4. Evaluasi apakah inti argumen/makna jawaban siswa mencakup substansi kunci jawaban guru:
   - Jika makna/argumen sama persis atau selaras: status "CORRECT", skor penuh.
   - Jika benar sebagian atau kurang lengkap: status "PARTIAL", skor proporsional.
   - Jika salah atau tidak dijawab: status "INCORRECT", skor 0.
5. Jelaskan analisis semantik argumennya dan berikan umpan balik yang membangun untuk siswa.
6. Hitung total skor akhir yang diperoleh siswa beserta rekapitulasi jumlah soal benar, benar sebagian, dan salah.

Kembalikan HANYA format JSON valid tanpa markdown backticks:
{
  "totalScore": 85,
  "maxTotalScore": ${maxTotalScore},
  "percentage": 85,
  "summary": {
    "totalQuestions": ${questions.length},
    "correctCount": 2,
    "partialCount": 1,
    "incorrectCount": 0,
    "overallEvaluation": "Evaluasi keseluruhan performa siswa"
  },
  "questionResults": [
    {
      "questionNumber": 1,
      "questionText": "Teks pertanyaan",
      "teacherKey": "Kunci jawaban guru",
      "maxScore": 20,
      "score": 20,
      "status": "CORRECT",
      "isCoreMeaningMatched": true,
      "studentTranscription": "Teks Arab jawaban siswa",
      "studentTranslation": "Arti jawaban siswa",
      "semanticAnalysis": "Penjelasan mengapa jawaban siswa dinilai benar meskipun redaksi kata berbeda",
      "synonymNotes": "Catatan sinonim jika ada",
      "harakatNotes": "Catatan harakat jika relevan",
      "feedback": "Saran perbaikan untuk nomor ini"
    }
  ]
}
`;

    const gradingResult = await callGeminiJson<BatchGradingResult>(
      apiKey,
      systemPrompt,
      fileParts.length > 0 ? fileParts : undefined,
      textContent
        ? [`Isi teks lembar jawaban siswa dari dokumen Word:\n\n${textContent}`]
        : undefined
    );

    // Pastikan perhitungan persentase tepat
    if (gradingResult.maxTotalScore > 0) {
      gradingResult.percentage = Math.round(
        (gradingResult.totalScore / gradingResult.maxTotalScore) * 100
      );
    }

    return NextResponse.json(gradingResult);
  } catch (error: any) {
    console.error("Batch Grading API error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan saat memeriksa berkas ujian siswa." },
      { status: 500 }
    );
  }
}
