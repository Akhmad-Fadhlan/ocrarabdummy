"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  PenTool,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BookOpen,
  Printer,
  Copy,
  Check,
  FileText,
  Sliders,
  Eraser,
  Plus,
  Trash2,
  FileCheck,
  FileType,
  Files,
  ArrowRight,
  HelpCircle,
  GraduationCap,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  FileDown,
  Info,
} from "lucide-react";
import {
  GradingMode,
  HarakatRule,
  ExamQuestion,
  BatchGradingResult,
  ExtractExamResponse,
} from "@/types/grading";

// Skenario Preset UAT Siap Uji
interface UatScenario {
  id: string;
  name: string;
  tag: string;
  desc: string;
  questions: ExamQuestion[];
  studentAnswerArabic: string;
  studentAnswerFileName: string;
}

const UAT_SCENARIOS: UatScenario[] = [
  {
    id: "semantic-match",
    name: "Kasus 1: Redaksi Beda, Makna Sama (Esai)",
    tag: "Uji Semantik 100%",
    desc: "Siswa menjawab dengan kosakata berbeda total, namun intinya selaras dengan kunci guru.",
    questions: [
      {
        id: "q1",
        number: 1,
        text: "لماذا يجب على كل مسلم أن يتعلم اللغة العربية؟ (Jelaskan argumen mengapa setiap muslim perlu mempelajari bahasa Arab)",
        answerKey: "لأنها لغة القرآن الكريم والحديث النبوي ومفتاح لفهم الشريعة الإسلامية وأداء العبادات بشكل صحيح.",
        maxScore: 50,
      },
      {
        id: "q2",
        number: 2,
        text: "ما هو دور الطبيب وواجبه نحو المرضى في المستشفى؟ (Apa tugas dokter terhadap pasien?)",
        answerKey: "يقوم الطبيب بفحص المرضى ومعالجتهم وتخفيف آلامهم ووصف الدواء المناسب لهم.",
        maxScore: 50,
      },
    ],
    studentAnswerArabic:
      "١. لكي نفهم كتاب الله الكريم ونفهم معاني آيات القرآن والصلاة المفروضة.\n٢. يعالج الطبيب المرضى في المستشفى ويعطيهم الدواء للشفاء بإذن الله.",
    studentAnswerFileName: "lembar_jawaban_siswa_kasus1.jpg",
  },
  {
    id: "partial-match",
    name: "Kasus 2: Jawaban Benar Sebagian",
    tag: "Uji Skor Parsial",
    desc: "Siswa hanya menyebutkan sebagian poin dari kunci jawaban yang diminta guru.",
    questions: [
      {
        id: "q1",
        number: 1,
        text: "اذكر فائدتين من فوائد الصيام في شهر رمضان المبارك. (Sebutkan 2 faedah puasa Ramadhan)",
        answerKey: "الفائدة الأولى: التقوى والتقرب إلى الله تعالى، والفائدة الثانية: ترويض النفس والصبر ومواساة الفقراء.",
        maxScore: 50,
      },
      {
        id: "q2",
        number: 2,
        text: "أين يذهب التلاميذ في الصباح ولماذا؟ (Ke mana para murid pergi di pagi hari dan untuk apa?)",
        answerKey: "يذهب التلاميذ في الصباح الباكر إلى المدرسة طلباً للعلم والمعرفة.",
        maxScore: 50,
      },
    ],
    studentAnswerArabic:
      "١. الصيام يعلمنا الصبر فقط.\n٢. يذهب التلاميذ إلى المدرسة صباحاً.",
    studentAnswerFileName: "lembar_jawaban_siswa_kasus2.jpg",
  },
  {
    id: "nahwu-irab",
    name: "Kasus 3: Tata Bahasa & Harakat (Nahwu)",
    tag: "Uji Harakat Ketat",
    desc: "Menguji ketepatan baris/harakat i'rab pada fa'il dan maf'ul bih.",
    questions: [
      {
        id: "q1",
        number: 1,
        text: "اكتب جملة فعلية صحيحة مع ضبط أواخر الكلمات بالشكل التام. (Tuliskan sebuah jumlah fi'liyyah dengan harakat i'rab lengkap)",
        answerKey: "قَرَأَ التِّلْمِيذُ الْكِتَابَ فِي الْمَكْتَبَةِ.",
        maxScore: 100,
      },
    ],
    studentAnswerArabic: "قَرَأَ الطَّالِبُ الْكِتَابَ فِي الْمَكْتَبَةِ.",
    studentAnswerFileName: "lembar_jawaban_siswa_kasus3.jpg",
  },
];

// Helper aman membaca respon API
async function parseApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Error ${response.status}: Permintaan gagal.`);
    }
    return data as T;
  } else {
    const text = await response.text();
    throw new Error(
      `Respon server bukan JSON (${response.status} ${response.statusText}): ${text.substring(0, 120)}`
    );
  }
}

export default function Home() {
  // State Guru (Daftar Soal & Kunci)
  const [examTitle, setExamTitle] = useState("Ujian Bahasa Arab & Pemahaman");
  const [questions, setQuestions] = useState<ExamQuestion[]>(UAT_SCENARIOS[0].questions);
  const [teacherTab, setTeacherTab] = useState<"separate" | "single" | "manual">("separate");

  // Upload Terpisah (Soal & Kunci)
  const [questionFileBase64, setQuestionFileBase64] = useState<string | null>(null);
  const [questionFileName, setQuestionFileName] = useState<string>("");
  const [questionFileMime, setQuestionFileMime] = useState<string>("");
  const qFileInputRef = useRef<HTMLInputElement | null>(null);

  const [answerKeyFileBase64, setAnswerKeyFileBase64] = useState<string | null>(null);
  const [answerKeyFileName, setAnswerKeyFileName] = useState<string>("");
  const [answerKeyFileMime, setAnswerKeyFileMime] = useState<string>("");
  const aFileInputRef = useRef<HTMLInputElement | null>(null);

  // Upload Tunggal Guru
  const [singleTeacherFileBase64, setSingleTeacherFileBase64] = useState<string | null>(null);
  const [singleTeacherFileName, setSingleTeacherFileName] = useState<string>("");
  const [singleTeacherFileMime, setSingleTeacherFileMime] = useState<string>("");
  const singleFileInputRef = useRef<HTMLInputElement | null>(null);

  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // State Siswa
  const [studentTab, setStudentTab] = useState<"upload" | "canvas">("upload");
  const [studentFileBase64, setStudentFileBase64] = useState<string | null>(null);
  const [studentFileMimeType, setStudentFileMimeType] = useState<string>("image/jpeg");
  const [studentFileName, setStudentFileName] = useState<string>("");
  const studentFileInputRef = useRef<HTMLInputElement | null>(null);

  // State Kanvas Coret Siswa (Responsive & Touch-Friendly)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Konfigurasi Penilaian
  const [mode, setMode] = useState<GradingMode>("semantic_argument");
  const [harakatRule, setHarakatRule] = useState<HarakatRule>("ignore");

  // State Penilaian & Hasil
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<BatchGradingResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // Section Ref for Auto-Scroll
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const studentSectionRef = useRef<HTMLDivElement | null>(null);

  // Hitung total bobot soal
  const totalMaxScore = questions.reduce((sum, q) => sum + (Number(q.maxScore) || 0), 0);

  // Setup Canvas bergaris dengan skalabilitas responsive
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

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Handler Upload Berkas Soal Terpisah
  const handleQuestionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQuestionFileName(file.name);
    setQuestionFileMime(file.type || "application/octet-stream");
    const reader = new FileReader();
    reader.onload = () => {
      setQuestionFileBase64(reader.result as string);
      showToast(`Berkas Soal "${file.name}" siap.`);
    };
    reader.readAsDataURL(file);
  };

  // Handler Upload Berkas Kunci Terpisah
  const handleAnswerKeyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnswerKeyFileName(file.name);
    setAnswerKeyFileMime(file.type || "application/octet-stream");
    const reader = new FileReader();
    reader.onload = () => {
      setAnswerKeyFileBase64(reader.result as string);
      showToast(`Berkas Kunci "${file.name}" siap.`);
    };
    reader.readAsDataURL(file);
  };

  // Ekstrak Berkas Terpisah
  const handleExtractSeparate = async () => {
    if (!questionFileBase64 && !answerKeyFileBase64) {
      setExtractError("Mohon unggah minimal salah satu berkas (Soal atau Kunci Jawaban).");
      return;
    }

    setIsExtractingDoc(true);
    setExtractError(null);

    try {
      const response = await fetch("/api/extract-exam-separate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionFileBase64,
          questionFileName,
          questionFileMimeType: questionFileMime,
          answerKeyFileBase64,
          answerKeyFileName,
          answerKeyFileMimeType: answerKeyFileMime,
        }),
      });

      const data = await parseApiResponse<ExtractExamResponse>(response);
      if (data.title) setExamTitle(data.title);
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setTeacherTab("manual");
        showToast(`Berhasil memadukan ${data.questions.length} nomor soal!`);
      }
    } catch (err: any) {
      setExtractError(err.message || "Gagal memproses berkas terpisah.");
    } finally {
      setIsExtractingDoc(false);
    }
  };

  // Ekstrak 1 Berkas Gabung
  const handleSingleTeacherFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSingleTeacherFileName(file.name);
    setSingleTeacherFileMime(file.type || "application/octet-stream");
    setExtractError(null);
    setIsExtractingDoc(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setSingleTeacherFileBase64(base64);
      try {
        const response = await fetch("/api/extract-exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: base64,
            fileMimeType: file.type || "application/octet-stream",
            fileName: file.name,
          }),
        });

        const data = await parseApiResponse<ExtractExamResponse>(response);
        if (data.title) setExamTitle(data.title);
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setTeacherTab("manual");
          showToast(`Berhasil mengekstrak ${data.questions.length} nomor soal!`);
        }
      } catch (err: any) {
        setExtractError(err.message || "Gagal mengekstrak dokumen soal.");
      } finally {
        setIsExtractingDoc(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload Berkas Siswa
  const handleStudentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStudentFileName(file.name);
    setStudentFileMimeType(file.type || "application/octet-stream");

    const reader = new FileReader();
    reader.onload = () => {
      setStudentFileBase64(reader.result as string);
      setErrorMsg(null);
      showToast(`Berkas siswa "${file.name}" siap.`);
    };
    reader.readAsDataURL(file);
  };

  // Responsive Canvas Coordinates (Menghindari distorsi koordinat di HP/Tablet)
  const getCanvasCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
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

  // Load Skenario UAT
  const applyScenario = (scenario: UatScenario) => {
    setQuestions(scenario.questions);
    setStudentTab("canvas");
    setErrorMsg(null);
    setResult(null);

    if (scenario.id === "nahwu-irab") {
      setHarakatRule("strict_irab");
    } else {
      setHarakatRule("ignore");
    }

    setTimeout(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawCanvasBackground(ctx, canvas);
          ctx.font = "bold 24px var(--font-amiri), serif";
          ctx.fillStyle = "#0f172a";
          ctx.direction = "rtl";
          ctx.textAlign = "right";

          const lines = scenario.studentAnswerArabic.split("\n");
          let currentY = 75;
          for (const line of lines) {
            ctx.fillText(line, canvas.width - 24, currentY);
            currentY += 65;
          }

          const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
          setStudentFileBase64(dataUrl);
          setStudentFileMimeType("image/jpeg");
          setStudentFileName(scenario.studentAnswerFileName);
        }
      }
    }, 150);

    showToast(`Skenario "${scenario.name}" berhasil dimuat!`);
    studentSectionRef.current?.scrollIntoView({ behavior: "smooth" });
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
    setLoadingStep("1/3 Membaca & mengekstrak jawaban siswa dari berkas...");

    const timer1 = setTimeout(() => {
      setLoadingStep("2/3 Menganalisis keselarasan makna & esensi argumen...");
    }, 3500);

    const timer2 = setTimeout(() => {
      setLoadingStep("3/3 Menghitung skor akumulatif & menyusun rekap nilai...");
    }, 7000);

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
        }),
      });

      const data = await parseApiResponse<BatchGradingResult>(response);
      setResult(data);
      showToast("Pemeriksaan selesai!");

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
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
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Navbar Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-500 flex items-center justify-center text-white font-bold text-xl shadow-xs ring-2 ring-emerald-500/20">
              ض
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Tashih Arabi</h1>
                <span className="text-[10px] sm:text-xs bg-emerald-100/90 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                  UAT Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Koreksi Ujian Bahasa Arab Tulis Tangan & Dokumen Berbasis Makna
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => applyScenario(UAT_SCENARIOS[0])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Muat Sampel Cepat</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner UAT: 3 Skenario Uji Coba Cepat */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Skenario Uji Coba (UAT Scenarios)</h2>
            </div>
            <span className="text-xs text-slate-500">Pilih skenario untuk menguji kemampuan AI secara instan</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {UAT_SCENARIOS.map((sc) => (
              <div
                key={sc.id}
                onClick={() => applyScenario(sc)}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer group shadow-2xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                    {sc.name}
                  </span>
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                    {sc.tag}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{sc.desc}</p>
                <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 pt-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Terapkan Skenario</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Steps Indicator */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0">
              1
            </span>
            <span className="font-semibold text-slate-700 truncate">1. Soal & Kunci Guru</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0">
              2
            </span>
            <span className="font-semibold text-slate-700 truncate">2. Lembar Jawaban Siswa</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0">
              3
            </span>
            <span className="font-semibold text-slate-700 truncate">3. Hasil Koreksi AI</span>
          </div>
        </div>

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Panel Guru & Kunci Jawaban (6 Cols) */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">1. Soal & Kunci Jawaban Guru</h3>
                    <p className="text-[11px] text-slate-500">
                      {questions.length} Soal terdaftar • Total Bobot: {totalMaxScore} Poin
                    </p>
                  </div>
                </div>

                {/* Tabs Panel Guru */}
                <div className="flex p-0.5 bg-slate-100 rounded-xl text-xs font-medium self-start sm:self-auto overflow-x-auto max-w-full">
                  <button
                    onClick={() => setTeacherTab("separate")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      teacherTab === "separate"
                        ? "bg-white text-emerald-700 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Upload Terpisah
                  </button>
                  <button
                    onClick={() => setTeacherTab("single")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      teacherTab === "single"
                        ? "bg-white text-emerald-700 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    1 Berkas Gabung
                  </button>
                  <button
                    onClick={() => setTeacherTab("manual")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      teacherTab === "manual"
                        ? "bg-white text-emerald-700 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Editor Soal ({questions.length})
                  </button>
                </div>
              </div>

              {/* Tab 1: Upload Soal & Kunci TERPISAH */}
              {teacherTab === "separate" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Kotak Upload 1: Berkas Soal */}
                    <div
                      onClick={() => qFileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition-all bg-slate-50/60 hover:bg-blue-50/30 flex flex-col items-center justify-center min-h-[140px] group"
                    >
                      <input
                        type="file"
                        ref={qFileInputRef}
                        onChange={handleQuestionFileChange}
                        accept=".docx,.pdf,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                      />
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">1. Berkas Soal Ujian</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Word (.docx) atau PDF</p>
                      {questionFileName ? (
                        <div className="mt-2 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 truncate max-w-full flex items-center gap-1">
                          <Check className="w-3 h-3 text-blue-600" />
                          <span className="truncate">{questionFileName}</span>
                        </div>
                      ) : (
                        <span className="mt-2 text-[10px] text-slate-400">Pilih Berkas Soal</span>
                      )}
                    </div>

                    {/* Kotak Upload 2: Berkas Kunci Jawaban */}
                    <div
                      onClick={() => aFileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer transition-all bg-slate-50/60 hover:bg-emerald-50/30 flex flex-col items-center justify-center min-h-[140px] group"
                    >
                      <input
                        type="file"
                        ref={aFileInputRef}
                        onChange={handleAnswerKeyFileChange}
                        accept=".docx,.pdf,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                      />
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">2. Berkas Kunci Jawaban</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Word (.docx) atau PDF</p>
                      {answerKeyFileName ? (
                        <div className="mt-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 truncate max-w-full flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="truncate">{answerKeyFileName}</span>
                        </div>
                      ) : (
                        <span className="mt-2 text-[10px] text-slate-400">Pilih Berkas Kunci</span>
                      )}
                    </div>
                  </div>

                  {extractError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{extractError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleExtractSeparate}
                    disabled={isExtractingDoc || (!questionFileBase64 && !answerKeyFileBase64)}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-98"
                  >
                    {isExtractingDoc ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>AI sedang memadukan Soal & Kunci Jawaban...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Padukan & Ekstrak Soal + Kunci Jawaban</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Tab 2: Upload 1 Berkas Gabungan */}
              {teacherTab === "single" && (
                <div className="space-y-4">
                  <div
                    onClick={() => singleFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/30 flex flex-col items-center justify-center min-h-[160px]"
                  >
                    <input
                      type="file"
                      ref={singleFileInputRef}
                      onChange={handleSingleTeacherFileUpload}
                      accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                    />

                    {isExtractingDoc ? (
                      <div className="space-y-2 flex flex-col items-center">
                        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-700 font-semibold">
                          AI sedang membaca dokumen soal & kunci...
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                          <FileType className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          Unggah 1 Berkas Gabungan (Soal & Kunci dalam 1 file)
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Mendukung format Word (.docx) atau PDF</p>
                        {singleTeacherFileName && (
                          <div className="mt-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
                            Berkas: {singleTeacherFileName}
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
              )}

              {/* Tab 3: Editor Soal & Kunci */}
              {teacherTab === "manual" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      placeholder="Judul Ujian..."
                      className="text-xs font-bold text-slate-800 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 w-full focus:bg-white transition-colors"
                    />
                    <button
                      onClick={addQuestion}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Soal
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 relative group hover:border-emerald-300 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
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
                                className="w-12 text-center text-xs py-1 px-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                              />
                              <span>poin</span>
                            </div>
                            <button
                              onClick={() => removeQuestion(q.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
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
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
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
                            placeholder="Jawaban benar atau inti argumen guru..."
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-arabic text-right leading-relaxed"
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
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" /> Mode Penilaian
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-start gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 cursor-pointer text-xs transition-colors">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "semantic_argument"}
                      onChange={() => setMode("semantic_argument")}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Inti Argumen & Makna</div>
                      <div className="text-[10px] text-slate-500">Redaksi boleh beda asalkan maknanya tepat.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 cursor-pointer text-xs transition-colors">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "strict_literal"}
                      onChange={() => setMode("strict_literal")}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Ketat / Literal</div>
                      <div className="text-[10px] text-slate-500">Kosakata harus persis dengan kunci guru.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Aturan Harakat (I&apos;rab)
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-start gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 cursor-pointer text-xs transition-colors">
                    <input
                      type="radio"
                      name="harakat"
                      checked={harakatRule === "ignore"}
                      onChange={() => setHarakatRule("ignore")}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Abaikan Harakat</div>
                      <div className="text-[10px] text-slate-500">Fokus pada substansi makna kata dasar.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 cursor-pointer text-xs transition-colors">
                    <input
                      type="radio"
                      name="harakat"
                      checked={harakatRule === "strict_irab"}
                      onChange={() => setHarakatRule("strict_irab")}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
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
          <div ref={studentSectionRef} className="lg:col-span-6 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">2. Lembar Jawaban Siswa</h3>
                    <p className="text-[11px] text-slate-500">Mendukung Word (.docx), PDF (.pdf), atau Foto</p>
                  </div>
                </div>

                <div className="flex p-0.5 bg-slate-100 rounded-xl text-xs font-medium self-start sm:self-auto">
                  <button
                    onClick={() => setStudentTab("upload")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      studentTab === "upload"
                        ? "bg-white text-emerald-700 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Upload Berkas / Foto
                  </button>
                  <button
                    onClick={() => setStudentTab("canvas")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      studentTab === "canvas"
                        ? "bg-white text-emerald-700 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
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
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/60 hover:bg-emerald-50/30 flex flex-col items-center justify-center min-h-[220px] group"
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
                          <div className="relative inline-block max-h-52 overflow-hidden rounded-xl border border-slate-200 shadow-xs">
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
                          <div className="text-xs text-emerald-900 font-bold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>{studentFileName || "Berkas lembar jawaban siap dikoreksi"}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Klik di sini untuk mengganti dengan berkas lain
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                          <Upload className="w-7 h-7" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          Pilih / Tarik Berkas Lembar Jawaban Siswa
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                          Mendukung <b>Word (.docx)</b>, <b>PDF (.pdf)</b> scan tulisan tangan, atau{" "}
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
                      className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      <Eraser className="w-3.5 h-3.5" /> Bersihkan Kanvas
                    </button>
                  </div>
                  <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-inner flex justify-center touch-none">
                    <canvas
                      ref={canvasRef}
                      width={680}
                      height={260}
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
                  <p className="text-[10px] text-slate-400 text-center">
                    Gunakan jari atau stylus pada layar sentuh / mouse di komputer
                  </p>
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
                className="w-full mt-4 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-98"
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
          <div
            ref={resultsRef}
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-300"
          >
            {/* Header Rekapitulasi Nilai */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200">
                  Laporan Hasil Koreksi Ujian
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{examTitle}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Evaluasi berbasis keselarasan makna inti argumen dan kaidah bahasa Arab
                </p>
              </div>

              {/* Score Indicator */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 bg-slate-50/80 border border-slate-200 p-4 rounded-2xl shadow-2xs">
                <div className="text-left sm:text-right">
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {result.totalScore}
                    <span className="text-base font-normal text-slate-400">/{result.maxTotalScore}</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-700">
                    Nilai Akhir: {result.percentage}%
                  </div>
                </div>

                <div className="hidden sm:block h-12 w-px bg-slate-200" />

                <div className="grid grid-cols-3 gap-2 text-center text-xs w-full sm:w-auto">
                  <div className="bg-emerald-100/80 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    <div className="font-extrabold text-emerald-900 text-sm">{result.summary.correctCount}</div>
                    <div className="text-[10px] text-emerald-700 font-medium">Benar</div>
                  </div>
                  <div className="bg-amber-100/80 border border-amber-200 px-3 py-1.5 rounded-xl">
                    <div className="font-extrabold text-amber-900 text-sm">{result.summary.partialCount}</div>
                    <div className="text-[10px] text-amber-700 font-medium">Sebagian</div>
                  </div>
                  <div className="bg-rose-100/80 border border-rose-200 px-3 py-1.5 rounded-xl">
                    <div className="font-extrabold text-rose-900 text-sm">{result.summary.incorrectCount}</div>
                    <div className="text-[10px] text-rose-700 font-medium">Salah</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Evaluasi Umum */}
            {result.summary.overallEvaluation && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl text-xs text-emerald-950 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-emerald-900">Ringkasan Evaluasi AI: </span>
                  <p className="leading-relaxed">{result.summary.overallEvaluation}</p>
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
                    className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-2xs space-y-3"
                  >
                    {/* Header Soal */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg">
                          Soal #{qr.questionNumber || idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{qr.questionText}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
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
                        <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
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
                          className="font-arabic text-base sm:text-lg text-right leading-loose text-slate-800 pt-1"
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
                            className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
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
                          className="font-arabic text-base sm:text-lg text-right leading-loose text-slate-900 pt-1 font-semibold"
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
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
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
                className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" /> Cetak Laporan Nilai Lengkap / Simpan PDF
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
