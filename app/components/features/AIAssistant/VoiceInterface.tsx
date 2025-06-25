'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface VoiceInterfaceProps {
  isActive: boolean;
  onClose: () => void;
  onTranscript?: (text: string) => void;
}

export default function VoiceInterface({ isActive, onClose, onTranscript }: VoiceInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isActive) return;

    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser');
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
      setInterimTranscript(interimTranscript);

      // Check for "Hey Nural" wake word
      const combinedText = (transcript + finalTranscript + interimTranscript).toLowerCase();
      if (combinedText.includes('hey nural') || combinedText.includes('hey neural')) {
        // Extract the query after the wake word
        const match = combinedText.match(/hey n[eu]ral[,.]?\s*(.+)/i);
        if (match && match[1]) {
          handleVoiceCommand(match[1].trim());
        }
      }
    };

    recognition.onerror = (event: any) => {
      // Silently handle errors or use a logging service
      setError(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // Start listening automatically
    try {
      recognition.start();
    } catch (err) {
      setError('Failed to start voice recognition');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          // Silently handle cleanup errors
        }
      }
    };
  }, [isActive]);

  const handleVoiceCommand = (query: string) => {
    // Stop listening
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Navigate to chatbot with the query
    router.push(`/chatbot?q=${encodeURIComponent(query)}`);
    
    // Notify parent
    if (onTranscript) {
      onTranscript(query);
    }

    // Close the interface
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setTranscript('');
        setInterimTranscript('');
      } catch (err) {
        // Silently handle start errors
      }
    }
  };

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ zIndex: 10000 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-surface-container rounded-3xl p-8 max-w-lg w-full shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-container-muted transition-colors"
          >
            <X className="w-5 h-5 text-onsurface-secondary" />
          </button>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-onsurface-primary mb-2">
              Voice Search
            </h2>
            <p className="text-sm text-onsurface-secondary">
              Say "Hey Nural" followed by your question
            </p>
          </div>

          {/* Microphone Button */}
          <div className="flex justify-center mb-6">
            <motion.button
              onClick={toggleListening}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-primary hover:bg-primary-hover'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {isListening && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-current opacity-20"
                    animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-current opacity-20"
                    animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                  />
                </>
              )}
              {isListening ? (
                <Mic className="w-8 h-8 text-white" />
              ) : (
                <MicOff className="w-8 h-8 text-white" />
              )}
            </motion.button>
          </div>

          {/* Status */}
          <div className="text-center mb-4">
            {error ? (
              <p className="text-red-500 text-sm">{error}</p>
            ) : isListening ? (
              <p className="text-primary text-sm font-medium">Listening...</p>
            ) : (
              <p className="text-onsurface-secondary text-sm">Click the microphone to start</p>
            )}
          </div>

          {/* Transcript */}
          {(transcript || interimTranscript) && (
            <div className="bg-surface-container-muted rounded-xl p-4 max-h-32 overflow-y-auto">
              <p className="text-sm text-onsurface-primary">
                {transcript}
                <span className="text-onsurface-secondary italic">{interimTranscript}</span>
              </p>
            </div>
          )}

          {/* Examples */}
          <div className="mt-6 space-y-2">
            <p className="text-xs text-onsurface-secondary text-center mb-2">Try saying:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                'Hey Nural, who knows React?',
                'Hey Nural, what\'s trending?',
                'Hey Nural, find OAuth experts'
              ].map((example, i) => (
                <span 
                  key={i}
                  className="text-xs bg-surface-container-muted px-3 py-1 rounded-full text-onsurface-secondary"
                >
                  "{example}"
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}