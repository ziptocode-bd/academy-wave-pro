import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCachedDoc, getCachedCollection } from "@/lib/firestoreCache";
import { useAuth } from "@/contexts/AuthContext";
import { Video, Course } from "@/types";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { VideoGridSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio } from "lucide-react";

export default function CourseContentPage() {
  const { courseId } = useParams();
  const { user, userDoc } = useAuth();
  const navigate = useNavigate();
  const settings = useAppSettings();
  const [videos, setVideos] = useState<Video[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [activeSubject, setActiveSubject] = useState("All");
  const [loading, setLoading] = useState(true);
  const [inactive, setInactive] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/auth?mode=login"); return; }
    const fetch = async () => {
      if (!courseId) return;
      const courseData = await getCachedDoc<Course>(db, "courses", courseId);
      if (courseData) {
        setCourse(courseData);
        if ((courseData as any).isActive === false) {
          setInactive(true);
          setLoading(false);
          return;
        }
      }

      const vids = await getCachedCollection<Video>(
        db,
        "videos",
        [where("courseId", "==", courseId)],
        `course_${courseId}`,
      );
      vids.sort((a, b) => (a.order || 0) - (b.order || 0));
      setVideos(vids);
      setSubjects([...new Set(vids.map((v) => v.subjectName))] as string[]);
      setLoading(false);
    };
    fetch();
  }, [courseId, user]);

  if (userDoc && userDoc.status !== "approved") {
    return (
      <div className="p-4 text-center mt-8">
        <div className="p-6 bg-destructive/10 rounded-lg border border-destructive/20">
          <p className="text-foreground font-medium">No Access</p>
          <p className="text-sm text-muted-foreground mt-1">আপনার enrollment approved নয়।</p>
        </div>
      </div>
    );
  }
  if (userDoc && courseId && !userDoc.enrolledCourses?.some(c => c.courseId === courseId)) {
    return (
      <div className="p-4 text-center mt-8">
        <div className="p-6 bg-destructive/10 rounded-lg border border-destructive/20">
          <p className="text-foreground font-medium">এই কোর্সে enrolled নন</p>
        </div>
      </div>
    );
  }
  if (inactive) {
    return (
      <div className="p-4 text-center mt-8">
        <div className="p-6 bg-destructive/10 rounded-lg border border-destructive/20">
          <p className="text-foreground font-medium">Course Expired</p>
          <p className="text-sm text-muted-foreground mt-1">This course is no longer available.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-4"><Skeleton className="h-6 w-48 mb-3" /><div className="flex gap-2 pb-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-8 w-20 rounded-full" />)}</div><VideoGridSkeleton count={6} /></div>;
  }


  const liveVideosCount = videos.filter((v) => !!v.isLive).length;

  const filteredBase =
    activeSubject === "All"
      ? videos
      : activeSubject === "Live"
      ? videos.filter((v) => !!v.isLive)
      : videos.filter((v) => v.subjectName === activeSubject);

  // Live classes always float to the top
  const filtered = [...filteredBase].sort(
    (a, b) => Number(!!b.isLive) - Number(!!a.isLive)
  );

  return (
    <div className="p-4 animate-fade-in">
      {course && <h2 className="text-lg font-semibold text-foreground mb-3">{course.courseName}</h2>}
      
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 items-center">
        <button
          onClick={() => setActiveSubject("Live")}
          className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
            activeSubject === "Live"
              ? "bg-red-600 text-white shadow-sm ring-2 ring-red-500/30"
              : liveVideosCount > 0
              ? "bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20"
              : "bg-card border border-border text-foreground hover:bg-accent"
          }`}
        >
          <Radio className={`h-3.5 w-3.5 ${liveVideosCount > 0 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
          <span>Live {liveVideosCount > 0 ? `(${liveVideosCount})` : ""}</span>
        </button>

        <button
          onClick={() => setActiveSubject("All")}
          className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium shrink-0 transition-colors ${
            activeSubject === "All"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground hover:bg-accent"
          }`}
        >
          All
        </button>


        {subjects.map((sub) => (
          <button
            key={sub}
            onClick={() => setActiveSubject(sub)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium shrink-0 transition-colors ${
              activeSubject === sub
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-foreground hover:bg-accent"
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border/60 p-6 my-4">
          <p className="text-sm font-medium text-foreground">
            {activeSubject === "Live"
              ? "বর্তমানে এই কোর্সে কোনো লাইভ ক্লাস চলছে না।"
              : "কোনো ভিডিও পাওয়া যায়নি।"}
          </p>
          {activeSubject === "Live" && (
            <button
              onClick={() => setActiveSubject("All")}
              className="mt-3 px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground"
            >
              সব ক্লাস দেখুন
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((video) => (
            <button
              key={video.id}
              onClick={() => navigate(`/video/${video.id}`)}
              className={`group bg-card rounded-xl shadow-card overflow-hidden border text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
                video.isLive
                  ? "border-red-500 ring-2 ring-red-500/20"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="relative w-full aspect-video bg-muted overflow-hidden">
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <span className="text-xs text-muted-foreground">No Thumbnail</span>
                  </div>
                )}
                {video.isLive && (
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/90 text-white text-xs font-bold shadow-lg backdrop-blur-sm animate-pulse">
                    <Radio className="h-3.5 w-3.5" />
                    <span>LIVE NOW</span>
                  </div>
                )}
              </div>
              <div className="p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  {video.isLive && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                      🔴 LIVE
                    </span>
                  )}
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {video.subjectName} {video.chapterName ? `• ${video.chapterName}` : ""}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {video.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {settings.appName || "Darpan Academy"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
