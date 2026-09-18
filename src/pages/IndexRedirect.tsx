import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import { CourseGridSkeleton } from "@/components/skeletons";

export default function IndexRedirect() {
  const { user, userDoc, loading } = useAuth();
  
  // While auth is loading, show nothing (prevents flash)
  if (loading) {
    return <div className="p-4"><CourseGridSkeleton count={6} /></div>;
  }

  // Admin → redirect to admin dashboard
  if (user && userDoc?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  // Approved student → redirect to my-courses on first visit only
  if (user && userDoc?.role === "student" && userDoc?.status === "approved") {
    return <Navigate to="/content" replace />;
  }

  // Everyone else sees the homepage
  return <HomePage />;
}
