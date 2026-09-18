import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LiveChatMessage } from "@/types";
import {
  subscribeToLiveChat,
  sendLiveChatMessage,
} from "@/lib/liveChatFirebase";
import { Send, Radio, Sparkles, ArrowDown, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface LiveChatProps {
  videoId: string;
  courseId: string;
  isLive?: boolean;
}

const QUICK_MCQ = [
  { label: "ক", value: "উত্তর: ক" },
  { label: "খ", value: "উত্তর: খ" },
  { label: "গ", value: "উত্তর: গ" },
  { label: "ঘ", value: "উত্তর: ঘ" },
];

const QUICK_PHRASES = [
  "বুঝেছি 👍",
  "পুনরায় বলুন ❓",
];

export function LiveChat({ videoId, courseId, isLive }: LiveChatProps) {
  const { user, userDoc } = useAuth();
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [lastSentTime, setLastSentTime] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check enrollment
  const isEnrolled =
    userDoc?.role === "admin" ||
    userDoc?.enrolledCourses?.some((c) => c.courseId === courseId);

  // Subscribe to realtime database messages
  useEffect(() => {
    if (!videoId) return;
    const unsubscribe = subscribeToLiveChat(videoId, (msgs) => {
      setMessages(msgs);
    });

    return () => {
      unsubscribe();
    };
  }, [videoId]);

  // Handle auto-scrolling
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 60;
    setIsAtBottom(atBottom);
  };

  const scrollToBottom = () => {
    setIsAtBottom(true);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputValue).trim();
    if (!text) return;

    if (!user || !userDoc) {
      toast.error("চ্যাট করতে অনুগ্রহ করে লগইন করুন");
      return;
    }

    if (!isEnrolled) {
      toast.error("শুধুমাত্র এনরোল্ড শিক্ষার্থীরা লাইভ চ্যাট করতে পারবে");
      return;
    }

    // Cooldown check (1.2 seconds)
    const now = Date.now();
    if (now - lastSentTime < 1200) {
      toast.info("অনুগ্রহ করে একটু অপেক্ষা করে মেসেজ দিন");
      return;
    }

    if (text.length > 300) {
      toast.error("মেসেজ সর্বোচ্চ ৩০০ অক্ষরের হতে পারবে");
      return;
    }

    setSending(true);
    try {
      await sendLiveChatMessage(videoId, {
        userId: user.uid,
        userName: userDoc.name || user.displayName || "Student",
        message: text,
        timestamp: Date.now(),
      });

      if (textToSend === undefined) {
        setInputValue("");
      }
      setLastSentTime(now);
      setIsAtBottom(true);
    } catch (err: any) {
      console.error("Live chat send error:", err);
      toast.error("মেসেজ পাঠানো যায়নি। পুনরায় চেষ্টা করুন।");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (ts: number) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-card rounded-xl sm:rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-muted/40 border-b border-border flex items-center justify-between shrink-0">

        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <Radio className="h-4 w-4 text-red-500 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          </div>
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            লাইভ চ্যাট
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 font-mono">
              LIVE
            </span>
          </h3>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 sm:p-3 space-y-2.5 relative bg-background/50"

      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
            <Sparkles className="h-8 w-8 text-primary/40 mb-2 animate-bounce" />
            <p className="text-sm font-medium text-foreground">লাইভ চ্যাটে স্বাগতম!</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              ক্লাসে কোনো প্রশ্ন থাকলে নিচে লিখে পাঠান অথবা কুইক রেসপন্স ব্যবহার করুন।
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = user?.uid === msg.userId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col text-left text-xs ${
                  isSelf ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`flex items-center gap-1.5 mb-1 px-1 ${
                    isSelf ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isSelf
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-[11px] text-foreground">
                    {msg.userName}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {formatMessageTime(msg.timestamp)}
                  </span>
                </div>

                <div
                  className={`px-3 py-2 rounded-2xl max-w-[85%] break-words leading-relaxed shadow-sm ${
                    isSelf
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-card border border-border text-foreground rounded-tl-none"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating scroll to bottom button if user scrolled up */}
      {!isAtBottom && messages.length > 5 && (
        <button
          onClick={scrollToBottom}
          className="self-center -mt-9 z-10 px-3 py-1 bg-background/90 backdrop-blur-sm border border-border rounded-full shadow-md text-xs font-medium text-foreground flex items-center gap-1 hover:bg-accent transition-all"
        >
          <ArrowDown className="h-3.5 w-3.5" /> নিচে যান
        </button>
      )}

      {/* Footer / Input section */}
      <div className="p-2 sm:p-2.5 pb-safe bg-muted/20 border-t border-border space-y-2 shrink-0">
        {/* Quick buttons — MCQ + phrases in one line */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {QUICK_MCQ.map((item) => (
            <button
              key={item.label}
              onClick={() => sendMessage(item.value)}
              disabled={sending || !isEnrolled}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-card hover:bg-primary hover:text-primary-foreground border border-border transition-all active:scale-95 shrink-0"
            >
              {item.label}
            </button>
          ))}
          {QUICK_PHRASES.map((phrase) => (
            <button
              key={phrase}
              onClick={() => sendMessage(phrase)}
              disabled={sending || !isEnrolled}
              className="px-2.5 py-1 text-[11px] rounded-full bg-card hover:bg-accent border border-border text-foreground transition-all active:scale-95 whitespace-nowrap shrink-0"
            >
              {phrase}
            </button>
          ))}
        </div>

        {/* Free text input */}
        {!isEnrolled ? (
          <div className="p-2.5 bg-destructive/10 rounded-xl border border-destructive/20 text-center">
            <p className="text-xs text-destructive font-medium flex items-center justify-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>শুধুমাত্র এনরোল্ড শিক্ষার্থীরা চ্যাট করতে পারবে</span>
            </p>
          </div>
        ) : (
          <div className="w-full flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={300}
              disabled={sending}
              className="flex-1 min-w-0 h-10 px-3.5 text-xs sm:text-sm rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-xs"
            />

            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={sending || !inputValue.trim()}
              className="h-10 min-w-[42px] px-3 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-1.5 font-medium text-xs shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
              title="মেসেজ পাঠান"
              aria-label="মেসেজ পাঠান"
            >
              <Send className={`h-4 w-4 shrink-0 ${sending ? "animate-pulse" : ""}`} />
              <span className="hidden sm:inline font-semibold">পাঠান</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
