/**
 * useQuestionTimer Hook
 * 
 * Manages timer for questions - starts when question is clicked,
 * runs continuously, and saves when question is solved.
 * 
 * Features:
 * - Auto-starts when question is opened
 * - Syncs with backend timer state
 * - Persists time across page refreshes
 * - Auto-saves on solve
 */

import { useState, useEffect, useRef } from 'react';
import api from '../api';

export function useQuestionTimer(questionId, userId, questionSolved = false) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const syncedRef = useRef(false);
  const loadingRef = useRef(false);
  const loadedQuestionRef = useRef(null);

  // Load timer state from backend on mount
  useEffect(() => {
    // Create a unique key for this question/user combination
    const questionKey = questionId && userId ? `${questionId}-${userId}` : null;
    
    // Prevent duplicate calls: check if already synced for this question or currently loading
    if (questionId && userId) {
      // If already loaded this exact question/user combo, skip
      if (loadedQuestionRef.current === questionKey && syncedRef.current) {
        return;
      }
      
      // If already loading, skip
      if (loadingRef.current) {
        return;
      }
      
      loadTimerState();
    } else if (questionId && !userId) {
      // If no userId, still start a local timer (but not if solved)
      if (!questionSolved && !startTimeRef.current) {
        startTimeRef.current = Date.now();
        setIsRunning(true);
      }
    }
  }, [questionId, userId, questionSolved]);

  // Load timer state from backend
  const loadTimerState = async () => {
    // Prevent concurrent calls
    if (loadingRef.current) return;
    
    const questionKey = questionId && userId ? `${questionId}-${userId}` : null;
    loadingRef.current = true;
    
    try {
      const response = await api.get(`/timer/${questionId}/state`);
      const data = response.data;
      
      setElapsedTime(data.elapsed_seconds || 0);
      const wasRunning = data.is_running || false;
      setIsRunning(wasRunning);
      
      if (data.started_at) {
        startTimeRef.current = new Date(data.started_at).getTime();
      }
      
      syncedRef.current = true;
      loadedQuestionRef.current = questionKey;
      
      // Don't auto-start timer if question is solved
      // Only auto-start if timer was not running, we have questionId/userId, and question is not solved
      if (!wasRunning && questionId && userId && !questionSolved) {
        // Small delay to ensure state is set before starting
        setTimeout(() => {
          startTimer();
        }, 100);
      } else if (questionSolved && wasRunning) {
        // If question is solved but timer was running, stop it
        setIsRunning(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    } catch (err) {
      // Fallback to localStorage
      const storageKey = `timer-${questionId}-${userId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setElapsedTime(data.elapsedTime || 0);
          startTimeRef.current = data.startTime;
          // If no saved running state, start timer (but not if question is solved)
          if (!data.isRunning && questionId && userId && !questionSolved) {
            setTimeout(() => {
              startTimer();
            }, 100);
          } else if (questionSolved && data.isRunning) {
            // If question is solved but timer was running, stop it
            setIsRunning(false);
          }
        } catch (parseErr) {
          // Start timer if we can't load state (but not if question is solved)
          if (questionId && userId && !questionSolved) {
            setTimeout(() => {
              startTimer();
            }, 100);
          }
        }
      } else {
        // No saved state, start timer (but not if question is solved)
        if (questionId && userId && !questionSolved) {
          setTimeout(() => {
            startTimer();
          }, 100);
      }
      }
    } finally {
      // Reset loading flag after completion
      loadingRef.current = false;
    }
  };

  // Save time to localStorage (backup)
  useEffect(() => {
    if (questionId && userId) {
      const storageKey = `timer-${questionId}-${userId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        elapsedTime,
        startTime: startTimeRef.current,
        lastUpdate: Date.now()
      }));
    }
  }, [elapsedTime, questionId, userId]);

  // Timer logic - runs continuously
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  // Start timer
  const startTimer = async () => {
    if (!questionId) return;
    
    try {
      const response = await api.post('/timer/start', {
        question_id: questionId
      });
      
      const data = response.data;
      setElapsedTime(data.elapsed_seconds || 0);
      setIsRunning(true);
      
      if (data.started_at) {
        startTimeRef.current = new Date(data.started_at).getTime();
      }
    } catch (err) {
      // Fallback to local timer
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      setIsRunning(true);
    }
  };

  // Stop timer
  const stopTimer = async () => {
    if (!questionId) return;
    
    try {
      const response = await api.post('/timer/stop', {
        question_id: questionId
      });
      
      const data = response.data;
      setElapsedTime(data.elapsed_seconds || elapsedTime);
      setIsRunning(false);
      startTimeRef.current = null;
    } catch (err) {
      // Fallback to local stop
      setIsRunning(false);
    }
  };

  // Reset timer
  const resetTimer = async () => {
    // Stop timer on backend if it's running
    if (isRunning && questionId) {
      try {
        await api.post('/timer/stop', {
          question_id: questionId
        });
      } catch (err) {
        // Failed to stop timer on backend during reset
      }
    }
    
    // Reset local state
    setElapsedTime(0);
    startTimeRef.current = null;
    setIsRunning(false);
    
    // Clear localStorage
    if (questionId && userId) {
      const storageKey = `timer-${questionId}-${userId}`;
      localStorage.removeItem(storageKey);
    }
    
    // Reset on backend if we have questionId
    if (questionId) {
      try {
        await api.post('/timer/reset', {
          question_id: questionId
        });
      } catch (err) {
        // Backend might not have reset endpoint, that's okay
      }
    }
  };

  // Save time to backend (called when question is solved)
  const saveTime = async () => {
    if (!questionId || !userId || elapsedTime === 0) return;

    try {
      // Stop timer first to get final time
      await stopTimer();
      
      // Clear localStorage after successful save
      const storageKey = `timer-${questionId}-${userId}`;
      localStorage.removeItem(storageKey);
      
      return true;
    } catch (err) {
      return false;
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    elapsedTime,
    isRunning,
    formattedTime: formatTime(elapsedTime),
    startTimer,
    stopTimer,
    resetTimer,
    saveTime
  };
}
