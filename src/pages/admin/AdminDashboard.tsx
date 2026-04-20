import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { Link } from "react-router-dom";
import {
  Users, Clock, BookOpen, Video, Youtube,
  HardDrive, FileText, ArrowUpRight,
  LayoutDashboard, BarChart3, UserPlus,
} from "lucide-react";
import { AdminDashboardSkeleton } from "@/components/skeletons/AdminSkeleton";
import { getCachedCollection } from "@/lib/firestoreCache";
import { safeToDate } from "@/lib/timestampUtils";

interface RecentEnrollment {
  id: string;
  name: string;
  courseName: string;
  status: string;
  createdAt: any;
}

interface CourseEnrollmentBar {
  courseName: string;
  count: number;
}

export default function AdminDashboard() {
  const settings = useAppSettings();
  const [stats, setStats] = useState({ users: 0, pending: 0, courses: 0, videos: 0, exams: 0 });
  const [recent, setRecent] = useState<RecentEnrollment[]>([]);
  const [courseBars, setCourseBars] = useState<CourseEnrollmentBar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch main db collections
        const [allUsers, coursesData, videosData, enrollRequestsData] = await Promise.all([
          getCachedCollection<any>(db, "users"),
          getCachedCollection<any>(db, "courses"),
          getCachedCollection<any>(db, "videos"),
          getCachedCollection<any>(db, "enrollRequests"),
        ]);

        // Fetch exams from examDb separately to isolate any failure
        let examsCount = 0;
        try {
          const { examDb } = await import("@/lib/examFirebase");
          const examsData = await getCachedCollection<any>(examDb, "exams");
          examsCount = examsData.length;
        } catch (examErr) {
          console.error("Error fetching exams for dashboard:", examErr);
          // Continue with 0 — don't block the whole dashboard
        }

        const students = allUsers.filter((u: any) => u.role === "student");
        const pendingUsers = allUsers.filter((u: any) => u.status === "pending" && u.role === "student");
        const pendingRequestUserIds = new Set(
          enrollRequestsData.filter((r: any) => r.status === "pending").map((d: any) => d.userId)
        );
        const approvedWithPending = allUsers.filter(
          (u: any) => u.role === "student" && u.status !== "pending" && pendingRequestUserIds.has(u.id)
        );
        const pendingCount = pendingUsers.length + approvedWithPending.length;

        setStats({
          users: students.length,
          pending: pendingCount,
          courses: coursesData.length,
          videos: videosData.length,
          exams: examsCount,
        });

        // Recent enrollment requests (last 5)
        const recentReqs: RecentEnrollment[] = [...enrollRequestsData]
          .sort((a: any, b: any) => {
            const ad = safeToDate(a.createdAt)?.getTime() || 0;
            const bd = safeToDate(b.createdAt)?.getTime() || 0;
            return bd - ad;
          })
          .slice(0, 5)
          .map((r: any) => ({
            id: r.id,
            name: r.name || "Unknown",
            courseName: r.courseName || "—",
            status: r.status || "pending",
            createdAt: r.createdAt,
          }));
        setRecent(recentReqs);

        // Bar chart: students per course
        const courseMap = new Map<string, { name: string; count: number }>();
        coursesData.forEach((c: any) => courseMap.set(c.id, { name: c.courseName || "Untitled", count: 0 }));
        students.forEach((s: any) => {
          (s.enrolledCourses || []).forEach((ec: any) => {
            const entry = courseMap.get(ec.courseId);
            if (entry) entry.count += 1;
          });
        });
        const bars = Array.from(courseMap.values())
          .map((c) => ({ courseName: c.name, count: c.count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);
        setCourseBars(bars);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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

        {/* ── Course Enrollment Chart ── */}
        {courseBars.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Students per Course</p>
            </div>
            <div className="space-y-3">
              {(() => {
                const max = Math.max(...courseBars.map((b) => b.count), 1);
                return courseBars.map((b) => {
                  const pct = (b.count / max) * 100;
                  return (
                    <div key={b.courseName}>
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <span className="text-foreground truncate pr-2">{b.courseName}</span>
                        <span className="text-muted-foreground tabular-nums shrink-0">{b.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* ── Recent Enrollment Requests ── */}
        {recent.length > 0 && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Recent Enrollment Requests</p>
              </div>
              <Link to="/admin/users?status=pending" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recent.map((r) => {
                const date = safeToDate(r.createdAt);
                const dateStr = date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
                const statusColor =
                  r.status === "approved"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20"
                    : r.status === "rejected"
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20";
                return (
                  <div key={r.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.courseName}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 hidden sm:inline">{dateStr}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${statusColor} shrink-0`}>
                      {r.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        )}
      </div>
    </div>
  );
}
