import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface VoiceControlOptions {
  onCommand: (command: string) => void;
  getSensorValue: (key: string) => string;
  onPumpToggle: (on: boolean) => Promise<void>;
  onAutoMode: () => Promise<void>;
}

export function useVoiceControl(options: VoiceControlOptions) {
  const { onCommand, getSensorValue, onPumpToggle, onAutoMode } = options;
  const [listening, setListening] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const recognitionRef = useRef<any>(null);
  const listeningLoopRef = useRef<boolean>(false);
  const glowIntervalRef = useRef<number | null>(null);
  const lastRestartRef = useRef<number>(0);
  const speakQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  const { toast } = useToast();
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const RESTART_MIN_DELAY = 800; // Reduced from 1500ms

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(isMobileDevice);
      console.log("[Voice] Mobile device detected:", isMobileDevice);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const speak = (text: string) => {
    try {
      // Try using Puter.js for TTS first
      if ((window as any).puter && (window as any).puter.ui && (window as any).puter.ui.alert) {
        // Puter available, use it for better TTS
        (window as any).puter.ui.alert(text, {
          type: 'info',
          duration: 3000,
        });
      }
      
      // Also use Web Speech API as fallback for audio output
      speechSynthesis.cancel();
      speakQueueRef.current = [text];
      
      const msg = new SpeechSynthesisUtterance(text);
      msg.lang = "en-US";
      msg.rate = 1.0;
      msg.pitch = 1.0;
      msg.volume = 1.0;
      
      msg.onend = () => {
        isSpeakingRef.current = false;
      };
      
      msg.onerror = () => {
        isSpeakingRef.current = false;
      };
      
      isSpeakingRef.current = true;
      speechSynthesis.speak(msg);
      console.log("[Voice] Speaking immediately:", text);
    } catch (err) {
      console.error("Speak failed:", err);
    }
  };

  const handleVoiceCommand = (transcript: string) => {
    const normalized = transcript.toLowerCase().trim();
    console.log("[Voice] Command:", normalized);
    onCommand(normalized);

    // Greetings
    if (/(^| )((hey|hi|hello|good morning|good afternoon|good evening))( |$)/.test(normalized)) {
      speak("Hello! I'm Clima — ready when you are. Ask me to read sensors, control the pump, or get the AI recommendation.");
      return;
    }

    // Farewell
    if (/(bye|goodbye|see you|good night|take care)/.test(normalized)) {
      speak("Goodbye! Take care and stay green!");
      return;
    }

    // Wake word
    if (/^cli[a-z]*/.test(normalized)) {
      speak("Yes, I'm here. What would you like me to do?");
      return;
    }

    // All sensors
    if (/(all sensors|all readings|full report|give me all readings|read all)/.test(normalized)) {
      const soil = getSensorValue("soilMoisture");
      const airHum = getSensorValue("airHumidity");
      const airTemp = getSensorValue("airTemperature");
      const ph = getSensorValue("phValue");
      const water = getSensorValue("waterLevel");
      const airQ = getSensorValue("airQuality");
      const battery = getSensorValue("batteryLevel");
      const msg = `Here's the full report: Soil moisture is ${soil}. Air humidity ${airHum}. Air temperature ${airTemp}. pH level ${ph}. Water level ${water}. Air quality ${airQ}. Battery ${battery}.`;
      speak(msg);
      return;
    }

    // Individual sensors
    if (normalized.includes("soil")) {
      speak(`Soil moisture is ${getSensorValue("soilMoisture")}.`);
      return;
    }
    if (normalized.includes("humidity")) {
      speak(`Air humidity is ${getSensorValue("airHumidity")}.`);
      return;
    }
    if (/(air )?temperature/.test(normalized) && !/water/.test(normalized)) {
      speak(`Air temperature is ${getSensorValue("airTemperature")}.`);
      return;
    }
    if (normalized.includes("p h") || normalized.includes("ph ")) {
      speak(`pH level is ${getSensorValue("phValue")}.`);
      return;
    }
    if (/water level/.test(normalized) || (normalized.includes("water") && normalized.includes("level"))) {
      speak(`Water level is ${getSensorValue("waterLevel")}.`);
      return;
    }
    if (normalized.includes("air quality") || normalized.includes("aqi")) {
      speak(`Air quality is ${getSensorValue("airQuality")}.`);
      return;
    }
    if (normalized.includes("battery")) {
      speak(`Battery level is ${getSensorValue("batteryLevel")}.`);
      return;
    }
    if (normalized.includes("flow rate") || normalized.includes("flow sensor") || normalized.includes("water flow")) {
      const flow = getSensorValue("flowRate");
      speak(`The current water flow rate is ${flow}.`);
      return;
    }

    // Pump control
    if (/(turn on|start pump|pump on)/.test(normalized)) {
      speak("Turning the pump on now.");
      onPumpToggle(true).catch(() => speak("Failed to turn on pump."));
      return;
    }
    if (/(turn off|stop pump|pump off)/.test(normalized)) {
      speak("Stopping the pump now.");
      onPumpToggle(false).catch(() => speak("Failed to stop pump."));
      return;
    }

    // Auto mode
    if (/(auto mode|automatic|auto)/.test(normalized)) {
      speak("Switching to automatic mode.");
      onAutoMode().catch(() => speak("Failed to switch to auto mode."));
      return;
    }

    // Voice control commands
    if (normalized.includes("restart mic") || normalized.includes("restart listening")) {
      speak("Restarting my microphone system now.");
      stopListening();
      setTimeout(() => startListening(), 1200);
      return;
    }

    if (normalized.includes("stop listening") || normalized.includes("stop voice")) {
      speak("Stopping listening.");
      // Allow speech to finish before stopping
      const stopDelay = isMobile ? 200 : 300;
      setTimeout(() => {
        stopListening();
      }, stopDelay);
      return;
    }

    if (normalized.includes("start listening") || normalized.includes("resume listening")) {
      speak("Starting voice recognition again.");
      startListening();
      return;
    }

    if (normalized.includes("test voice")) {
      const lines = [
        "This is Clima speaking, test successful!",
        "All systems are running perfectly.",
        "Voice system operational and ready.",
        "Hello human, your AI assistant is active."
      ];
      speak(lines[Math.floor(Math.random() * lines.length)]);
      return;
    }

    // Fallback
    speak("Sorry, I didn't quite get that. Try asking for a sensor reading or say 'turn on pump'.");
  };

  const initRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;

    // Try multiple APIs for better browser/device support
    const SpeechRecognition = (window as any).SpeechRecognition || 
                              (window as any).webkitSpeechRecognition ||
                              (window as any).mozSpeechRecognition ||
                              (window as any).msSpeechRecognition;
    
    if (!SpeechRecognition) {
      const errorMsg = isMobile 
        ? "Speech Recognition not supported on this mobile browser. Try Chrome or Safari."
        : "Speech Recognition not supported in this browser.";
      toast({ title: errorMsg, variant: "destructive" });
      console.error("[Voice]", errorMsg);
      return null;
    }

    const recognition = new SpeechRecognition();
    
    // Optimize for mobile and desktop - faster processing
    recognition.lang = "en-US";
    recognition.interimResults = true; // Enable interim results for faster feedback
    recognition.continuous = false; // Chrome Mobile requires this to be false
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      console.log("[Voice] Listening started");
      // Add haptic feedback on mobile
      if (isMobile && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    };

    recognition.onresult = (event: any) => {
      try {
        // Process only final results for accuracy and speed
        let isFinal = false;
        let resultTranscript = "";
        let confidence = 0;
        
        // Find the last final result for faster processing
        for (let i = event.results.length - 1; i >= 0; i--) {
          if (event.results[i].isFinal) {
            isFinal = true;
            resultTranscript = (event.results[i][0].transcript || "").toLowerCase().trim();
            confidence = event.results[i][0].confidence || 0;
            break;
          }
        }
        
        if (isFinal && resultTranscript) {
          console.log("[Voice] Final result:", resultTranscript, "confidence:", confidence.toFixed(2));
          
          // Update transcript display
          setTranscript(resultTranscript);
          
          // Clear transcript after 2 seconds
          if (transcriptTimeoutRef.current) {
            clearTimeout(transcriptTimeoutRef.current);
          }
          transcriptTimeoutRef.current = setTimeout(() => {
            setTranscript("");
          }, 2000);
          
          // Mobile vibration on command received
          if (isMobile && navigator.vibrate) {
            navigator.vibrate(50);
          }
          
          // Process immediately - no delay
          handleVoiceCommand(resultTranscript);
        }
      } catch (err) {
        console.error("[Voice] Error processing result:", err);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("[Voice] Error:", event.error);
      
      // Mobile-specific error handling
      if (event.error === "network") {
        toast({ title: "Network error. Please check your connection.", variant: "destructive" });
        speak("Network error. Please check your internet connection.");
      } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        speak("Microphone access blocked. Please allow microphone permissions in your browser settings.");
        toast({ title: "Microphone access denied", variant: "destructive" });
        listeningLoopRef.current = false;
      } else if (event.error === "no-speech") {
        // Common on mobile, just restart
        console.log("[Voice] No speech detected, restarting...");
        if (listeningLoopRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (err) {
            console.warn("[Voice] Restart failed:", err);
          }
        }
      } else if (event.error !== "aborted") {
        toast({ title: `Voice error: ${event.error}`, variant: "destructive" });
      }
    };

    recognition.onend = () => {
      console.log("[Voice] Listening ended, listeningLoopRef:", listeningLoopRef.current);
      
      // Mobile haptic feedback on stop
      if (isMobile && navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
      
      // Auto-restart with rate limiting only if listening loop is active
      if (listeningLoopRef.current && recognitionRef.current) {
        const now = Date.now();
        if (now - lastRestartRef.current > RESTART_MIN_DELAY) {
          lastRestartRef.current = now;
          setTimeout(() => {
            if (listeningLoopRef.current && document.visibilityState === "visible" && recognitionRef.current) {
              try {
                recognitionRef.current.start();
                console.log("[Voice] Restarted listening");
              } catch (err) {
                console.warn("[Voice] Restart failed:", err);
              }
            }
          }, isMobile ? 200 : 300 + Math.random() * 200);
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const startListening = () => {
    try {
      // Request microphone permission explicitly on mobile
      if (isMobile) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then(() => {
            const recognition = initRecognition();
            if (!recognition) return;
            listeningLoopRef.current = true;
            setListening(true);
            recognition.start();
            console.log("[Voice] Starting listening loop on mobile");
          })
          .catch((err) => {
            console.error("[Voice] Microphone permission denied:", err);
            toast({ title: "Microphone permission denied", variant: "destructive" });
            listeningLoopRef.current = false;
          });
      } else {
        const recognition = initRecognition();
        if (!recognition) return;
        listeningLoopRef.current = true;
        setListening(true);
        recognition.start();
        console.log("[Voice] Starting listening loop");
      }
    } catch (err) {
      console.error("[Voice] Start failed:", err);
      toast({ title: "Failed to start voice control", variant: "destructive" });
      listeningLoopRef.current = false;
    }
  };

  const stopListening = () => {
    try {
      listeningLoopRef.current = false;
      console.log("[Voice] Stopping listening loop");
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setListening(false);
    } catch (err) {
      console.warn("[Voice] Stop failed:", err);
    }
  };

  useEffect(() => {
    return () => {
      listeningLoopRef.current = false;
      stopListening();
      if (glowIntervalRef.current) {
        clearInterval(glowIntervalRef.current);
      }
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }
    };
  }, []);

  return { listening, startListening, stopListening, isMobile, transcript };
}
