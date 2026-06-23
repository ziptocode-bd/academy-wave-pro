import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AdminDashboardSkeleton } from "@/components/skeletons";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { toast } from "sonner";

// Force admin re-authentication if the current session is older than this.
// Limits the blast-radius of a stolen/leaked session token.
const ADMIN_REAUTH_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12h
const REAUTH_KEY = "admin_last_reauth";

export function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, userDoc, loading } = useAuth();
  const location = useLocation();
  const [needsReauth, setNeedsReauth] = useState(false);
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || userDoc?.role !== "admin") return;
    const last = Number(sessionStorage.getItem(REAUTH_KEY) || 0);
    const lastSignIn = user.metadata?.lastSignInTime
      ? new Date(user.metadata.lastSignInTime).getTime()
      : 0;
    const fresh = Math.max(last, lastSignIn);
    if (Date.now() - fresh > ADMIN_REAUTH_MAX_AGE_MS) {
      setNeedsReauth(true);
    }
  }, [user, userDoc, location.pathname]);

  if (loading) return <AdminDashboardSkeleton />;
  if (!user || !userDoc) return <Navigate to="/auth" replace />;
  if (userDoc.role !== "admin") return <Navigate to="/" replace />;

  if (needsReauth) {
    const onReauth = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user.email || !pwd) return;
      setBusy(true);
      try {
        const cred = EmailAuthProvider.credential(user.email, pwd);
        await reauthenticateWithCredential(user, cred);
        sessionStorage.setItem(REAUTH_KEY, String(Date.now()));
        setPwd("");
        setNeedsReauth(false);
      } catch {
        toast.error("পাসওয়ার্ড সঠিক নয়");
      } finally {
        setBusy(false);
      }
    };
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <form onSubmit={onReauth} className="w-full max-w-sm bg-card border border-border rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Admin Re-authentication</h2>
            <p className="text-xs text-muted-foreground mt-1">
              নিরাপত্তার জন্য এডমিন প্যানেলে প্রবেশ করতে পুনরায় পাসওয়ার্ড দিন।
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{user.email}</p>
          </div>
          <input
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Admin password"
            className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-md bg-primary text-primary-foreground font-medium text-sm disabled:opacity-60"
          >
            {busy ? "Verifying…" : "Confirm"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
