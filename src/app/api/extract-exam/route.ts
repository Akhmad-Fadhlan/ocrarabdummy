import { NextRequest, NextResponse } from "next/server";
import { ExtractExamRequest, ExtractExamResponse, ExamQuestion } from "@/types/grading";
import { callGeminiJson, extractTextFromDocx } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body: ExtractExamRequest = await req.json();
    const { fileBase64, fileMimeType, fileName, customApiKey } = body;

    const apiKey = customApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key Google Gemini belum diatur. Masukkan API Key di pengaturan web atau setel GEMINI_API_KEY di Vercel." },
        { status: 400 }
      );
    }

    if (!fileBase64) {
      return NextResponse.json({ error: "File dokumen soal wajib diunggah." }, { status: 400 } );
    }

    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
    const fileBuffer = Buffer.from(cleanBase64, "base64");

    const isDocx =
      fileName?.toLowerCase().endsWith(".docx") ||
      fileMimeType?.includes("wordprocessingml") ||
      fileMimeType?.includes("docx");

    let textContent = "";
    let fileParts: Array<{ mimeType: string; data: string }> = [];

    if (isDocx) {
      try {
        textContent = await extractTextFromDocx(fileBuffer);
        if (!textContent.trim()) {
          return NextResponse.json(
            { error: "File Word (.docx) kosong atau teks tidak dapat diekstrak." },
            { status: 400 }
          );
        }
      } catch (err: any) {
        return NextResponse.json(
          { error: `Gagal membaca file Word: ${err.message}` },
          { status: 400 }
        );
      }
    } else {
      // PDF atau format dokumen gambar/scan
      const mime = fileMimeType || (fileName?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
      fileParts = [{ mimeType: mime, data: cleanBase64 }];
    }

    const prompt = `
Kamu adalah asisten pengajar Bahasa Arab yang bertugas mengekstrak soal dan kunci jawaban dari dokumen ujian guru.
Dokumen ini berisi kumpulan pertanyaan dan kunci jawaban/jawaban benar yang telah disiapkan guru (bisa berbahasa Arab dan/atau Indonesia).

Tugasmu:
1. Temukan judul ujian atau mata pelajaran dari dokumen.
2. Identifikasi setiap nomor soal beserta teks pertanyaan dan kunci jawaban yang tepat untuk nomor tersebut.
3. Jika pada dokumen kunci jawaban diletakkan terpisah (misalnya di bagian akhir atau di bawah soal), satukan kunci jawaban tersebut ke masing-masing nomor soal yang sesuai.
4. Tentukan bobot nilai default (misalnya total skor 100 dibagi jumlah soal, bulatkan ke angka bulat atau desimal wajar).
5. Pastikan teks pertanyaan dan kunci jawaban dalam bahasa Arab ditulis dengan benar dan jelas.

Kembalikan respon HANYA dalam format JSON valid:
{
  "title": "Judul Ujian / Mata Pelajaran",
  "description": "Deskripsi singkat ujian",
  "totalQuestions": 3,
  "questions": [
    {
      "id": "q1",
      "number": 1,
      "text": "Teks pertanyaan soal nomor 1",
      "answerKey": "Kunci jawaban / inti argumen yang benar untuk nomor 1",
      "maxScore": 20
    }
  ]
}
`;

    const extracted = await callGeminiJson<ExtractExamResponse>(
      apiKey,
      prompt,
      fileParts.length > 0 ? fileParts : undefined,
      textContent ? [`Isi dokumen teks ujian:\n\n${textContent}`] : undefined
    );

    // Normalisasi bobot jika maxScore belum ada atau jumlahnya belum 100
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
    console.error("Extract Exam API error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan saat mengekstrak dokumen ujian." },
      { status: 500 }
    );
  }
}
