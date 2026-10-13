"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  PenTool,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Key,
  BookOpen,
  RotateCcw,
  Printer,
  Copy,
  Check,
  ChevronRight,
  HelpCircle,
  FileText,
  Sliders,
  Eye,
  Eraser,
} from "lucide-react";
import { GradingResult, GradingMode, HarakatRule, SamplePreset } from "@/types/grading";

// Preset contoh kasus untuk pengujian langsung
const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: "argument-religion",
    title: "Esai Argumen: Mengapa Belajar Bahasa Arab?",
    category: "Esai Pemahaman",
    question: "لماذا يجب على كل مسلم أن يتعلم اللغة العربية؟ (Jelaskan argumen mengapa setiap muslim perlu mempelajari bahasa Arab)",
    teacherKey: "لأنها لغة القرآن الكريم والحديث النبوي الشريف ومفتاح لفهم الشريعة الإسلامية وأداء العبادات بشكل صحيح. (Karena bahasa Al-Qur'an dan Hadits, serta kunci memahami syariat Islam dan ibadah).",
    mode: "semantic_argument",
    harakatRule: "ignore",
    description: "Menguji penilaian esensi/makna. Siswa bisa menggunakan redaksi kata yang berbeda namun intinya tetap benar.",
  },
  {
    id: "short-sentence-nahwu",
    title: "Tata Bahasa: Membuat Jumlah Mufidah (Nahwu)",
    category: "Nahwu & I'rab",
    question: "اكتب جملة فعلية مفيدة مع ضبط أواخر الكلمات بالشكل. (Tuliskan sebuah jumlah fi'liyyah yang berfaedah dengan harakat akhir kata lengkap)",
    teacherKey: "ذَهَبَ التِّلْمِيذُ إِلَى الْمَدْرَسَةِ صَبَاحًا",
    mode: "semantic_argument",
    harakatRule: "strict_irab",
    description: "Menguji ketelitian harakat akhir kata (fa'il berharakat dhammah, jar-majrur, dll).",
  },
  {
    id: "vocabs-translation",
    title: "Pemahaman Mufradat: Profesi & Cita-cita",
    category: "Kosakata",
    question: "ماذا يعمل الطبيب في المستشفى؟ (Apa tugas seorang dokter di rumah sakit?)",
    teacherKey: "يعالج الطبيب المرضى في المستشفى ويصف لهم الدواء المناسب. (Dokter merawat dan mengobati orang sakit serta memberikan obat).",
    mode: "semantic_argument",
    harakatRule: "ignore",
    description: "Menguji penerimaan sinonim (misal kata 'يساعد' atau 'يداوي').",
  },
];

export default function Home() {
  // State Input
  const [questionText, setQuestionText] = useState("");
  const [teacherKey, setTeacherKey] = useState("");
  const [mode, setMode] = useState<GradingMode>("semantic_argument");
  const [harakatRule, setHarakatRule] = useState<HarakatRule>("ignore");
  const [maxScore, setMaxScore] = useState<number>(100);

  // State Image Upload / Canvas
  const [inputTab, setInputTab] = useState<"upload" | "canvas">("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");

  // State API Key & UI
  const [customApiKey, setCustomApiKey] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // State Loading & Result
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<GradingResult | null>(null);

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load custom API key from localStorage if exists
  useEffect(() => {
    const saved = localStorage.getItem("tashih_gemini_api_key");
    if (saved) setCustomApiKey(saved);
  }, []);

  const saveApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem("tashih_gemini_api_key", key);
    setShowApiKeyModal(false);
  };

  // Setup Canvas
  useEffect(() => {
    if (inputTab === "canvas" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx && !imagePreview) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Garis buku tulis tipis untuk mempermudah menulis Arab
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        for (let y = 50; y < canvas.height; y += 45) {
          ctx.beginPath();
          ctx.moveTo(10, y);
          ctx.lineTo(canvas.width - 10, y);
          ctx.stroke();
        }
      }
    }
  }, [inputTab, imagePreview]);

  // Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Harap unggah file gambar (JPG, PNG, atau WebP).");
      return;
    }

    setImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = "#1e293b"; // Warna tinta pena gelap
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.9);
      setImagePreview(dataUrl);
      setImageMimeType("image/jpeg");
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Redraw faint lines
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let y = 50; y < canvas.height; y += 45) {
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(canvas.width - 10, y);
      ctx.stroke();
    }
    setImagePreview(null);
  };

  // Pilih preset
  const applyPreset = (preset: SamplePreset) => {
    setQuestionText(preset.question);
    setTeacherKey(preset.teacherKey);
    setMode(preset.mode);
    setHarakatRule(preset.harakatRule);
    setErrorMsg(null);
    setResult(null);

    // Otomatis gambar sampel tulisan tangan di kanvas agar bisa langsung dites!
    setInputTab("canvas");
    setTimeout(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Garis buku
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 1;
          for (let y = 50; y < canvas.height; y += 45) {
            ctx.beginPath();
            ctx.moveTo(10, y);
            ctx.lineTo(canvas.width - 10, y);
            ctx.stroke();
          }

          // Simulasi tulisan tangan Arab siswa di kanvas
          ctx.font = "bold 32px var(--font-amiri), serif";
          ctx.fillStyle = "#1e293b";
          ctx.direction = "rtl";
          ctx.textAlign = "right";

          if (preset.id === "argument-religion") {
            ctx.fillText("لكي نفهم كتاب الله الكريم", canvas.width - 30, 90);
            ctx.fillText("ونفهم أحكام الدين والصلاة", canvas.width - 30, 140);
          } else if (preset.id === "short-sentence-nahwu") {
            ctx.fillText("ذَهَبَ الطَّالِبُ إِلَى الْمَدْرَسَةِ", canvas.width - 30, 100);
          } else {
            ctx.fillText("يعالج الطبيب المرضى في المشفى", canvas.width - 30, 100);
          }

          const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
          setImagePreview(dataUrl);
          setImageMimeType("image/jpeg");
        }
      }
    }, 100);
  };

  // Trigger Koreksi
  const handleGrade = async () => {
    if (!imagePreview) {
      setErrorMsg("Mohon unggah foto jawaban atau tuliskan di kanvas terlebih dahulu.");
      return;
    }

    if (!teacherKey.trim()) {
      setErrorMsg("Kunci jawaban / inti argumen dari guru wajib diisi.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);
    setLoadingStep("1/3 Memindai tulisan tangan Arab (Vision HTR)...");

    const timer1 = setTimeout(() => {
      setLoadingStep("2/3 Menganalisis keselarasan makna & argumen siswa...");
    }, 3000);

    const timer2 = setTimeout(() => {
      setLoadingStep("3/3 Menghitung skor & menyusun rubrik penilaian...");
    }, 6000);

    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: imagePreview,
          imageMimeType,
          questionText,
          teacherAnswerKey: teacherKey,
          mode,
          harakatRule,
          maxScore,
          customApiKey: customApiKey || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error && data.error.includes("API Key")) {
          setShowApiKeyModal(true);
        }
        throw new Error(data.error || "Gagal melakukan koreksi.");
      }

      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses penilaian.");
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const copyTranscription = () => {
    if (result?.studentTranscription) {
      navigator.clipboard.writeText(result.studentTranscription);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
              ض
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Tashih Arabi</h1>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                  Vercel Ready
                </span>
              </div>
              <p className="text-xs text-slate-500">Sistem Koreksi Ujian Bahasa Arab Tulis Tangan Berbasis AI</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              <Key className="w-3.5 h-3.5 text-amber-600" />
              <span>{customApiKey ? "API Key Aktif" : "Set API Key"}</span>
            </button>
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Deploy to Vercel
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Banner Presets */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 mb-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-emerald-950">Uji Coba Cepat (Contoh Kasus Siap Pakai)</h2>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Klik salah satu sampel di bawah untuk memuat soal, kunci jawaban guru, dan simulasi tulisan Arab secara instan:
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-600 hover:text-white transition-all shadow-xs"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Input Ujian & Lembar Jawaban (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Kartu Formulir Guru */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800">1. Konfigurasi Kunci Jawaban (Guru)</h3>
                </div>
                <span className="text-xs text-slate-500">Rubrik & Inti Jawaban</span>
              </div>

              <div className="space-y-4">
                {/* Soal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pertanyaan / Soal Ujian (Opsional)
                  </label>
                  <input
                    type="text"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Contoh: Mengapa bahasa Arab penting bagi seorang muslim?"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-slate-50/50"
                  />
                </div>

                {/* Kunci Jawaban / Inti Argumen */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Kunci Jawaban / Poin Inti Argumen Guru <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-emerald-700 font-medium">Bisa teks Arab atau Indonesia</span>
                  </div>
                  <textarea
                    rows={3}
                    value={teacherKey}
                    onChange={(e) => setTeacherKey(e.target.value)}
                    placeholder="Masukkan kalimat kunci atau poin-poin gagasan utama yang harus dicapai siswa..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-slate-50/50 font-arabic text-right leading-relaxed"
                    dir="auto"
                  />
                </div>

                {/* Mode Penilaian & Aturan Harakat */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-slate-500" /> Mode Penilaian
                    </label>
                    <div className="space-y-1.5">
                      <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs">
                        <input
                          type="radio"
                          name="mode"
                          checked={mode === "semantic_argument"}
                          onChange={() => setMode("semantic_argument")}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">Inti Argumen & Makna</div>
                          <div className="text-[10px] text-slate-500 leading-tight">
                            Redaksi boleh beda asalkan inti maksudnya selaras.
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs">
                        <input
                          type="radio"
                          name="mode"
                          checked={mode === "strict_literal"}
                          onChange={() => setMode("strict_literal")}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">Ketat / Literal</div>
                          <div className="text-[10px] text-slate-500 leading-tight">
                            Harus persis susunan kata dan kosakata guru.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Aturan Harakat (Tasykil / I'rab)
                    </label>
                    <div className="space-y-1.5">
                      <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs">
                        <input
                          type="radio"
                          name="harakat"
                          checked={harakatRule === "ignore"}
                          onChange={() => setHarakatRule("ignore")}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">Abaikan Harakat</div>
                          <div className="text-[10px] text-slate-500 leading-tight">
                            Tanpa penalti jika harakat tidak lengkap.
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs">
                        <input
                          type="radio"
                          name="harakat"
                          checked={harakatRule === "strict_irab"}
                          onChange={() => setHarakatRule("strict_irab")}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">Ketat I'rab (Nahwu)</div>
                          <div className="text-[10px] text-slate-500 leading-tight">
                            Periksa ketepatan harakat huruf akhir.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Kartu Lembar Jawaban Siswa (Upload / Coret Kanvas) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800">2. Lembar Jawaban Siswa (Tulis Tangan Arab)</h3>
                </div>
                {/* Tabs */}
                <div className="flex p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setInputTab("upload")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      inputTab === "upload" ? "bg-white text-emerald-700 shadow-xs font-semibold" : "text-slate-600"
                    }`}
                  >
                    Upload Foto
                  </button>
                  <button
                    onClick={() => setInputTab("canvas")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      inputTab === "canvas" ? "bg-white text-emerald-700 shadow-xs font-semibold" : "text-slate-600"
                    }`}
                  >
                    Coret di Layar
                  </button>
                </div>
              </div>

              {inputTab === "upload" ? (
                <div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/30 flex flex-col items-center justify-center min-h-[200px]"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {imagePreview ? (
                      <div className="space-y-3 w-full">
                        <div className="relative inline-block max-h-56 overflow-hidden rounded-lg border border-slate-200 shadow-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imagePreview}
                            alt="Lembar Jawaban Siswa"
                            className="max-h-56 mx-auto object-contain bg-white"
                          />
                        </div>
                        <p className="text-xs text-emerald-700 font-semibold">
                          ✓ Foto berhasil dimuat. Klik untuk mengganti foto.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">
                          Klik untuk upload foto tulisan tangan siswa
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Mendukung foto kamera HP, format JPG / PNG / WebP
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Tuliskan kalimat Arab dengan mouse atau jari di area bergaris ini:</span>
                    <button
                      onClick={clearCanvas}
                      className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-medium"
                    >
                      <Eraser className="w-3 h-3" /> Bersihkan
                    </button>
                  </div>
                  <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner flex justify-center">
                    <canvas
                      ref={canvasRef}
                      width={620}
                      height={200}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full cursor-crosshair touch-none"
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Perhatian: </span>
                    {errorMsg}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleGrade}
                disabled={isLoading}
                className="w-full mt-4 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{loadingStep || "Sedang memproses..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Koreksi & Bandingkan Nilai Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Kolom Kanan: Hasil Koreksi & Feedback (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            {result ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5 animate-in fade-in duration-300">
                {/* Result Header & Score */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Hasil Penilaian Otomatis
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {result.status === "CORRECT" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> BENAR PENUH
                        </span>
                      )}
                      {result.status === "PARTIAL" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5" /> BENAR SEBAGIAN
                        </span>
                      )}
                      {result.status === "INCORRECT" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" /> BELUM TEPAT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score Pill */}
                  <div className="text-right">
                    <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {result.score}
                      <span className="text-sm font-normal text-slate-400">/{result.maxScore}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Keterbacaan: {result.transcriptionConfidence === "high" ? "Jelas" : "Cukup"}
                    </span>
                  </div>
                </div>

                {/* Transkripsi Teks Tulisan Siswa */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      Teks Tulisan Siswa (Transkripsi AI):
                    </span>
                    <button
                      onClick={copyTranscription}
                      className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {isCopied ? "Tersalin" : "Salin"}
                    </button>
                  </div>
                  <div className="font-arabic text-xl text-right leading-loose text-slate-900 py-1" dir="rtl">
                    {result.studentTranscription || "(Tidak terdeteksi teks)"}
                  </div>
                  <div className="text-xs text-slate-500 italic pt-1 border-t border-slate-200/60">
                    Artinya: &ldquo;{result.studentTranslation}&rdquo;
                  </div>
                </div>

                {/* Analisis Kesesuaian Argumen & Makna */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Analisis Kesesuaian Makna / Argumen:
                  </h4>
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 space-y-2 leading-relaxed">
                    <p>{result.semanticAnalysis.coreArgumentEvaluation}</p>
                    {result.semanticAnalysis.synonymNotes && (
                      <p className="text-[11px] text-amber-800 border-t border-amber-200/80 pt-1.5 font-medium">
                        💡 Catatan Sinonim: {result.semanticAnalysis.synonymNotes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Evaluasi Harakat */}
                {result.harakatEvaluation && (
                  <div className="text-xs border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                    <span className="font-bold text-slate-700">Status Harakat: </span>
                    <span className="text-slate-600">{result.harakatEvaluation.details}</span>
                  </div>
                )}

                {/* Rincian Rubrik Penilaian */}
                {result.rubricBreakdown && result.rubricBreakdown.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800">Rincian Komponen Nilai:</h4>
                    <div className="space-y-1.5">
                      {result.rubricBreakdown.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">{item.aspect}</div>
                            <div className="text-[10px] text-slate-500">{item.comment}</div>
                          </div>
                          <div className="font-bold text-slate-900 shrink-0 ml-2">
                            {item.score} / {item.maxScore}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Saran untuk Siswa & Catatan Guru */}
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 text-xs space-y-1 text-emerald-950">
                  <div className="font-bold text-emerald-900">Umpan Balik untuk Siswa:</div>
                  <p className="text-emerald-800">{result.studentFeedback}</p>
                </div>

                {/* Print button */}
                <button
                  onClick={() => window.print()}
                  className="w-full py-2 px-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors no-print"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Laporan Nilai / Simpan PDF
                </button>
              </div>
            ) : (
              /* State Kosong (Sebelum Koreksi) */
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs flex flex-col items-center justify-center min-h-[350px]">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <Eye className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Menunggu Lembar Jawaban</h3>
                <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                  Pilih salah satu <b>Uji Coba Cepat</b> di atas atau unggah foto tulisan tangan sendiri, lalu tekan tombol{" "}
                  <span className="text-emerald-700 font-semibold">Koreksi</span> untuk melihat hasil transkripsi dan skor.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal API Key Google Gemini */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Pengaturan Google Gemini API</h3>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Sistem menggunakan model <b>Gemini 2.5 Flash Vision</b> untuk membaca tulisan tangan Arab. Anda dapat
              memperoleh API Key gratis langsung dari Google AI Studio.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gemini API Key Anda:
              </label>
              <input
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <div>💡 <b>Tip Vercel Deployment:</b></div>
              <div>
                Di Vercel, Anda dapat memasukkan key ini di menu <b>Project Settings → Environment Variables</b> dengan nama{" "}
                <code className="text-emerald-700 font-bold">GEMINI_API_KEY</code> agar tidak perlu mengetiknya lagi.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Tutup
              </button>
              <button
                onClick={() => saveApiKey(customApiKey)}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
              >
                Simpan API Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
