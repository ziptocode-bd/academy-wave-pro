import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { Course } from "@/types";
import { Link } from "react-router-dom";
import { FloatingButtons } from "@/components/FloatingButtons";
import { CourseGridSkeleton } from "@/components/skeletons/CourseCardSkeleton";
import { getCachedCollection } from "@/lib/firestoreCache";
import { Search, X } from "lucide-react";

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const list = await getCachedCollection<Course>(db, "courses");
      list.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setCourses(list);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => {
      if (c.courseName?.toLowerCase().includes(q)) return true;
      if (c.subjects?.some((s) => s.subjectName?.toLowerCase().includes(q))) return true;
      if (c.instructors?.some((i) => i.name?.toLowerCase().includes(q) || i.subject?.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [courses, query]);

  if (loading) {
    return (
      <div className="px-3 pt-4 sm:p-4">
        <h2 className="text-xl font-semibold text-foreground mb-4">All Courses</h2>
        <CourseGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="px-3 pt-4 sm:p-4">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-xl font-semibold text-foreground">All Courses</h2>
        {!searchOpen ? (
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-md bg-card border border-border text-foreground hover:bg-accent transition-colors"
            aria-label="Search courses"
          >
            <Search className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="কোর্স, বিষয় বা শিক্ষক খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              onClick={() => { setSearchOpen(false); setQuery(""); }}
              className="p-2 rounded-md bg-card border border-border text-foreground hover:bg-accent transition-colors"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {query ? `"${query}" — কোনো কোর্স পাওয়া যায়নি।` : "No courses available yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {filtered.map((course) => (
            <div
              key={course.id}
              className="bg-card rounded-md shadow-card overflow-hidden border border-border hover:shadow-md transition-shadow"
            >
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.courseName}
                  className="w-full aspect-video object-cover"
                />
              ) : (
                <div className="w-full aspect-video bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">No Image</span>
                </div>
              )}

              <div className="p-3">
                <h3 className="font-semibold text-foreground text-base line-clamp-2">
                  {course.courseName}
                </h3>

                <p className="text-muted-foreground mt-1 font-medium">
                  ৳{course.price}
                </p>

                <Link
                  to={`/course/${course.id}`}
                  className="inline-block mt-3 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <FloatingButtons />
    </div>
  );
}
