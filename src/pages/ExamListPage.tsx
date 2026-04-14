import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { where } from "firebase/firestore";
import { examDb } from "@/lib/examFirebase";
import { useAuth } from "@/contexts/AuthContext";
import { Exam } from "@/types/exam";
import { getCachedCollection } from "@/lib/firestoreCache";
import { Link } from "react-router-dom";
import { Clock, CheckCircle, AlertCircle, BookOpen } from "lucide-react";
import { FloatingButtons } from "@/components/FloatingButtons";
import { Skeleton } from "@/components/ui/skeleton";

function ExamCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export default function ExamListPage() {
  const { user, userDoc, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?mode=login");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!userDoc?.activeCourseId) { setLoading(false); return; }
    const fetchExams = async () => {
      setLoading(true);
      try {
        const list = await getCachedCollection<Exam>(examDb, "exams", [where("courseId", "==", userDoc.activeCourseId)], `course_${userDoc.activeCourseId}`);
        list.sort((a, b) => (b.startTime?.toMillis?.() || 0) - (a.startTime?.toMillis?.() || 0));
        setExams(list);
      } catch (err) {
        console.error("Error fetching exams:", err);
      }
      setLoading(false);
    };
    fetchExams();
  }, [userDoc?.activeCourseId]);

  const now = Date.now();

  const getStatus = (exam: Exam) => {
    const start = exam.startTime?.toMillis?.() || 0;
    const end = exam.endTime?.toMillis?.() || 0;
    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "live";
    return "ended";
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <ExamCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!userDoc?.activeCourseId) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground text-sm py-8">Please select an active course from your profile to view exams.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5" /> Exams
      </h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <ExamCardSkeleton key={i} />)}
        </div>
      ) : exams.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No exams available for this course.</p>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => {
            const status = getStatus(exam);
            const mcqCount = exam.questions.filter(q => q.type === "mcq").length;
            const writtenCount = exam.questions.filter(q => q.type === "written").length;
            const typeLabel = mcqCount > 0 && writtenCount > 0 ? "MCQ + Written" : mcqCount > 0 ? "MCQ" : "Written";
            const startDateStr = exam.startTime?.toDate?.()?.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' });

            const statusConfig = {
              live: { label: "Live", icon: <AlertCircle className="h-3 w-3" />, cls: "bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30", dot: "bg-green-500 animate-pulse" },
              upcoming: { label: "Upcoming", icon: <Clock className="h-3 w-3" />, cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20", dot: "bg-blue-400" },
              ended: { label: "Ended", icon: <CheckCircle className="h-3 w-3" />, cls: "bg-accent text-muted-foreground border border-border", dot: "bg-muted-foreground" },
            }[status];

            return (
              <Link
                key={exam.id}
                to={`/exams/${exam.id}`}
                className="block bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
              >
                {status === "live" && (
                  <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <h3 className="font-semibold text-foreground text-sm leading-snug flex-1 min-w-0 group-hover:text-primary transition-colors">
                      {exam.title}
                    </h3>
                    <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusConfig.cls}`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {typeLabel}
                    </span>
                    <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent text-foreground">
                      {exam.questions.length} প্রশ্ন
                    </span>
                    <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent text-foreground">
                      {exam.totalMarks} নম্বর
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent text-foreground">
                      <Clock className="h-3 w-3" /> {exam.duration} মিনিট
                    </span>
                  </div>

                  {startDateStr && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      🗓 {startDateStr}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <FloatingButtons />
    </div>
  );
}
