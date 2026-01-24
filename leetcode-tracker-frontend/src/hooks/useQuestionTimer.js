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

export function useQuestionTimer(questionId, userId) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const syncedRef = useRef(false);

  // Load timer state from backend on mount
  useEffect(() => {
    if (questionId && userId) {
      loadTimerState();
    }
  }, [questionId, userId]);

  // Load timer state from backend
  const loadTimerState = async () => {
    try {
      const response = await api.get(`/timer/${questionId}/state`);
      const data = response.data;
      
      setElapsedTime(data.elapsed_seconds || 0);
      setIsRunning(data.is_running || false);
      
      if (data.started_at) {
        startTimeRef.current = new Date(data.started_at).getTime();
      }
      
      syncedRef.current = true;
    } catch (err) {
      console.error('Failed to load timer state:', err);
      // Fallback to localStorage
      const storageKey = `timer-${questionId}-${userId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setElapsedTime(data.elapsedTime || 0);
          startTimeRef.current = data.startTime;
        } catch (parseErr) {
          console.error('Failed to parse saved timer:', parseErr);
        }
      }
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
      console.error('Failed to start timer:', err);
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
      console.error('Failed to stop timer:', err);
      // Fallback to local stop
      setIsRunning(false);
    }
  };

  // Reset timer
  const resetTimer = () => {
    setElapsedTime(0);
    startTimeRef.current = null;
    setIsRunning(false);
    if (questionId && userId) {
      const storageKey = `timer-${questionId}-${userId}`;
      localStorage.removeItem(storageKey);
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
      console.error('Failed to save time:', err);
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
