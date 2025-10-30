'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, X, Loader2, Minimize2, Settings, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { GeminiClient, ChatMessage } from '@/lib/gemini-client';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionDeclaration } from '@google/genai';

interface AIChatDialogProps {
  open: boolean;
  onClose: () => void;
  systemPrompt: string;
  mapTitle: string;
  onFlyToLocation?: (lat: number, lng: number) => void;
  forceMinimize?: boolean; // Force the chat to collapse to icon view
}

export default function AIChatDialog({ open, onClose, systemPrompt, mapTitle, onFlyToLocation, forceMinimize }: AIChatDialogProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [geminiClient, setGeminiClient] = useState<GeminiClient | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechRate, setSpeechRate] = useState(1.05); // Slightly faster for enthusiastic, energetic tone (Zephyr-like)
  const [speechPitch, setSpeechPitch] = useState(1.15); // Higher pitch for bright, cheerful sound (Zephyr characteristic)
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const handleSendVoiceRef = useRef<(text: string) => void>();

  // Define the flyTo function tool
  const flyToTool: FunctionDeclaration = {
    name: 'fly_to_location',
    description: 'Fly the camera to a specific location on the map. Use this when the user asks about a specific zone or location, or when you want to show them a particular area.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        latitude: {
          type: 'number',
          description: 'The latitude of the location to fly to',
        },
        longitude: {
          type: 'number',
          description: 'The longitude of the location to fly to',
        },
        zoneName: {
          type: 'string',
          description: 'The name of the zone being shown (optional, for logging)',
        },
      },
      required: ['latitude', 'longitude'],
    },
  };

  // Handle function calls from the AI
  const handleFunctionCall = async (functionName: string, args: Record<string, unknown>) => {
    console.log('[AIChatDialog] Function call:', functionName, args);

    if (functionName === 'fly_to_location' && onFlyToLocation) {
      const lat = args.latitude as number;
      const lng = args.longitude as number;
      const zoneName = args.zoneName as string | undefined;

      console.log(`[AIChatDialog] Flying to ${zoneName || 'location'}: ${lat}, ${lng}`);
      onFlyToLocation(lat, lng);

      return {
        success: true,
        message: `Camera moved to ${zoneName || 'the location'}`,
      };
    }

    return {
      success: false,
      message: 'Function not found',
    };
  };

  // Initialize speech synthesis and load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;

      // Function to load and select best voice (optimized for Zephyr-like characteristics)
      const loadVoices = () => {
        const voices = synthRef.current?.getVoices() || [];
        setAvailableVoices(voices);

        if (voices.length > 0 && !selectedVoice) {
          // Select voice matching "Zephyr" characteristics: Bright, Higher pitch, enthusiastic
          const zephyrLikeVoice =
            // Priority 1: Google UK/US Female (bright, clear, higher pitch)
            voices.find(v =>
              v.name.includes('Google') &&
              (v.name.includes('UK English Female') || v.name.includes('US English Female')) &&
              v.lang.startsWith('en')
            ) ||
            // Priority 2: Apple/Microsoft premium female voices (youthful, bright)
            voices.find(v =>
              (v.name.includes('Samantha') || // Apple's bright female voice
               v.name.includes('Victoria') || // Microsoft's upbeat voice
               v.name.includes('Zira') ||     // Microsoft's enthusiastic voice
               v.name.includes('Karen')) &&   // Australian - bright tone
              v.lang.startsWith('en')
            ) ||
            // Priority 3: Any "Female" labeled voice
            voices.find(v =>
              (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman')) &&
              v.lang.startsWith('en')
            ) ||
            // Priority 4: English voices that tend to be higher pitched
            voices.find(v => v.lang === 'en-GB' || v.lang === 'en-AU') || // UK/Australian tend brighter
            voices.find(v => v.lang === 'en-US') ||
            voices.find(v => v.lang.startsWith('en')) ||
            voices[0]; // Last resort: first available voice

          if (zephyrLikeVoice) {
            setSelectedVoice(zephyrLikeVoice);
            console.log('[Voice] Selected Zephyr-like voice:', zephyrLikeVoice.name, zephyrLikeVoice.lang);
          }
        }
      };

      // Load voices immediately
      loadVoices();

      // Also listen for voiceschanged event (some browsers load voices async)
      if (synthRef.current) {
        synthRef.current.addEventListener('voiceschanged', loadVoices);
      }

      return () => {
        if (synthRef.current) {
          synthRef.current.removeEventListener('voiceschanged', loadVoices);
        }
      };
    }
  }, [selectedVoice]);

  // Speak AI responses
  const speakText = useCallback((text: string) => {
    if (!voiceEnabled || !synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    // Small delay to avoid "interrupted" errors
    setTimeout(() => {
      if (!synthRef.current) return;

      const utterance = new SpeechSynthesisUtterance(text);

      // Apply selected voice and settings
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;
      utterance.volume = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (error: SpeechSynthesisErrorEvent) => {
        // Ignore expected errors
        if (error.error === 'interrupted' || error.error === 'canceled') {
          // These are normal - user canceled or new speech started
        } else if (error.error === 'not-allowed') {
          // Browser autoplay restriction - inform user
          console.log('[Voice] Autoplay blocked. Speech will work after user interaction.');
        } else {
          // Unexpected errors
          console.error('[Voice] Speech error:', error.error);
        }
        setIsSpeaking(false);
      };

      synthRef.current.speak(utterance);
    }, 100);
  }, [voiceEnabled, selectedVoice, speechRate, speechPitch]);

  // Initialize Gemini client
  useEffect(() => {
    if (open) {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        console.error('NEXT_PUBLIC_GEMINI_API_KEY not found');
        setMessages([{
          role: 'system',
          text: 'Error: Gemini API key not configured. Please add NEXT_PUBLIC_GEMINI_API_KEY to your environment variables.',
          timestamp: new Date(),
        }]);
        return;
      }

      const finalPrompt = customSystemPrompt || systemPrompt;
      console.log('[AIChatDialog] Initializing Gemini client with prompt length:', finalPrompt.length);

      const client = new GeminiClient({
        apiKey,
        systemInstruction: finalPrompt,
        tools: [flyToTool],
        onFunctionCall: handleFunctionCall,
      });
      setGeminiClient(client);

      // Only add welcome message on initial open (when there are no messages)
      if (messages.length === 0) {
        const welcomeText = `Hello! I'm your AI guide for ${mapTitle}. I can help you explore the zones, answer questions about locations, and navigate the map. Ask me to show you any location! How can I assist you today?`;
        setMessages([{
          role: 'model',
          text: welcomeText,
          timestamp: new Date(),
        }]);
      }
    }
  }, [open, systemPrompt, mapTitle, customSystemPrompt]);

  // Listen for welcome speech trigger (after user interaction)
  useEffect(() => {
    const handleWelcomeSpeech = () => {
      if (messages.length > 0 && voiceEnabled) {
        const welcomeMessage = messages.find(m => m.role === 'model');
        if (welcomeMessage) {
          console.log('[AIChatDialog] Playing welcome message after user interaction');
          speakText(welcomeMessage.text);
        }
      }
    };

    window.addEventListener('trigger-ai-welcome-speech', handleWelcomeSpeech);
    return () => {
      window.removeEventListener('trigger-ai-welcome-speech', handleWelcomeSpeech);
    };
  }, [messages, voiceEnabled, speakText]);

  // Handle system prompt updates
  const handleUpdateSystemPrompt = () => {
    if (geminiClient && customSystemPrompt) {
      const finalPrompt = customSystemPrompt || systemPrompt;
      geminiClient.updateSystemInstruction(finalPrompt);
      setMessages([{
        role: 'system',
        text: 'System prompt updated! The AI will now follow the new instructions.',
        timestamp: new Date(),
      }]);
      setShowSettings(false);
    }
  };

  // Send voice message
  const handleSendVoice = useCallback(async (text: string) => {
    if (!text.trim() || !geminiClient || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await geminiClient.sendMessage(text);

      const aiMessage: ChatMessage = {
        role: 'model',
        text: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Speak the response if voice is enabled
      if (voiceEnabled) {
        speakText(response);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: ChatMessage = {
        role: 'system',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [geminiClient, isLoading, voiceEnabled]);

  // Update the ref whenever handleSendVoice changes
  useEffect(() => {
    handleSendVoiceRef.current = handleSendVoice;
  }, [handleSendVoice]);

  // Initialize speech recognition (only once)
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('[Voice] Transcript received:', transcript);
        setIsListening(false);

        // Immediately send the transcribed message without showing in input
        // Use the ref to call the latest version of handleSendVoice
        if (handleSendVoiceRef.current) {
          handleSendVoiceRef.current(transcript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        console.log('[Voice] Recognition ended');
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []); // Empty dependency array - only run once

  // Handle voice input toggle
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      console.log('[Voice] Stopping listening');
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      console.log('[Voice] Starting listening');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('[Voice] Error starting recognition:', error);
        alert('Failed to start voice recognition: ' + error);
      }
    }
  };

  // Auto-expand when opening, but respect forceMinimize
  useEffect(() => {
    if (open && !forceMinimize) {
      setIsExpanded(true);
    }
  }, [open, forceMinimize]);

  // Collapse when forceMinimize becomes true
  useEffect(() => {
    if (forceMinimize) {
      setIsExpanded(false);
    }
  }, [forceMinimize]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !geminiClient || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await geminiClient.sendMessage(input);

      const aiMessage: ChatMessage = {
        role: 'model',
        text: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Speak the response if voice is enabled
      if (voiceEnabled) {
        speakText(response);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: ChatMessage = {
        role: 'system',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    setIsExpanded(false);
    // Clear chat when closing
    setTimeout(() => {
      setMessages([]);
      setGeminiClient(null);
      onClose();
    }, 300); // Wait for animation to finish
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 950, // Above zone details (900) but below full-screen overlays
      }}
    >
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            style={{
              width: '320px',
              height: '480px',
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Bot className="h-5 w-5" style={{ color: '#60a5fa' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>
                    AI Navigator
                  </h3>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                    {mapTitle}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(!showSettings)}
                  style={{
                    width: '32px',
                    height: '32px',
                    color: showSettings ? '#60a5fa' : 'rgba(255, 255, 255, 0.8)',
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggle}
                  style={{
                    width: '32px',
                    height: '32px',
                    color: 'rgba(255, 255, 255, 0.8)',
                  }}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div
                style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      marginBottom: '6px',
                      fontWeight: 500,
                    }}
                  >
                    Custom System Prompt
                  </label>
                  <textarea
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    placeholder="Enter custom instructions for the AI... (leave empty to use default)"
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <Button
                  onClick={handleUpdateSystemPrompt}
                  disabled={!customSystemPrompt}
                  style={{
                    width: '100%',
                    backgroundColor: customSystemPrompt ? '#2563eb' : 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    padding: '8px',
                    fontSize: '13px',
                  }}
                >
                  Update AI Instructions
                </Button>

                {/* Voice Settings */}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <h4 style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px', fontWeight: 600 }}>
                    Voice Settings
                  </h4>
                  <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '12px', lineHeight: '1.4' }}>
                    Optimized for bright, enthusiastic tone (Zephyr-inspired)
                  </p>

                  {/* Voice Selection */}
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.8)',
                        marginBottom: '6px',
                      }}
                    >
                      Voice
                    </label>
                    <select
                      value={selectedVoice?.name || ''}
                      onChange={(e) => {
                        const voice = availableVoices.find(v => v.name === e.target.value);
                        if (voice) setSelectedVoice(voice);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    >
                      {availableVoices.map((voice) => (
                        <option key={voice.name} value={voice.name} style={{ backgroundColor: '#1a1a1a' }}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Speed Control */}
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.8)',
                        marginBottom: '6px',
                      }}
                    >
                      <span>Speed</span>
                      <span style={{ color: '#60a5fa' }}>{speechRate.toFixed(1)}x</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      style={{
                        width: '100%',
                        accentColor: '#2563eb',
                      }}
                    />
                  </div>

                  {/* Pitch Control */}
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.8)',
                        marginBottom: '6px',
                      }}
                    >
                      <span>Pitch</span>
                      <span style={{ color: '#60a5fa' }}>{speechPitch.toFixed(1)}</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speechPitch}
                      onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                      style={{
                        width: '100%',
                        accentColor: '#2563eb',
                      }}
                    />
                  </div>

                  {/* Test Voice Button */}
                  <Button
                    onClick={() => speakText("Hello! I'm your AI navigator. This is how I sound with the current settings.")}
                    disabled={!selectedVoice || isSpeaking}
                    style={{
                      width: '100%',
                      backgroundColor: '#16a34a',
                      color: '#fff',
                      padding: '8px',
                      fontSize: '13px',
                    }}
                  >
                    {isSpeaking ? 'Speaking...' : 'Test Voice'}
                  </Button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div
              ref={scrollAreaRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        backgroundColor:
                          message.role === 'user'
                            ? '#2563eb'
                            : message.role === 'system'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : 'rgba(255, 255, 255, 0.1)',
                        color: message.role === 'system' ? '#fca5a5' : '#fff',
                      }}
                    >
                      <p style={{ fontSize: '14px', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {message.text}
                      </p>
                      <p
                        style={{
                          fontSize: '11px',
                          opacity: 0.7,
                          marginTop: '4px',
                          marginBottom: 0,
                        }}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#fff' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div
              style={{
                padding: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Voice controls */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', justifyContent: 'center' }}>
                <Button
                  onClick={toggleListening}
                  size="icon"
                  disabled={!geminiClient}
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: isListening ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    border: isListening ? '2px solid #dc2626' : '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  {isListening ? <Mic className="h-5 w-5 animate-pulse" /> : <MicOff className="h-5 w-5" />}
                </Button>
                <Button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  size="icon"
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: voiceEnabled ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    color: voiceEnabled ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                  title={voiceEnabled ? 'Voice output enabled' : 'Voice output disabled'}
                >
                  {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </Button>
                {isSpeaking && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0 12px',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderRadius: '20px',
                  }}>
                    <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse" />
                    <span style={{ fontSize: '12px', color: '#60a5fa' }}>Speaking...</span>
                  </div>
                )}
              </div>

              {/* Text input */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isListening ? 'Listening...' : 'Type or speak...'}
                  disabled={isLoading || !geminiClient || isListening}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    flex: 1,
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || !geminiClient}
                  size="icon"
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#fff',
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={handleToggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(37, 99, 235, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <Bot className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
