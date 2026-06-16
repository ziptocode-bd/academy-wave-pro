import { useEffect, useState, useCallback } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { Link } from "react-router-dom";
import {
  Users, Clock, BookOpen, Video, Youtube,
  HardDrive, FileText, ArrowUpRight,
  LayoutDashboard, Plus, RefreshCw,
} from "lucide-react";
import { AdminDashboardSkeleton } from "@/components/skeletons";

// ── Aggregate counters via getCountFromServer ─────────────────────────────────
// Each count = ~1 read per 1000 docs (server-side aggregation, no doc download).
// For 2500 students: 6 counts ≈ 8 reads total instead of 2500+ full-doc reads.
// Result cached in localStorage with 10-min TTL + manual refresh button.
const STATS_CACHE_KEY = "admin_dashboard_stats_v1";
const STATS_TTL_MS = 10 * 60 * 1000;

interface DashboardStats {
  users: number; pending: number; courses: number; videos: number; exams: number;
}

function readCachedStats(): { data: DashboardStats; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(STATS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || typeof parsed.timestamp !== "number") return null;
    return parsed;
  } catch { return null; }
}

function writeCachedStats(data: DashboardStats) {
  try { localStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() })); } catch {}
}

export default function AdminDashboard() {
  const settings = useAppSettings();
  const cached = readCachedStats();
  const [stats, setStats] = useState<DashboardStats>(
    cached?.data ?? { users: 0, pending: 0, courses: 0, videos: 0, exams: 0 }
  );
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      // Server-side aggregated counts — no document downloads.
      const studentsQ = query(collection(db, "users"), where("role", "==", "student"));
      const pendingUsersQ = query(collection(db, "users"), where("role", "==", "student"), where("status", "==", "pending"));
      const pendingReqsQ = query(collection(db, "enrollRequests"), where("status", "==", "pending"));
      const coursesRef = collection(db, "courses");
      const videosRef = collection(db, "videos");

      const [studentsSnap, pendingUsersSnap, pendingReqsSnap, coursesSnap, videosSnap] = await Promise.all([
        getCountFromServer(studentsQ),
        getCountFromServer(pendingUsersQ),
        getCountFromServer(pendingReqsQ),
        getCountFromServer(coursesRef),
        getCountFromServer(videosRef),
      ]);

      // Exams live in a separate Firestore project.
      let examsCount = 0;
      try {
        const { examDb } = await import("@/lib/examFirebase");
        const examsSnap = await getCountFromServer(collection(examDb, "exams"));
        examsCount = examsSnap.data().count;
      } catch (e) {
        console.error("Error fetching exam count:", e);
      }

      // "Pending" badge = unique users with either pending account status OR a pending enroll request.
      // Server-side we can't compute the union without reading docs, so we take the larger of the two
      // as a safe upper bound — admin only needs an indicator, exact number is on /admin/users.
      const pendingCount = Math.max(pendingUsersSnap.data().count, pendingReqsSnap.data().count);

      const next: DashboardStats = {
        users: studentsSnap.data().count,
        pending: pendingCount,
        courses: coursesSnap.data().count,
        videos: videosSnap.data().count,
        exams: examsCount,
      };
      setStats(next);
      writeCachedStats(next);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Skip refetch if cached stats are still fresh.
    if (cached && Date.now() - cached.timestamp < STATS_TTL_MS) {
      setLoading(false);
      return;
    }
    fetchStats();
  }, []); // eslint-disable-line

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const primaryCards = [
    {
      label: "Total Students",
      value: stats.users,
      icon: Users,
      to: "/admin/users",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      hoverBorder: "hover:border-blue-500/40",
      hoverBg: "hover:bg-blue-500/5",
    },
    {
      label: "Pending Approvals",
      value: stats.pending,
      icon: Clock,
      to: "/admin/users?status=pending",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      hoverBorder: "hover:border-amber-500/40",
      hoverBg: "hover:bg-amber-500/5",
      highlight: stats.pending > 0,
    },
  ];

  const secondaryCards = [
    {
      label: "Courses",
      value: stats.courses,
      icon: BookOpen,
      to: "/admin/courses",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      hoverBorder: "hover:border-emerald-500/30",
    },
    {
      label: "Videos",
      value: stats.videos,
      icon: Video,
      to: "/admin/videos",
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      hoverBorder: "hover:border-violet-500/30",
    },
    {
      label: "Exams",
      value: stats.exams,
      icon: FileText,
      to: "/admin/exams",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      hoverBorder: "hover:border-rose-500/30",
    },
  ];

  if (loading) return <AdminDashboardSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 space-y-6 lg:space-y-8">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground leading-tight">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Welcome back, Admin</p>
          </div>
        </div>

        {/* ── Primary Stats ── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-2">
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

        {/* ── Quick Actions (desktop / tablet only) ── */}
        <div className="hidden md:block">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Quick Actions
          </p>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {[
              { label: "Add Course", to: "/admin/courses/add", icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10", hoverBorder: "hover:border-emerald-500/30" },
              { label: "Add Video", to: "/admin/videos/add", icon: Video, color: "text-violet-500", bg: "bg-violet-500/10", hoverBorder: "hover:border-violet-500/30" },
              { label: "Add Exam", to: "/admin/exams/add", icon: FileText, color: "text-rose-500", bg: "bg-rose-500/10", hoverBorder: "hover:border-rose-500/30" },
            ].map((card) => (
              <Link
                key={card.label}
                to={card.to}
                className={`group flex items-center gap-3 p-4 lg:p-5 rounded-2xl border border-border bg-card hover:shadow-sm transition-all duration-200 ${card.hoverBorder}`}
              >
                <div className={`p-2.5 rounded-xl ${card.bg} transition-transform duration-200 group-hover:scale-110`}>
                  <Plus className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{card.label}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <card.icon className="h-3 w-3" /> Create new
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>

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
    </div>
  );
}
