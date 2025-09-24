// src/hooks/useSpeechRecognition.js

import { useState, useEffect } from 'react';

// This checks if the browser supports the Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event) => {
      const currentTranscript = event.results[0][0].transcript;
      setTranscript(currentTranscript.toLowerCase().trim());
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };
    
    // Cleanup function to stop listening if the component unmounts
    return () => {
      recognition.stop();
    };
  }, []);

  const startListening = () => {
    if (recognition && !isListening) {
      setTranscript('');
      recognition.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  return { isListening, transcript, startListening, stopListening };
};