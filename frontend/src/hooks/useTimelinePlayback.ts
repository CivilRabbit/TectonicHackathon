import { useCallback, useEffect, useState } from 'react';

export function useTimelinePlayback(
  activeIndex: number,
  lastIndex: number,
  setActiveIndex: (index: number) => void,
  intervalMs = 1400,
) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    if (activeIndex >= lastIndex) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setActiveIndex(activeIndex + 1), intervalMs);
    return () => window.clearTimeout(timer);
  }, [isPlaying, activeIndex, lastIndex, setActiveIndex, intervalMs]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (activeIndex >= lastIndex) setActiveIndex(0);
    setIsPlaying(true);
  }, [isPlaying, activeIndex, lastIndex, setActiveIndex]);

  const stop = useCallback(() => setIsPlaying(false), []);

  return { isPlaying, toggle, stop };
}
