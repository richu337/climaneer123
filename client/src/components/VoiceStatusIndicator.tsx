import { useEffect, useState } from "react";
import { Mic } from "lucide-react";

interface VoiceStatusIndicatorProps {
  listening: boolean;
  transcript?: string;
}

export function VoiceStatusIndicator({ listening, transcript }: VoiceStatusIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (listening) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [listening]);

  if (!isVisible) return null;

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${listening ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
      <div className={`flex flex-col gap-2 px-6 py-3 rounded-lg backdrop-blur-md border ${
        listening 
          ? "bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/30" 
          : "bg-gray-500/20 border-gray-500 shadow-lg shadow-gray-500/30"
      }`}>
        <div className="flex items-center gap-2">
          <Mic className={`h-5 w-5 ${listening ? "text-emerald-500 animate-pulse" : "text-gray-500"}`} />
          <span className={`font-semibold text-sm ${listening ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-gray-400"}`}>
            {listening ? "🎙️ Clima is Listening..." : "Ready to listen"}
          </span>
          {listening && (
            <div className="flex gap-1 ml-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
            </div>
          )}
        </div>
        {transcript && (
          <div className={`text-sm font-medium text-emerald-700 dark:text-emerald-300 pl-7 italic`}>
            "{transcript}"
          </div>
        )}
      </div>
    </div>
  );
}
