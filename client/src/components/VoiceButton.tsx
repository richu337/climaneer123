import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface VoiceButtonProps {
  listening: boolean;
  onToggle: () => void;
}

export function VoiceButton({ listening, onToggle }: VoiceButtonProps) {
  const glowIntervalRef = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(isMobileDevice);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (listening) {
      let grow = true;
      glowIntervalRef.current = window.setInterval(() => {
        if (buttonRef.current) {
          buttonRef.current.style.boxShadow = grow 
            ? "0 0 25px #00f2ff, 0 0 50px #00f2ff" 
            : "0 0 8px rgba(0,0,0,0.25)";
        }
        grow = !grow;
      }, 450);
    } else {
      if (glowIntervalRef.current) {
        clearInterval(glowIntervalRef.current);
      }
      if (buttonRef.current) {
        buttonRef.current.style.boxShadow = "0 0 15px rgba(0,0,0,0.3)";
      }
    }

    return () => {
      if (glowIntervalRef.current) {
        clearInterval(glowIntervalRef.current);
      }
    };
  }, [listening]);

  // Mobile: sticky side button | Desktop: absolute left edge
  const mobilePosition = isMobile 
    ? "fixed bottom-20 left-2 w-14 h-14 rounded-full"
    : "fixed left-0 top-1/2 -translate-y-1/2 w-16 h-16 rounded-r-full";

  return (
    <Button
      ref={buttonRef}
      onClick={onToggle}
      size="icon"
      className={`${mobilePosition} z-50 text-2xl transition-all ${
        listening
          ? "bg-gradient-to-br from-cyan-500 to-emerald-600"
          : "bg-gradient-to-br from-emerald-500 to-cyan-500 hover:shadow-lg"
      }`}
      title="Click to toggle voice control"
      aria-label="Voice control microphone button"
    >
      <Mic className={isMobile ? "h-6 w-6" : "h-7 w-7"} />
    </Button>
  );
}
