import { NextRequest, NextResponse } from "next/server";
import { ExtractSeparateExamRequest, ExtractExamResponse, ExamQuestion } from "@/types/grading";
import { callGeminiJson, extractTextFromDocx } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body: ExtractSeparateExamRequest = await req.json();
    const {
      questionFileBase64,
      questionFileMimeType,
      questionFileName,
      answerKeyFileBase64,
      answerKeyFileMimeType,
      answerKeyFileName,
    } = body;

    if (!questionFileBase64 && !answerKeyFileBase64) {
      return NextResponse.json(
        { error: "Minimal salah satu berkas (Soal atau Kunci Jawaban) harus diunggah." },
        { status: 400 }
      );
    }

    const fileParts: Array<{ mimeType: string; data: string }> = [];
    const textParts: string[] = [];

    // 1. Proses Berkas Soal
    if (questionFileBase64) {
      const cleanQBase64 = questionFileBase64.replace(/^data:[^;]+;base64,/, "");
      const isQDocx =
        questionFileName?.toLowerCase().endsWith(".docx") ||
        questionFileMimeType?.includes("wordprocessingml") ||
        questionFileMimeType?.includes("docx");

      if (isQDocx) {
        const qBuffer = Buffer.from(cleanQBase64, "base64");
        const qText = await extractTextFromDocx(qBuffer);
        textParts.push(`=== DOKUMEN 1: BERKAS SOAL UJIAN (${questionFileName || "soal.docx"}) ===\n${qText}`);
      } else {
        const mime =
          questionFileMimeType ||
          (questionFileName?.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : "image/jpeg");
        fileParts.push({ mimeType: mime, data: cleanQBase64 });
        textParts.push(`Catatan: Berkas Soal Ujian terlampir sebagai Dokumen 1 (${questionFileName || "soal"}).`);
      }
    }

    // 2. Proses Berkas Kunci Jawaban
    if (answerKeyFileBase64) {
      const cleanABase64 = answerKeyFileBase64.replace(/^data:[^;]+;base64,/, "");
      const isADocx =
        answerKeyFileName?.toLowerCase().endsWith(".docx") ||
        answerKeyFileMimeType?.includes("wordprocessingml") ||
        answerKeyFileMimeType?.includes("docx");

      if (isADocx) {
        const aBuffer = Buffer.from(cleanABase64, "base64");
        const aText = await extractTextFromDocx(aBuffer);
        textParts.push(`=== DOKUMEN 2: BERKAS KUNCI JAWABAN GURU (${answerKeyFileName || "kunci.docx"}) ===\n${aText}`);
      } else {
        const mime =
          answerKeyFileMimeType ||
          (answerKeyFileName?.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : "image/jpeg");
        fileParts.push({ mimeType: mime, data: cleanABase64 });
        textParts.push(`Catatan: Berkas Kunci Jawaban terlampir sebagai Dokumen 2 (${answerKeyFileName || "kunci"}).`);
      }
    }

    const prompt = `
Kamu adalah asisten guru Bahasa Arab. Guru mengunggah 2 berkas terpisah:
1. Berkas Soal Ujian (berisi daftar pertanyaan ujian).
2. Berkas Kunci Jawaban (berisi jawaban yang benar dari guru).

Tugasmu:
1. Temukan judul ujian dari berkas soal.
2. Identifikasi setiap nomor soal (#1, #2, dst.) dari Berkas Soal.
3. Cocokkan dengan kunci jawaban yang sesuai dari Berkas Kunci Jawaban untuk nomor soal tersebut.
   - Jika nomor 1 pada berkas soal berbunyi pertanyaan X, carilah jawaban untuk nomor 1 pada berkas kunci.
   - Jika ada soal yang belum memiliki kunci pada berkas kunci, berikan draf kunci jawaban yang paling tepat berdasarkan kaidah bahasa Arab.
4. Tentukan bobot nilai per soal (default total 100 dibagi jumlah soal).

Kembalikan HANYA format JSON valid tanpa tanda markdown:
{
  "title": "Judul Ujian",
  "description": "Deskripsi singkat hasil ekstraksi berkas terpisah",
  "totalQuestions": 3,
  "questions": [
    {
      "id": "q1",
      "number": 1,
      "text": "Teks pertanyaan soal nomor 1",
      "answerKey": "Kunci jawaban / inti argumen benar dari berkas kunci jawaban",
      "maxScore": 25
    }
  ]
}
`;

    const extracted = await callGeminiJson<ExtractExamResponse>(
      prompt,
      fileParts.length > 0 ? fileParts : undefined,
      textParts.length > 0 ? textParts : undefined
    );

    // Normalisasi bobot nilai
    if (extracted.questions && extracted.questions.length > 0) {
      const count = extracted.questions.length;
      const defaultScore = Math.floor(100 / count);
      extracted.totalQuestions = count;
      extracted.questions = extracted.questions.map((q: ExamQuestion, idx: number) => ({
        ...q,
        id: q.id || `q_${idx + 1}`,
        number: q.number || idx + 1,
        maxScore: q.maxScore || (idx === count - 1 ? 100 - defaultScore * (count - 1) : defaultScore),
      }));
    }

    return NextResponse.json(extracted);
  } catch (error: any) {
    console.error("Extract Separate Exam API error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan saat memproses berkas terpisah." },
      { status: 500 }
    );
  }
}
