import { useCallback, useMemo, useRef } from 'react';
import { ctAPI } from '../services/api';

const now = () => Date.now();

const safeUserId = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id || parsed?._id || null;
  } catch {
    return null;
  }
};

export const useSessionLogger = ({ seanceId, assessmentType = 'quiz', studentId = null }) => {
  const eventsRef = useRef([]);
  const startedAtRef = useRef(null);
  const attemptsRef = useRef(new Map());
  const hintsRef = useRef(0);
  const isStartedRef = useRef(false);

  const resolvedStudentId = useMemo(() => studentId || safeUserId(), [studentId]);

  const pushEvent = useCallback((event) => {
    eventsRef.current.push({
      step: eventsRef.current.length,
      event_type: event.event_type,
      question_id: event.question_id || null,
      correctness: typeof event.correctness === 'number' ? event.correctness : null,
      client_ts: new Date().toISOString(),
    });
  }, []);

  const startSession = useCallback(() => {
    if (isStartedRef.current) return;
    isStartedRef.current = true;
    startedAtRef.current = now();
    pushEvent({ event_type: 'start_session' });
  }, [pushEvent]);

  const logAnswer = useCallback(({ questionId, correctness = null }) => {
    if (!isStartedRef.current) startSession();
    pushEvent({
      event_type: 'answer_question',
      question_id: String(questionId),
      correctness,
    });

    const key = String(questionId);
    const previous = attemptsRef.current.get(key) || 0;
    attemptsRef.current.set(key, previous + 1);
  }, [pushEvent, startSession]);

  const logHintUsage = useCallback(({ questionId = null }) => {
    if (!isStartedRef.current) startSession();
    hintsRef.current += 1;
    pushEvent({
      event_type: 'hint_usage',
      question_id: questionId ? String(questionId) : null,
    });
  }, [pushEvent, startSession]);

  const logRetryWrongAnswer = useCallback(({ questionId }) => {
    if (!isStartedRef.current) startSession();
    pushEvent({
      event_type: 'retry_wrong_answer',
      question_id: String(questionId),
    });
  }, [pushEvent, startSession]);

  const flushSession = useCallback(async ({ correctness = 0 }) => {
    if (!seanceId || !resolvedStudentId) return null;
    if (!isStartedRef.current) startSession();

    pushEvent({
      event_type: 'submit',
      correctness,
    });

    const startedAt = startedAtRef.current || now();
    const elapsedMs = Math.max(0, now() - startedAt);

    const attemptsFromEvents = eventsRef.current.filter((e) => e.event_type === 'retry_wrong_answer').length + 1;
    const attemptsFromQuestions = Array.from(attemptsRef.current.values()).reduce((sum, count) => sum + count, 0);

    const payload = {
      student_id: resolvedStudentId,
      seanceId,
      assessment_type: assessmentType,
      sequence: eventsRef.current,
      time_taken: Math.round(elapsedMs / 1000),
      attempts: Math.max(1, attemptsFromEvents, attemptsFromQuestions),
      hints_used: hintsRef.current,
      correctness: Math.max(0, Math.min(1, Number(correctness) || 0)),
    };

    const response = await ctAPI.scoreStudent(payload);

    eventsRef.current = [];
    attemptsRef.current = new Map();
    hintsRef.current = 0;
    startedAtRef.current = null;
    isStartedRef.current = false;

    return response;
  }, [assessmentType, pushEvent, resolvedStudentId, seanceId, startSession]);

  return {
    startSession,
    logAnswer,
    logHintUsage,
    logRetryWrongAnswer,
    flushSession,
  };
};

export default useSessionLogger;
