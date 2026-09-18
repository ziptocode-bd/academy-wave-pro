import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Video, Course } from "@/types";
import { getCachedCollection, invalidateCache, bumpVersion } from "@/lib/firestoreCache";
import { clearLiveChat } from "@/lib/liveChatFirebase";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, Film, Radio } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AdminVideoListSkeleton } from "@/components/skeletons";

const PAGE_SIZE = 20;

export default function AdminVideosPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCourseId, setFilterCourseId] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [filterLiveOnly, setFilterLiveOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async (forceRefresh = false) => {
    if (forceRefresh) {
      invalidateCache("videos");
      invalidateCache("courses");
    }
    const [vids, courses_] = await Promise.all([
      getCachedCollection<Video>(db, "videos"),
      getCachedCollection<Course>(db, "courses"),
    ]);
    vids.sort((a, b) => (a.order || 0) - (b.order || 0));
    setVideos(vids);
    setCourses(courses_);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filterCourse = courses.find((c) => c.id === filterCourseId);

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "videos", id));
    await clearLiveChat(id);
    invalidateCache("videos");
    await bumpVersion(db, "videos");
    setVideos(prev => prev.filter(v => v.id !== id));
    toast.success("Video deleted");
  };

  const handleToggleLive = async (video: Video) => {
    const nextLive = !video.isLive;
    try {
      await updateDoc(doc(db, "videos", video.id), {
        isLive: nextLive,
      });

      if (!nextLive) {
        // If live turned off, clear chat data from realtime database
        await clearLiveChat(video.id);
      }

      invalidateCache("videos");
      await bumpVersion(db, "videos");

      setVideos((prev) =>
        prev.map((v) => (v.id === video.id ? { ...v, isLive: nextLive } : v))
      );

      toast.success(
        nextLive
          ? "লাইভ ক্লাস চালু করা হয়েছে"
          : "লাইভ ক্লাস বন্ধ করা হয়েছে ও চ্যাট পরিষ্কার করা হয়েছে"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update live status");
    }
  };

  const filtered = videos.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.courseName.toLowerCase().includes(search.toLowerCase()) ||
      v.subjectName.toLowerCase().includes(search.toLowerCase());
    const matchesCourse = !filterCourseId || v.courseId === filterCourseId;
    const matchesSubject = !filterSubjectId || v.subjectId === filterSubjectId;
    const matchesLive = !filterLiveOnly || !!v.isLive;
    return matchesSearch && matchesCourse && matchesSubject && matchesLive;
  });

  const moveVideo = async (index: number, direction: "up" | "down") => {
    const filteredList = [...filtered];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= filteredList.length) return;

    const a = filteredList[index];
    const b = filteredList[swapIndex];
    const orderA = a.order || index;
    const orderB = b.order || swapIndex;

    const batch = writeBatch(db);
    batch.update(doc(db, "videos", a.id), { order: orderB });
    batch.update(doc(db, "videos", b.id), { order: orderA });
    await batch.commit();

    invalidateCache("videos");
    await bumpVersion(db, "videos");
    setVideos(prev => {
      const next = prev.map(v => {
        if (v.id === a.id) return { ...v, order: orderB };
        if (v.id === b.id) return { ...v, order: orderA };
        return v;
      });
      next.sort((x, y) => (x.order || 0) - (y.order || 0));
      return next;
    });
    toast.success("Order updated");
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedVideos = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [search, filterCourseId, filterSubjectId]);

  if (loading) return <AdminVideoListSkeleton count={5} />;

  return (
    <div className="p-3 sm:p-4 animate-fade-in max-w-4xl mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Film className="h-5 w-5" /> Videos ({videos.length})
        </h2>
        <button
          onClick={() => navigate("/admin/videos/add")}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search videos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide items-center">
        <select
          value={filterCourseId}
          onChange={(e) => { setFilterCourseId(e.target.value); setFilterSubjectId(""); }}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        >
          <option value="">All Courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.courseName}</option>)}
        </select>

        {filterCourse?.subjects?.length ? (
          <select
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          >
            <option value="">All Subjects</option>
            {filterCourse.subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
          </select>
        ) : null}

        <button
          onClick={() => setFilterLiveOnly((prev) => !prev)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
            filterLiveOnly
              ? "bg-red-500 text-white shadow-sm"
              : "bg-card border border-border text-foreground hover:bg-accent"
          }`}
        >
          <Radio className={`h-3 w-3 ${filterLiveOnly ? "animate-pulse" : "text-red-500"}`} />
          <span>Live Only</span>
        </button>

        {(filterCourseId || filterSubjectId || filterLiveOnly) && (
          <button
            onClick={() => { setFilterCourseId(""); setFilterSubjectId(""); setFilterLiveOnly(false); }}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {(search || filterCourseId || filterLiveOnly) && (
        <p className="text-xs text-muted-foreground mb-2">{filtered.length} video{filtered.length !== 1 ? "s" : ""} found</p>
      )}

      <div className="space-y-2">
        {paginatedVideos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">No videos found</div>
        )}
        {paginatedVideos.map((v, idx) => {
          const globalIdx = (currentPage - 1) * PAGE_SIZE + idx;
          return (
            <div
              key={v.id}
              className={`p-3 bg-card rounded-xl border flex gap-3 items-center hover:border-primary/20 transition-colors ${
                v.isLive ? "border-red-500/50 bg-red-500/[0.02]" : "border-border"
              }`}
            >
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button onClick={() => moveVideo(globalIdx, "up")} disabled={globalIdx === 0} className="p-0.5 rounded hover:bg-accent disabled:opacity-20">
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                </button>
                <button onClick={() => moveVideo(globalIdx, "down")} disabled={globalIdx === filtered.length - 1} className="p-0.5 rounded hover:bg-accent disabled:opacity-20">
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="relative flex-shrink-0">
                {v.thumbnail ? (
                  <img src={v.thumbnail} alt="" className="w-24 sm:w-28 aspect-video rounded-lg object-cover" />
                ) : (
                  <div className="w-24 sm:w-28 aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <Film className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
                {v.isLive && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {v.isLive && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-500 border border-red-500/20 font-semibold">
                      🔴 LIVE
                    </span>
                  )}
                  <p className="font-medium text-foreground text-sm line-clamp-1">{v.title}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{v.courseName} • {v.subjectName}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Live toggle action button */}
                <button
                  onClick={() => handleToggleLive(v)}
                  className={`p-2 rounded-lg transition-colors ${
                    v.isLive
                      ? "bg-red-500/15 text-red-500 hover:bg-red-500/25"
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                  title={v.isLive ? "Turn Off Live (লাইভ শেষ করুন)" : "Start Live (লাইভ শুরু করুন)"}
                >
                  <Radio className={`h-4 w-4 ${v.isLive ? "animate-pulse" : ""}`} />
                </button>
                <button onClick={() => navigate(`/admin/videos/add?edit=${v.id}`)} className="p-2 rounded-lg hover:bg-accent transition-colors"><Edit className="h-4 w-4 text-muted-foreground" /></button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><button className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="h-4 w-4 text-destructive/70" /></button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete Video</AlertDialogTitle><AlertDialogDescription>Delete "{v.title}"?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(v.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="p-2 rounded-lg bg-card border border-border disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-card border border-border disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
