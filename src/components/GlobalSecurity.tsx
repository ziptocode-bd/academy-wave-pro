import { useEffect } from "react";

/**
 * Client-side hardening. NOTE: nothing here is a real security boundary —
 * a determined attacker can always inspect a JS app. These measures raise
 * the bar against casual snooping / copy-paste and basic devtools probing.
 * Real security is enforced by Firestore Security Rules + Firebase Auth.
 */
export function GlobalSecurity() {
  useEffect(() => {
    // Block right-click everywhere.
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    // Block common devtools / view-source / save / print shortcuts.
    const handleKeydown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === "F12") return e.preventDefault();
      if (e.ctrlKey && e.shiftKey && ["i", "j", "c", "k"].includes(k)) return e.preventDefault();
      if (e.metaKey && e.altKey && ["i", "j", "c"].includes(k)) return e.preventDefault(); // mac
      if ((e.ctrlKey || e.metaKey) && ["u", "s", "p"].includes(k)) return e.preventDefault();
    };

    // Block image / link drag (prevents drag-to-save).
    const handleDragStart = (e: DragEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "IMG" || t.tagName === "A")) e.preventDefault();
    };

    // Block text selection-driven copy on protected content (player + admin).
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("[data-allow-copy]")) return;
      e.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("copy", handleCopy);

    // Devtools timing heuristic — clears console output to slow casual snooping.
    let cleanCount = 0;
    const detect = () => {
      const t0 = performance.now();
      // eslint-disable-next-line no-debugger
      (function () { /* noop */ })();
      const t1 = performance.now();
      if (t1 - t0 > 160) {
        try { console.clear(); } catch { /* ignore */ }
        cleanCount++;
        if (cleanCount % 5 === 0) {
          // Periodic noisy clear when devtools likely open
          try { console.log("%c⛔ Restricted area", "color:red;font-size:24px;font-weight:bold"); } catch { /* ignore */ }
        }
      }
    };
    const interval = setInterval(detect, 2000);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("copy", handleCopy);
      clearInterval(interval);
    };
  }, []);

  return null;
}
