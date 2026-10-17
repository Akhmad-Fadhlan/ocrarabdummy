import mammoth from "mammoth"; 

export interface ModelCandidate {
  apiVersion: "v1beta" | "v1";
  modelName: string;
}

// Fungsi deteksi model yang aktif untuk API Key
export async function resolveWorkingModels(apiKey: string): Promise<ModelCandidate[]> {
  const candidates: ModelCandidate[] = [];

  // 1. Cek v1beta
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

  // 2. Cek v1
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

  // 3. Fallback jika list models dibatasi
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

// Ekstrak teks dari Word (.docx) buffer
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

// Parser JSON yang sangat tangguh untuk mencegah "Unexpected token" error
export function safeParseJson<T>(rawText: string): T {
  if (!rawText) {
    throw new Error("Teks respon kosong dari AI.");
  }

  // 1. Bersihkan markdown code fences (```json ... ``` atau ``` ...)
  let cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // 2. Cari kurung siku terluar [ ... ] atau kurung kurawal terluar { ... }
  const firstCurly = cleaned.indexOf("{");
  const lastCurly = cleaned.lastIndexOf("}");
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  if (firstCurly !== -1 && lastCurly > firstCurly) {
    // Jika bentuknya object
    cleaned = cleaned.substring(firstCurly, lastCurly + 1);
  } else if (firstBracket !== -1 && lastBracket > firstBracket) {
    // Jika bentuknya array
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }

  // Percobaan parse tahap 1
  try {
    return JSON.parse(cleaned) as T;
  } catch (err1) {
    // 3. Jika gagal, sanitasi trailing comma dan karakter kontrol liar
    try {
      // Hapus trailing comma sebelum } atau ]
      let sanitized = cleaned.replace(/,\s*([}\]])/g, "$1");
      // Ganti kutip kurva dengan kutip biasa
      sanitized = sanitized.replace(/[\u201C\u201D]/g, '"');
      return JSON.parse(sanitized) as T;
    } catch (err2) {
      // 4. Jika masih gagal, coba escape raw unescaped newlines dalam string JSON
      try {
        let fixedQuotes = cleaned.replace(/([^\\])"/g, '$1\\"');
        // Namun kembalikan quote struktural
        fixedQuotes = fixedQuotes
          .replace(/\\"/g, '"')
          .replace(/,\s*([}\]])/g, "$1");
        return JSON.parse(fixedQuotes) as T;
      } catch (err3) {
        console.error("Gagal melakukan parse JSON:", cleaned);
        throw new Error(`Respon AI tidak dapat diuraikan sebagai JSON yang valid: ${cleaned.substring(0, 150)}...`);
      }
    }
  }
}

// Helper untuk memanggil Gemini API dengan fallback otomatis & safe parsing
export async function callGeminiJson<T>(
  systemPrompt: string,
  fileParts?: Array<{ mimeType: string; data: string }>,
  textParts?: string[]
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY belum dikonfigurasi di environment server. Pastikan GEMINI_API_KEY sudah disetel di .env.local atau Vercel Environment Variables."
    );
  }

  const candidates = await resolveWorkingModels(apiKey);
  let lastError = "";

  const parts: any[] = [{ text: systemPrompt }];

  if (textParts && textParts.length > 0) {
    for (const t of textParts) {
      parts.push({ text: t });
    }
  }

  if (fileParts && fileParts.length > 0) {
    for (const f of fileParts) {
      parts.push({
        inlineData: {
          mimeType: f.mimeType,
          data: f.data.replace(/^data:[^;]+;base64,/, ""),
        },
      });
    }
  }

  for (const { apiVersion, modelName } of candidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`;

      const payload = {
        contents: [
          {
            role: "user",
            parts,
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
        const errText = await response.text();
        console.warn(`Model ${apiVersion}/${modelName} gagal:`, errText);

        if (errText.includes("API_KEY_INVALID") || (response.status === 400 && errText.includes("key"))) {
          throw new Error("GEMINI_API_KEY yang terpasang di sistem tidak valid. Silakan periksa kembali di Google AI Studio.");
        }

        lastError = errText;
        continue;
      }

      const data = await response.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!candidateText) {
        throw new Error("Respon teks kosong dari model Gemini.");
      }

      return safeParseJson<T>(candidateText);
    } catch (err: any) {
      console.warn(`Percobaan model ${apiVersion}/${modelName} gagal:`, err.message);
      lastError = err.message || String(err);
      if (err.message?.includes("tidak valid") || err.message?.includes("belum dikonfigurasi")) {
        throw err;
      }
    }
  }

  throw new Error(`Gagal memproses dengan Gemini API. Detail error: ${lastError || "Semua model gagal merespon."}`);
}
