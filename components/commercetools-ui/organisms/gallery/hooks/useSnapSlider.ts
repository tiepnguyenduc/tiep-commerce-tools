import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSnapSliderOptions {
  length: number;
  initialIndex?: number;
}

const clamp = (index: number, length: number) => Math.min(Math.max(index, 0), Math.max(length - 1, 0));

/**
 * Drives a CSS scroll-snap track: keeps the active slide in sync with native
 * scrolling (touch swipe, trackpad, scrollbar) and exposes imperative helpers
 * for arrows, dots and thumbnails.
 */
const useSnapSlider = ({ length, initialIndex = 0 }: UseSnapSliderOptions) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const indexRef = useRef(clamp(initialIndex, length));

  const [activeIndex, setActiveIndex] = useState(indexRef.current);

  const commitIndex = useCallback((index: number) => {
    indexRef.current = index;
    setActiveIndex(index);
  }, []);

  const slideTo = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const next = clamp(index, length);

      commitIndex(next);

      const slider = sliderRef.current;
      if (!slider) return;

      slider.scrollTo({ left: slider.clientWidth * next, behavior });
    },
    [commitIndex, length],
  );

  const slideBy = useCallback((offset: number) => slideTo(indexRef.current + offset), [slideTo]);

  const onScroll = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    frameRef.current = requestAnimationFrame(() => {
      const slider = sliderRef.current;
      if (!slider || !slider.clientWidth) return;

      const next = clamp(Math.round(slider.scrollLeft / slider.clientWidth), length);
      if (next !== indexRef.current) commitIndex(next);
    });
  }, [commitIndex, length]);

  // Jump to the requested slide once the track is measurable.
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    slider.scrollTo({ left: slider.clientWidth * indexRef.current, behavior: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resizing changes the slide width, so the scroll offset has to be recomputed.
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      slider.scrollTo({ left: slider.clientWidth * indexRef.current, behavior: 'auto' });
    });

    observer.observe(slider);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return { sliderRef, activeIndex, slideTo, slideBy, onScroll, isFirst: activeIndex <= 0, isLast: activeIndex >= length - 1 };
};

export default useSnapSlider;
