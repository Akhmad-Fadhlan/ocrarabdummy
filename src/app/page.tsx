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
  Printer,
  Copy,
  Check,
  FileText,
  Sliders,
  Eye,
  Eraser,
  Plus,
  Trash2,
  FileCheck,
  FileType,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  GradingMode,
  HarakatRule,
  ExamQuestion,
  BatchGradingResult,
  ExtractExamResponse,
} from "@/types/grading";

// Preset contoh multi-soal untuk uji coba langsung
const DEFAULT_QUESTIONS: ExamQuestion[] = [
  {
    id: "q1",
    number: 1,
    text: "لماذا يجب على كل مسلم أن يتعلم اللغة العربية؟ (Jelaskan argumen mengapa setiap muslim perlu mempelajari bahasa Arab)",
    answerKey: "لأنها لغة القرآن الكريم والحديث النبوي الشريف ومفتاح لفهم الشريعة الإسلامية وأداء العبادات بشكل صحيح.",
    maxScore: 35,
  },
  {
    id: "q2",
    number: 2,
    text: "ما هو دور الطبيب وواجبه نحو المرضى في المستشفى؟ (Apa peran dan kewajiban dokter terhadap orang sakit?)",
    answerKey: "يقوم الطبيb بفحص المرضى ومعالجتهم وتخفيف آلامهم ووصف الدواء المناسب لهم في المشفى.",
    maxScore: 35,
  },
  {
    id: "q3",
    number: 3,
    text: "اكتب جملة فعلية صحيحة تبين ذهاب الطالب إلى المدرسة مع ضبط أواخر الكلمات. (Tuliskan sebuah jumlah fi'liyyah pergi ke sekolah)",
    answerKey: "ذَهَبَ التِّلْمِيذُ إِلَى الْمَدْرَسَةِ صَبَاحًا لِطَلَبِ الْعِلْمِ.",
    maxScore: 30,
  },
];

export default function Home() {
  // State Guru (Daftar Soal & Kunci)
  const [examTitle, setExamTitle] = useState("Ujian Bahasa Arab & Pemahaman");
  const [questions, setQuestions] = useState<ExamQuestion[]>(DEFAULT_QUESTIONS);
  const [teacherTab, setTeacherTab] = useState<"document" | "manual">("manual");
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const teacherFileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedTeacherFileName, setUploadedTeacherFileName] = useState<string | null>(null);

  // State Siswa (Berkas Jawaban)
  const [studentTab, setStudentTab] = useState<"upload" | "canvas">("upload");
  const [studentFileBase64, setStudentFileBase64] = useState<string | null>(null);
  const [studentFileMimeType, setStudentFileMimeType] = useState<string>("image/jpeg");
  const [studentFileName, setStudentFileName] = useState<string>("");
  const studentFileInputRef = useRef<HTMLInputElement | null>(null);

  // State Kanvas Coret Siswa
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Konfigurasi Penilaian
  const [mode, setMode] = useState<GradingMode>("semantic_argument");
  const [harakatRule, setHarakatRule] = useState<HarakatRule>("ignore");

  // State API Key & Modal
  const [customApiKey, setCustomApiKey] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // State Penilaian & Hasil
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<BatchGradingResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Muat API key tersimpan jika ada
  useEffect(() => {
    const saved = localStorage.getItem("tashih_gemini_api_key");
    if (saved) setCustomApiKey(saved);
  }, []);

  const saveApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem("tashih_gemini_api_key", key);
    setShowApiKeyModal(false);
  };

  // Hitung total bobot soal
  const totalMaxScore = questions.reduce((sum, q) => sum + (Number(q.maxScore) || 0), 0);

  // Setup Canvas bergaris
  useEffect(() => {
    if (studentTab === "canvas" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx && !studentFileBase64) {
        drawCanvasBackground(ctx, canvas);
      }
    }
  }, [studentTab, studentFileBase64]);

  const drawCanvasBackground = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let y = 45; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(canvas.width - 10, y);
      ctx.stroke();
    }
  };

  // Handler Upload Dokumen Soal Guru (Word .docx atau PDF)
  const handleTeacherFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedTeacherFileName(file.name);
    setExtractError(null);
    setIsExtractingDoc(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const response = await fetch("/api/extract-exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: base64,
            fileMimeType: file.type || "application/octet-stream",
            fileName: file.name,
            customApiKey: customApiKey || undefined,
          }),
        });

        const data: ExtractExamResponse & { error?: string } = await response.json();
        if (!response.ok) {
          if (data.error && data.error.includes("API Key")) {
            setShowApiKeyModal(true);
          }
          throw new Error(data.error || "Gagal mengekstrak soal dari dokumen.");
        }

        if (data.title) setExamTitle(data.title);
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setTeacherTab("manual"); // Arahkan ke tab editor soal agar guru bisa meninjau
        }
      } catch (err: any) {
        setExtractError(err.message || "Gagal memproses dokumen soal.");
      } finally {
        setIsExtractingDoc(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handler Upload Lembar Jawaban Siswa (PDF, Word, atau Foto)
  const handleStudentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStudentFileName(file.name);
    setStudentFileMimeType(file.type || "application/octet-stream");

    const reader = new FileReader();
    reader.onload = () => {
      setStudentFileBase64(reader.result as string);
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

    ctx.strokeStyle = "#1e293b";
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
      setStudentFileBase64(dataUrl);
      setStudentFileMimeType("image/jpeg");
      setStudentFileName("tulisan_tangan_kanvas.jpg");
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCanvasBackground(ctx, canvas);
    setStudentFileBase64(null);
    setStudentFileName("");
  };

  // Tambah / Hapus / Update Soal
  const addQuestion = () => {
    const nextNum = questions.length + 1;
    const newQ: ExamQuestion = {
      id: `q_${Date.now()}`,
      number: nextNum,
      text: `Pertanyaan nomor ${nextNum}`,
      answerKey: "",
      maxScore: 20,
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) {
      alert("Minimal harus ada 1 nomor soal.");
      return;
    }
    const filtered = questions
      .filter((q) => q.id !== id)
      .map((q, idx) => ({ ...q, number: idx + 1 }));
    setQuestions(filtered);
  };

  const updateQuestion = (id: string, field: keyof ExamQuestion, value: any) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  // Jalankan Uji Sampel Cepat (Multi-Soal)
  const applyQuickSample = () => {
    setQuestions(DEFAULT_QUESTIONS);
    setStudentTab("canvas");
    setErrorMsg(null);
    setResult(null);

    setTimeout(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawCanvasBackground(ctx, canvas);
          ctx.font = "bold 26px var(--font-amiri), serif";
          ctx.fillStyle = "#1e293b";
          ctx.direction = "rtl";
          ctx.textAlign = "right";

          // Jawaban No 1 (Redaksi beda, makna sama)
          ctx.fillText("١. لكي نفهم كتاب الله الكريم ونفهم الصلاة والعبادة.", canvas.width - 20, 80);

          // Jawaban No 2 (Sinonim kata dokter)
          ctx.fillText("٢. يعالج الطبيب المرضى في المستشفى ويعطيهم الدواء.", canvas.width - 20, 160);

          // Jawaban No 3 (Kalimat nahwu)
          ctx.fillText("٣. ذَهَبَ الطَّالِبُ إِلَى الْمَدْرَسَةِ صَبَاحًا.", canvas.width - 20, 240);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
          setStudentFileBase64(dataUrl);
          setStudentFileMimeType("image/jpeg");
          setStudentFileName("lembar_jawaban_siswa_sampel.jpg");
        }
      }
    }, 150);
  };

  // Jalankan Koreksi Otomatis (Batch Grading)
  const handleGrade = async () => {
    if (!studentFileBase64) {
      setErrorMsg("Mohon unggah file lembar jawaban siswa (Word / PDF / Foto) terlebih dahulu.");
      return;
    }

    if (questions.length === 0) {
      setErrorMsg("Daftar soal dan kunci jawaban dari guru belum tersedia.");
      return;
    }

    for (const q of questions) {
      if (!q.answerKey.trim()) {
        setErrorMsg(`Kunci jawaban untuk Soal #${q.number} masih kosong.`);
        return;
      }
    }

    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);
    setLoadingStep("1/3 Membaca & mengekstrak seluruh jawaban siswa dari berkas...");

    const timer1 = setTimeout(() => {
      setLoadingStep("2/3 Menganalisis keselarasan makna & argumen tiap nomor soal...");
    }, 4000);

    const timer2 = setTimeout(() => {
      setLoadingStep("3/3 Menghitung skor akumulatif & menyusun rekap nilai...");
    }, 8000);

    try {
      const response = await fetch("/api/grade-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions,
          studentFileBase64,
          studentFileMimeType,
          studentFileName: studentFileName || "dokumen_jawaban",
          mode,
          harakatRule,
          customApiKey: customApiKey || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error && data.error.includes("API Key")) {
          setShowApiKeyModal(true);
        }
        throw new Error(data.error || "Gagal melakukan pemeriksaan ujian.");
      }

      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memeriksa ujian.");
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const copyTranscription = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
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
                  Word & PDF Support
                </span>
              </div>
              <p className="text-xs text-slate-500">Koreksi Otomatis Ujian Bahasa Arab Tulis Tangan & Dokumen</p>
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
            <button
              onClick={applyQuickSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Muat Sampel 3 Soal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner Fitur Baru Word & PDF */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                <FileCheck className="w-3.5 h-3.5" /> Dukungan Lengkap Word (.docx) & PDF (.pdf)
              </div>
              <h2 className="text-base font-bold tracking-tight">
                Ekstraksi Soal Guru & Penilaian Otomatis Lembar Jawaban Siswa
              </h2>
              <p className="text-xs text-emerald-200/90 max-w-2xl leading-relaxed">
                Guru dapat mengunggah file Word/PDF berisi kumpulan soal & kunci jawaban untuk diekstrak otomatis.
                Siswa dapat mengunggah lembar jawaban (scan PDF tulisan tangan, dokumen Word, atau foto HP), lalu sistem
                akan menilai kesesuaian makna argumen per nomor soal secara serentak.
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Panel Guru & Daftar Soal (6 Cols) */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4.5 h-4.5 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">1. Soal & Kunci Jawaban (Guru)</h3>
                    <p className="text-[11px] text-slate-500">
                      Total {questions.length} Soal • Bobot: {totalMaxScore} Poin
                    </p>
                  </div>
                </div>

                {/* Tabs Panel Guru */}
                <div className="flex p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setTeacherTab("document")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      teacherTab === "document"
                        ? "bg-white text-emerald-700 shadow-xs font-semibold"
                        : "text-slate-600"
                    }`}
                  >
                    Upload Word/PDF
                  </button>
                  <button
                    onClick={() => setTeacherTab("manual")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      teacherTab === "manual"
                        ? "bg-white text-emerald-700 shadow-xs font-semibold"
                        : "text-slate-600"
                    }`}
                  >
                    Daftar Soal ({questions.length})
                  </button>
                </div>
              </div>

              {/* Tab Upload Dokumen Guru */}
              {teacherTab === "document" ? (
                <div className="space-y-4">
                  <div
                    onClick={() => teacherFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/30 flex flex-col items-center justify-center min-h-[170px]"
                  >
                    <input
                      type="file"
                      ref={teacherFileInputRef}
                      onChange={handleTeacherFileUpload}
                      accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                    />

                    {isExtractingDoc ? (
                      <div className="space-y-2 flex flex-col items-center">
                        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-700 font-semibold">
                          AI sedang mengekstrak soal & kunci jawaban dari dokumen...
                        </p>
                        <p className="text-[11px] text-slate-400">Memproses berkas Word/PDF</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                          <FileType className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          Unggah File Soal & Kunci Jawaban (.docx / .pdf)
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          AI akan memisahkan nomor soal dan kunci jawaban secara otomatis
                        </p>
                        {uploadedTeacherFileName && (
                          <div className="mt-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            Berkas terakhir: {uploadedTeacherFileName}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {extractError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{extractError}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Tab Editor Daftar Soal */
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      placeholder="Judul Ujian..."
                      className="text-xs font-bold text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 w-full"
                    />
                    <button
                      onClick={addQuestion}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Soal
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 relative group hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                            Soal #{q.number || idx + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <span>Bobot:</span>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={q.maxScore}
                                onChange={(e) =>
                                  updateQuestion(q.id, "maxScore", Number(e.target.value) || 0)
                                }
                                className="w-12 text-center text-xs py-0.5 px-1 bg-white border border-slate-200 rounded-md font-semibold text-slate-800"
                              />
                              <span>poin</span>
                            </div>
                            <button
                              onClick={() => removeQuestion(q.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Hapus soal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Pertanyaan:
                          </label>
                          <input
                            type="text"
                            value={q.text}
                            onChange={(e) => updateQuestion(q.id, "text", e.target.value)}
                            placeholder="Tuliskan pertanyaan soal..."
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Kunci Jawaban / Inti Argumen Benar:
                          </label>
                          <textarea
                            rows={2}
                            value={q.answerKey}
                            onChange={(e) => updateQuestion(q.id, "answerKey", e.target.value)}
                            placeholder="Jawaban benar atau inti argumen yang diharapkan guru..."
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-arabic text-right leading-relaxed"
                            dir="auto"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pengaturan Mode Penilaian */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-slate-500" /> Mode Penilaian
                </label>
                <div className="space-y-1">
                  <label className="flex items-start gap-2 p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "semantic_argument"}
                      onChange={() => setMode("semantic_argument")}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Inti Argumen & Makna</div>
                      <div className="text-[10px] text-slate-500">Redaksi boleh beda asalkan maknanya tepat.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "strict_literal"}
                      onChange={() => setMode("strict_literal")}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Ketat / Literal</div>
                      <div className="text-[10px] text-slate-500">Kosakata harus persis dengan kunci guru.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Aturan Harakat (I&apos;rab)
                </label>
                <div className="space-y-1">
                  <label className="flex items-start gap-2 p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="harakat"
                      checked={harakatRule === "ignore"}
                      onChange={() => setHarakatRule("ignore")}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Abaikan Harakat</div>
                      <div className="text-[10px] text-slate-500">Fokus pada substansi makna kata dasar.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="harakat"
                      checked={harakatRule === "strict_irab"}
                      onChange={() => setHarakatRule("strict_irab")}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Ketat I&apos;rab (Nahwu)</div>
                      <div className="text-[10px] text-slate-500">Periksa ketepatan harakat huruf akhir.</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Lembar Jawaban Siswa & Tombol Koreksi (6 Cols) */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4.5 h-4.5 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">2. Lembar Jawaban Siswa</h3>
                    <p className="text-[11px] text-slate-500">Mendukung Word (.docx), PDF (.pdf), atau Foto</p>
                  </div>
                </div>

                <div className="flex p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setStudentTab("upload")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      studentTab === "upload"
                        ? "bg-white text-emerald-700 shadow-xs font-semibold"
                        : "text-slate-600"
                    }`}
                  >
                    Upload Berkas / Foto
                  </button>
                  <button
                    onClick={() => setStudentTab("canvas")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      studentTab === "canvas"
                        ? "bg-white text-emerald-700 shadow-xs font-semibold"
                        : "text-slate-600"
                    }`}
                  >
                    Coret di Layar
                  </button>
                </div>
              </div>

              {studentTab === "upload" ? (
                <div>
                  <div
                    onClick={() => studentFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/30 flex flex-col items-center justify-center min-h-[220px]"
                  >
                    <input
                      type="file"
                      ref={studentFileInputRef}
                      onChange={handleStudentFileUpload}
                      accept=".docx,.pdf,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                    />

                    {studentFileBase64 ? (
                      <div className="space-y-3 w-full">
                        {studentFileMimeType.startsWith("image/") ? (
                          <div className="relative inline-block max-h-52 overflow-hidden rounded-lg border border-slate-200 shadow-xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={studentFileBase64}
                              alt="Lembar Jawaban Siswa"
                              className="max-h-52 mx-auto object-contain bg-white"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                            <FileCheck className="w-8 h-8" />
                          </div>
                        )}
                        <div>
                          <div className="text-xs text-emerald-800 font-bold">
                            ✓ {studentFileName || "Berkas lembar jawaban siap dikoreksi"}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Klik di sini untuk mengganti dengan berkas lain
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          Pilih / Tarik Berkas Lembar Jawaban Siswa
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                          Mendukung <b>Word (.docx)</b>, <b>PDF (.pdf)</b> hasil scan tulisan tangan, atau{" "}
                          <b>Foto kamera HP (JPG / PNG)</b>.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Tuliskan nomor soal dan jawaban Arab di area kanvas ini:</span>
                    <button
                      onClick={clearCanvas}
                      className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-medium"
                    >
                      <Eraser className="w-3 h-3" /> Bersihkan Kanvas
                    </button>
                  </div>
                  <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner flex justify-center">
                    <canvas
                      ref={canvasRef}
                      width={620}
                      height={240}
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

              {errorMsg && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Perhatian: </span>
                    {errorMsg}
                  </div>
                </div>
              )}

              <button
                onClick={handleGrade}
                disabled={isLoading}
                className="w-full mt-4 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{loadingStep || "Sedang memeriksa seluruh soal..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4.5 h-4.5" />
                    <span>Mulai Koreksi Otomatis ({questions.length} Soal)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Section Hasil Koreksi Ujian (Batch Multi-Soal) */}
        {result && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
            {/* Header Rekapitulasi Nilai */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  Laporan Hasil Koreksi Ujian
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-2">{examTitle}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dievaluasi berdasarkan keselarasan makna inti argumen dan rubrik guru
                </p>
              </div>

              {/* Score Indicator */}
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <div className="text-right">
                  <div className="text-3xl font-black text-slate-900">
                    {result.totalScore}
                    <span className="text-sm font-normal text-slate-400">/{result.maxTotalScore}</span>
                  </div>
                  <div className="text-xs font-semibold text-emerald-700">
                    Nilai Akhir: {result.percentage}%
                  </div>
                </div>

                <div className="h-10 w-px bg-slate-200" />

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-emerald-100/70 border border-emerald-200 px-2 py-1 rounded-lg">
                    <div className="font-bold text-emerald-800">{result.summary.correctCount}</div>
                    <div className="text-[10px] text-emerald-700">Benar</div>
                  </div>
                  <div className="bg-amber-100/70 border border-amber-200 px-2 py-1 rounded-lg">
                    <div className="font-bold text-amber-800">{result.summary.partialCount}</div>
                    <div className="text-[10px] text-amber-700">Sebagian</div>
                  </div>
                  <div className="bg-rose-100/70 border border-rose-200 px-2 py-1 rounded-lg">
                    <div className="font-bold text-rose-800">{result.summary.incorrectCount}</div>
                    <div className="text-[10px] text-rose-700">Salah</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Evaluasi Umum */}
            {result.summary.overallEvaluation && (
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Ringkasan Evaluasi AI: </span>
                  {result.summary.overallEvaluation}
                </div>
              </div>
            )}

            {/* Rincian Hasil Per Nomor Soal */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" /> Rincian Penilaian Per Nomor Soal:
              </h4>

              <div className="space-y-4">
                {result.questionResults.map((qr, idx) => (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-2xl p-5 bg-white shadow-xs space-y-3"
                  >
                    {/* Header Soal */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                          Soal #{qr.questionNumber || idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{qr.questionText}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {qr.status === "CORRECT" && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> BENAR PENUH
                          </span>
                        )}
                        {qr.status === "PARTIAL" && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5" /> BENAR SEBAGIAN
                          </span>
                        )}
                        {qr.status === "INCORRECT" && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" /> BELUM TEPAT
                          </span>
                        )}
                        <span className="text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                          {qr.score} / {qr.maxScore}
                        </span>
                      </div>
                    </div>

                    {/* Kunci Jawaban vs Jawaban Siswa */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Kunci Guru */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Kunci Jawaban Guru:
                        </span>
                        <div
                          className="font-arabic text-base text-right leading-relaxed text-slate-800 pt-1"
                          dir="rtl"
                        >
                          {qr.teacherKey}
                        </div>
                      </div>

                      {/* Transkripsi Siswa */}
                      <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                            Jawaban Siswa (Transkripsi AI):
                          </span>
                          <button
                            onClick={() => copyTranscription(qr.studentTranscription, idx)}
                            className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                          >
                            {copiedIndex === idx ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedIndex === idx ? "Tersalin" : "Salin"}</span>
                          </button>
                        </div>
                        <div
                          className="font-arabic text-base text-right leading-relaxed text-slate-900 pt-1 font-semibold"
                          dir="rtl"
                        >
                          {qr.studentTranscription || "(Tidak ditemukan jawaban untuk nomor ini)"}
                        </div>
                        {qr.studentTranslation && (
                          <div className="text-[11px] text-slate-500 italic pt-1 border-t border-emerald-200/60">
                            Artinya: &ldquo;{qr.studentTranslation}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Analisis Kesesuaian Makna / Argumen */}
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
                      <div className="font-bold flex items-center gap-1 text-amber-900">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Analisis Kesesuaian Makna / Argumen:
                      </div>
                      <p className="leading-relaxed">{qr.semanticAnalysis}</p>
                      {qr.synonymNotes && (
                        <p className="text-[11px] text-amber-800 pt-1 font-medium border-t border-amber-200/60">
                          💡 Catatan Sinonim: {qr.synonymNotes}
                        </p>
                      )}
                    </div>

                    {/* Feedback Siswa */}
                    {qr.feedback && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-1.5">
                        <span className="font-bold text-slate-700">Saran Siswa:</span>
                        <span>{qr.feedback}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Print button */}
            <div className="pt-2 flex justify-end no-print">
              <button
                onClick={() => window.print()}
                className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" /> Cetak Laporan Nilai Lengkap / Simpan PDF
              </button>
            </div>
          </div>
        )}
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
              Sistem menggunakan model <b>Gemini Vision</b> untuk membaca berkas Word, PDF, dan foto tulisan tangan.
              Dapatkan API Key gratis di <b>Google AI Studio</b>.
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
