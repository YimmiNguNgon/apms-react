import { useEffect, useRef, useState } from 'react';

export interface UseSmoothProgressOptions {
  targetProgress: number;
  jobId?: string | null;
  status?: string | null;
  onCompleteReached?: () => void;
}

/**
 * Smoothly interpolates displayed progress toward the backend target progress.
 *
 * Rules:
 * 1. Backend-authoritative: stops exactly at targetProgress, never fabricates progress beyond target.
 * 2. Monotonic within the same jobId: ignores out-of-order stale responses.
 * 3. Immediate reset on new jobId: resets baseline when a new extraction job starts.
 * 4. Halts on failure/cancellation: stops animation immediately if status is FAILED or CANCELLED.
 * 5. Completion callback: notifies once display reaches 100 when status is COMPLETED/EXTRACTED.
 */
export function useSmoothProgress({
  targetProgress,
  jobId,
  status,
  onCompleteReached,
}: UseSmoothProgressOptions): number {
  const boundedTarget = Math.min(100, Math.max(0, Math.round(targetProgress || 0)));

  // Current display percentage
  const [displayProgress, setDisplayProgress] = useState<number>(boundedTarget);

  const currentJobIdRef = useRef<string | null>(jobId || null);
  const targetRef = useRef<number>(boundedTarget);
  const displayRef = useRef<number>(boundedTarget);
  const onCompleteRef = useRef(onCompleteReached);

  useEffect(() => {
    onCompleteRef.current = onCompleteReached;
  }, [onCompleteReached]);

  // Track if completion callback already fired for this job run
  const completionFiredRef = useRef<boolean>(false);

  // Sync displayRef with current state
  useEffect(() => {
    displayRef.current = displayProgress;
  }, [displayProgress]);

  // Handle jobId changes or monotonic target updates
  useEffect(() => {
    if (jobId !== currentJobIdRef.current) {
      // New job: reset immediately to new job's initial target
      currentJobIdRef.current = jobId || null;
      completionFiredRef.current = false;
      targetRef.current = boundedTarget;
      displayRef.current = boundedTarget;
      setDisplayProgress(boundedTarget);
    } else {
      // Same job: target is monotonic
      targetRef.current = Math.max(targetRef.current, boundedTarget);
    }
  }, [jobId, boundedTarget]);

  // Animation loop toward targetRef.current
  useEffect(() => {
    // If failed or cancelled, halt animation immediately
    if (status === 'FAILED' || status === 'CANCELLED') {
      return;
    }

    let animationFrameId: number;
    let lastStepTime = performance.now();

    const tick = (now: number) => {
      const target = targetRef.current;
      const current = displayRef.current;

      if (current < target) {
        const delta = target - current;
        // Dynamic pace: 35ms for larger jumps, 45ms for smaller gaps
        const interval = delta > 25 ? 35 : 45;
        const elapsed = now - lastStepTime;

        if (elapsed >= interval) {
          // Increment by 2 for large gaps (>40), otherwise 1
          const step = delta > 40 ? Math.min(2, delta) : 1;
          const next = Math.min(target, current + step);

          displayRef.current = next;
          setDisplayProgress(next);
          lastStepTime = now;

          if (next >= 100 && target >= 100) {
            const isCompletedStatus = status === 'COMPLETED' || status === 'EXTRACTED';
            if (isCompletedStatus && !completionFiredRef.current) {
              completionFiredRef.current = true;
              onCompleteRef.current?.();
            }
          }
        }
        animationFrameId = requestAnimationFrame(tick);
      } else if (current >= 100 && target >= 100) {
        const isCompletedStatus = status === 'COMPLETED' || status === 'EXTRACTED';
        if (isCompletedStatus && !completionFiredRef.current) {
          completionFiredRef.current = true;
          onCompleteRef.current?.();
        }
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [boundedTarget, status]);

  return displayProgress;
}

export default useSmoothProgress;
