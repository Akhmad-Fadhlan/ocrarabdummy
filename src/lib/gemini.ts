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

// Helper untuk memanggil Gemini API dengan fallback otomatis
export async function callGeminiJson<T>(
  apiKey: string,
  systemPrompt: string,
  fileParts?: Array<{ mimeType: string; data: string }>,
  textParts?: string[]
): Promise<T> {
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
          throw new Error("API Key Google Gemini tidak valid. Harap periksa kembali di Google AI Studio.");
        }

        lastError = errText;
        continue;
      }

      const data = await response.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!candidateText) {
        throw new Error("Respon teks kosong dari model Gemini.");
      }

      const jsonMatch = candidateText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : candidateText;

      return JSON.parse(jsonString) as T;
    } catch (err: any) {
      console.warn(`Percobaan model ${apiVersion}/${modelName} gagal:`, err.message);
      lastError = err.message || String(err);
      if (err.message?.includes("tidak valid")) {
        throw err;
      }
    }
  }

  throw new Error(`Gagal memproses dengan Gemini API. Detail error: ${lastError || "Semua model gagal merespon."}`);
}
