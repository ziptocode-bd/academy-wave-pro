import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { Link, useNavigate } from "react-router-dom";
import {
  Users, Clock, BookOpen, Video as VideoIcon, Youtube,
  HardDrive, FileText, ArrowUpRight,
  LayoutDashboard, Plus, Radio, Eye, SquareCheck, ExternalLink,
} from "lucide-react";
import { AdminDashboardSkeleton } from "@/components/skeletons";
import { getCachedCollection, invalidateCache, bumpVersion } from "@/lib/firestoreCache";
import { getStats, initStats } from "@/lib/statsUtils";
import { clearLiveChat } from "@/lib/liveChatFirebase";
import { doc, updateDoc } from "firebase/firestore";
import { Video } from "@/types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminDashboard() {
  const settings = useAppSettings();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, pending: 0, courses: 0, videos: 0, exams: 0 });
  const [liveVideos, setLiveVideos] = useState<Video[]>([]);
  const [endingLiveVideo, setEndingLiveVideo] = useState<Video | null>(null);
  const [endPdfUrl, setEndPdfUrl] = useState("");
  const [endingProcess, setEndingProcess] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLiveVideos = async () => {
    try {
      const vids = await getCachedCollection<Video>(db, "videos");
      setLiveVideos(vids.filter((v) => !!v.isLive));
    } catch (e) {
      console.error("Error fetching live videos:", e);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        await fetchLiveVideos();

        // ── Fast path: single doc read ─────────────────────────────────────
        const cached = await getStats(db);

        if (cached) {
          setStats({
            users  : cached.totalStudents,
            pending: cached.pendingCount,
            courses: cached.totalCourses,
            videos : cached.totalVideos,
            exams  : cached.totalExams,
          });
          setLoading(false);
          return;                    // ← 1 Firestore read total, done
        }

        // ── Slow path (first ever run): full collection fetch → seed doc ───
        const [allUsers, coursesData, videosData, enrollRequestsData] = await Promise.all([
          getCachedCollection<any>(db, "users"),
          getCachedCollection<any>(db, "courses"),
          getCachedCollection<any>(db, "videos"),
          getCachedCollection<any>(db, "enrollRequests"),
        ]);

        let examsCount = 0;
        try {
          const { examDb } = await import("@/lib/examFirebase");
          const examsData = await getCachedCollection<any>(examDb, "exams");
          examsCount = examsData.length;
        } catch (examErr) {
          console.error("Error fetching exams for dashboard:", examErr);
        }

        const students = allUsers.filter((u: any) => u.role === "student");
        const pendingRequestUserIds = new Set(
          enrollRequestsData
            .filter((r: any) => r.status === "pending")
            .map((d: any) => d.userId),
        );
        const pendingUsers = students.filter((u: any) => u.status === "pending");
        const approvedWithPending = students.filter(
          (u: any) => u.status !== "pending" && pendingRequestUserIds.has(u.id),
        );
        const pendingCount = pendingUsers.length + approvedWithPending.length;

        const derived = {
          users  : students.length,
          pending: pendingCount,
          courses: coursesData.length,
          videos : videosData.length,
          exams  : examsCount,
        };

        setStats(derived);

        // Seed the stats doc so future loads hit the fast path
        initStats(db, {
          totalStudents: derived.users,
          pendingCount : derived.pending,
          totalCourses : derived.courses,
          totalVideos  : derived.videos,
          totalExams   : derived.exams,
        });
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleOpenEndDialog = (video: Video) => {
    setEndingLiveVideo(video);
    setEndPdfUrl(video.pdfURL || "");
  };

  const handleConfirmEndLive = async () => {
    if (!endingLiveVideo) return;
    setEndingProcess(true);
    try {
      // 1. Update video document (set isLive: false and update pdfURL)
      await updateDoc(doc(db, "videos", endingLiveVideo.id), {
        isLive: false,
        pdfURL: endPdfUrl.trim(),
      });

      // 2. Clear Realtime Database chat for this video
      await clearLiveChat(endingLiveVideo.id);

      // 3. Invalidate cache
      invalidateCache("videos");
      await bumpVersion(db, "videos");

      setLiveVideos((prev) => prev.filter((v) => v.id !== endingLiveVideo.id));
      toast.success("লাইভ ক্লাস সফলভাবে সমাপ্ত হয়েছে ও চ্যাট পরিষ্কার করা হয়েছে");
      setEndingLiveVideo(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to end live class");
    } finally {
      setEndingProcess(false);
    }
  };

  // ─── Card definitions ─────────────────────────────────────────────────────

  const primaryCards = [
    {
      label      : "Total Students",
      value      : stats.users,
      icon       : Users,
      to         : "/admin/users",
      color      : "text-blue-500",
      bg         : "bg-blue-500/10",
      border     : "border-blue-500/20",
      hoverBorder: "hover:border-blue-500/40",
      hoverBg    : "hover:bg-blue-500/5",
    },
    {
      label      : "Pending Approvals",
      value      : stats.pending,
      icon       : Clock,
      to         : "/admin/users?status=pending",
      color      : "text-amber-500",
      bg         : "bg-amber-500/10",
      border     : "border-amber-500/20",
      hoverBorder: "hover:border-amber-500/40",
      hoverBg    : "hover:bg-amber-500/5",
      highlight  : stats.pending > 0,
    },
  ];

  const secondaryCards = [
    {
      label      : "Courses",
      value      : stats.courses,
      icon       : BookOpen,
      to         : "/admin/courses",
      color      : "text-emerald-500",
      bg         : "bg-emerald-500/10",
      hoverBorder: "hover:border-emerald-500/30",
    },
    {
      label      : "Videos",
      value      : stats.videos,
      icon       : VideoIcon,
      to         : "/admin/videos",
      color      : "text-violet-500",
      bg         : "bg-violet-500/10",
      hoverBorder: "hover:border-violet-500/30",
    },
    {
      label      : "Exams",
      value      : stats.exams,
      icon       : FileText,
      to         : "/admin/exams",
      color      : "text-rose-500",
      bg         : "bg-rose-500/10",
      hoverBorder: "hover:border-rose-500/30",
    },
  ];

  if (loading) return <AdminDashboardSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 space-y-6">

        {/* ── Primary Stats ── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {primaryCards.map((card) => (
            <Link
              key={card.label}
              to={card.to}
              className={`group relative p-4 sm:p-5 lg:p-6 rounded-2xl border bg-card shadow-sm
                hover:shadow-md transition-all duration-200 overflow-hidden
                ${card.highlight
                  ? "border-amber-500/40 ring-1 ring-amber-500/20"
                  : `border-border ${card.hoverBorder}`
                } ${card.hoverBg}`}
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${card.bg}`} />

              <div className="relative">
                <div className={`inline-flex p-2 sm:p-2.5 rounded-xl ${card.bg} mb-3 sm:mb-4`}>
                  <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tabular-nums leading-none">
                      {card.value}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">{card.label}</p>
                  </div>
                  <ArrowUpRight
                    className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color} opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mb-0.5`}
                  />
                </div>

                {card.highlight && card.value > 0 && (
                  <span className="absolute top-3 right-3 sm:top-4 sm:right-4 h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* ── Content Stats ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Content
          </p>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
            {secondaryCards.map((card) => (
              <Link
                key={card.label}
                to={card.to}
                className={`group flex flex-col items-center gap-2 sm:gap-3
                  p-3 sm:p-4 lg:p-5 rounded-2xl border border-border bg-card
                  hover:shadow-sm transition-all duration-200 text-center
                  ${card.hoverBorder}`}
              >
                <div className={`p-2 sm:p-2.5 rounded-xl ${card.bg} transition-transform duration-200 group-hover:scale-110`}>
                  <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground tabular-nums leading-none">
                    {card.value}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                    {card.label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Quick Actions / কুইক লিংকস (Go Live included) ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Quick Actions
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
            <Link
              to="/admin/videos/add"
              className="group flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/50 hover:shadow-sm transition-all duration-200"
            >
              <div className="p-2.5 rounded-xl bg-red-500 text-white transition-transform duration-200 group-hover:scale-110 shrink-0 shadow-xs">
                <Radio className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Go Live</p>
                <p className="text-[11px] text-red-500 font-medium truncate">
                  লাইভ ক্লাস শুরু
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>

            {[
              { label: "Add Course", to: "/admin/courses/add", icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10", hoverBorder: "hover:border-emerald-500/30" },
              { label: "Add Video",  to: "/admin/videos/add",  icon: VideoIcon, color: "text-violet-500",  bg: "bg-violet-500/10",  hoverBorder: "hover:border-violet-500/30" },
              { label: "Add Exam",   to: "/admin/exams/add",   icon: FileText, color: "text-rose-500",    bg: "bg-rose-500/10",    hoverBorder: "hover:border-rose-500/30" },
            ].map((card) => (
              <Link
                key={card.label}
                to={card.to}
                className={`group flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border border-border bg-card hover:shadow-sm transition-all duration-200 ${card.hoverBorder}`}
              >
                <div className={`p-2.5 rounded-xl ${card.bg} transition-transform duration-200 group-hover:scale-110 shrink-0`}>
                  <Plus className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{card.label}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                    <card.icon className="h-3 w-3 shrink-0" /> Create new
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Active Live Classes Section (Right below Quick Actions) ── */}
        {liveVideos.length > 0 && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-3.5 sm:p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  Active Live Classes ({liveVideos.length})
                </h2>
              </div>
              <span className="text-[11px] text-red-500 font-medium">
                🔴 চলমান লাইভ
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {liveVideos.map((lv) => (
                <div
                  key={lv.id}
                  className="bg-card border border-red-500/25 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-red-500/40 transition-all shadow-xs"
                >
                  <div className="flex gap-2.5 items-center min-w-0">
                    <div className="relative shrink-0">
                      {lv.thumbnail ? (
                        <img
                          src={lv.thumbnail}
                          alt=""
                          className="w-16 sm:w-20 aspect-video rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 sm:w-20 aspect-video bg-muted rounded-lg flex items-center justify-center">
                          <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                        </div>
                      )}
                      <span className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-red-600 text-white text-[8px] font-bold">
                        LIVE
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-red-500 font-semibold truncate">{lv.courseName}</p>
                      <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">{lv.title}</h3>
                      <p className="text-[10px] text-muted-foreground truncate">{lv.subjectName}</p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      onClick={() => handleOpenEndDialog(lv)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium flex items-center gap-1 transition-all shadow-xs active:scale-95"
                    >
                      <SquareCheck className="h-3.5 w-3.5" />
                      <span>লাইভ শেষ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick Links ── */}
        {(settings.youtubeChannel || settings.googleDrive) && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Quick Links
            </p>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {settings.youtubeChannel && (
                <a
                  href={settings.youtubeChannel}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border border-border bg-card
                    hover:border-red-500/30 hover:bg-red-500/5 transition-all duration-200"
                >
                  <div className="p-2 sm:p-2.5 rounded-xl bg-red-500/10 shrink-0 transition-transform duration-200 group-hover:scale-110">
                    <Youtube className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground leading-tight">YouTube</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Open channel</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
              {settings.googleDrive && (
                <a
                  href={settings.googleDrive}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border border-border bg-card
                    hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-200"
                >
                  <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 shrink-0 transition-transform duration-200 group-hover:scale-110">
                    <HardDrive className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground leading-tight">Drive</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Open folder</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── End Live Class Minimal Modal with PDF Link ── */}
      <Dialog open={!!endingLiveVideo} onOpenChange={(open) => !open && setEndingLiveVideo(null)}>
        <DialogContent className="max-w-sm p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-red-600">
              <Radio className="h-4 w-4 animate-pulse" /> লাইভ শেষ করুন
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              PDF / লেকচার শিট লিংক (ঐচ্ছিক)
            </label>
            <input
              type="text"
              placeholder="https://..."
              value={endPdfUrl}
              onChange={(e) => setEndPdfUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <DialogFooter className="flex-row gap-2 justify-end sm:justify-end pt-2">
            <button
              onClick={() => setEndingLiveVideo(null)}
              disabled={endingProcess}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
            >
              বাতিল
            </button>
            <button
              onClick={handleConfirmEndLive}
              disabled={endingProcess}
              className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {endingProcess ? "সমাপ্ত হচ্ছে..." : "লাইভ শেষ করুন"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
