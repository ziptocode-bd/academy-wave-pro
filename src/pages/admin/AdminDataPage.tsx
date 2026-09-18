import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { examDb } from "@/lib/examFirebase";
import { toast } from "sonner";
import { Download, Upload, ChevronDown, HardDrive, ArrowLeft } from "lucide-react";
import { Course } from "@/types";
import { useNavigate } from "react-router-dom";
import { invalidateCache, bumpVersion } from "@/lib/firestoreCache";

const MAIN_COLLECTIONS = ["users", "courses", "videos", "settings", "enrollRequests"];
const EXAM_COLLECTIONS = ["exams", "submissions", "examEntries"];
const ALL_COLLECTIONS = [...MAIN_COLLECTIONS, ...EXAM_COLLECTIONS];

const LABELS: Record<string, string> = {
  users: "Users",
  courses: "Courses",
  videos: "Videos",
  settings: "Settings",
  enrollRequests: "Enroll Requests",
  exams: "Exams",
  submissions: "Submissions",
  examEntries: "Exam Entries",
};

const dbFor = (col: string) => (EXAM_COLLECTIONS.includes(col) ? examDb : db);

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export default function AdminDataPage() {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selected, setSelected] = useState<string[]>([...ALL_COLLECTIONS]);

  const toggle = (col: string) =>
    setSelected(prev => (prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]));
  const setGroup = (group: string[], on: boolean) =>
    setSelected(prev => (on ? Array.from(new Set([...prev, ...group])) : prev.filter(c => !group.includes(c))));

  useEffect(() => {
    getDocs(collection(db, "courses")).then(snap => {
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
    });
  }, []);

  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const today = () => new Date().toISOString().slice(0, 10);

  const handleExport = async () => {
    if (!selected.length) { toast.error("অন্তত একটি collection সিলেক্ট করো"); return; }
    setExporting("selected");
    try {
      const all: Record<string, any[]> = {};
      for (const c of selected) {
        const snap = await getDocs(collection(dbFor(c), c));
        all[c] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      downloadJson(all, `lms-backup-${today()}.json`);
      toast.success("Export complete");
    } catch (err: any) { toast.error(err.message || "Export failed"); }
    setExporting(null);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!selected.length) { toast.error("অন্তত একটি collection সিলেক্ট করো"); e.target.value = ""; return; }
    setImporting("selected");
    try {
      const raw = JSON.parse(await file.text());
      const { _meta, ...data } = raw as Record<string, any[]>;
      let count = 0;
      const touched = new Set<string>();
      for (const [colName, docs] of Object.entries(data)) {
        if (!Array.isArray(docs) || !selected.includes(colName)) continue;
        for (const docData of docs) {
          const { id, ...rest } = docData;
          if (!id) continue;
          await setDoc(doc(dbFor(colName), colName, id), rest, { merge: true });
          count++;
        }
        touched.add(colName);
      }
      for (const colName of touched) {
        invalidateCache(colName);
        await bumpVersion(dbFor(colName), colName);
      }
      if (!touched.size) toast.error("ফাইলে সিলেক্ট করা কোনো collection পাওয়া যায়নি");
      else toast.success(`Imported ${count} document(s)`);
    } catch (err: any) { toast.error(err.message || "Import failed"); }
    setImporting(null); e.target.value = "";
  };

  const handleCourseBackupExport = async () => {
    if (!selectedCourse) { toast.error("Select a course"); return; }
    setExporting("course");
    try {
      const course = courses.find(c => c.id === selectedCourse);
      const [usersSnap, videosSnap, enrollReqSnap, examsSnap, submissionsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "videos")),
        getDocs(collection(db, "enrollRequests")),
        getDocs(collection(examDb, "exams")),
        getDocs(collection(examDb, "submissions")),
      ]);
      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => u.enrolledCourses?.some((c: any) => c.courseId === selectedCourse) || u.activeCourseId === selectedCourse);
      const videos = videosSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((v: any) => v.courseId === selectedCourse);
      const enrollRequests = enrollReqSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((r: any) => r.courseId === selectedCourse);
      const exams = examsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((e: any) => e.courseId === selectedCourse);
      const examIds = exams.map((e: any) => e.id);
      const submissions = submissionsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((s: any) => examIds.includes(s.examId));
      downloadJson(
        { course: course ?? null, users, videos, enrollRequests, exams, submissions },
        `course-backup-${course?.courseName?.replace(/\s+/g, "-") || selectedCourse}-${today()}.json`
      );
      toast.success("Export complete");
    } catch (err: any) { toast.error(err.message || "Export failed"); }
    setExporting(null);
  };

  const busy = !!exporting || !!importing;

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-2">
        <button onClick={() => navigate("/admin")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <HardDrive className="h-5 w-5" /> Backup & Restore
        </h2>
      </div>

      <div className="p-4 max-w-xl mx-auto space-y-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          {[
            { label: "Main Firebase", cols: MAIN_COLLECTIONS },
            { label: "Exam Firebase", cols: EXAM_COLLECTIONS },
          ].map(group => (
            <div key={group.label}>
              <label className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={group.cols.every(c => selected.includes(c))}
                  onChange={e => setGroup(group.cols, e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-medium text-foreground">{group.label}</span>
              </label>
              <div className="mt-1 pl-4 grid grid-cols-2 gap-1">
                {group.cols.map(col => (
                  <label key={col} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(col)}
                      onChange={() => toggle(col)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm text-foreground">{LABELS[col]}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-3 border-t border-border">
            <button
              onClick={handleExport}
              disabled={busy || !selected.length}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40"
            >
              {exporting === "selected" ? <Spinner /> : <Download className="h-4 w-4" />} Export
            </button>
            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer ${(busy || !selected.length) ? "opacity-40 pointer-events-none" : ""}`}>
              {importing === "selected" ? <Spinner /> : <Upload className="h-4 w-4" />} Import
              <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={busy || !selected.length} />
            </label>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex gap-2">
          <div className="relative flex-1">
            <select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Course backup…</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.courseName}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          <button
            onClick={handleCourseBackupExport}
            disabled={!selectedCourse || busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {exporting === "course" ? <Spinner /> : <Download className="h-4 w-4" />} Export
          </button>
        </div>
      </div>
    </div>
  );
}
