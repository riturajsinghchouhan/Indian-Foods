import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export const useVoiceSearch = (onResult) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.warn('Speech recognition stop error:', e);
            }
            setIsListening(false);
        }
    }, []);

    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            toast.error("Voice search is not supported in this browser.");
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-IN';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (onResult) {
                    onResult(transcript);
                }
                stopListening();
            };

            recognition.onerror = (event) => {
                const errorType = event.error;
                console.error('Speech recognition error:', errorType);
                
                if (errorType === 'not-allowed') {
                    toast.error("Microphone access denied. Please allow permission.");
                } else if (errorType === 'no-speech') {
                    toast.error("No speech detected. Try again.");
                } else if (errorType === 'network') {
                    toast.error("Voice search requires an active internet connection.");
                } else if (errorType === 'aborted') {
                    // Ignore aborted errors
                } else {
                    toast.error(`Voice search error: ${errorType}`);
                }
                stopListening();
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (error) {
            console.error('Speech recognition initialization failed:', error);
            toast.error("Could not start voice search.");
        }
    }, [onResult, stopListening]);

    return {
        isListening,
        startListening,
        stopListening
    };
};
