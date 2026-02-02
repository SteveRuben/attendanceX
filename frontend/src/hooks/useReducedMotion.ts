/**
 * useReducedMotion Hook
 * 
 * Detects if the user has requested reduced motion via their system preferences.
 * Respects the prefers-reduced-motion media query for accessibility.
 * 
 * @returns boolean - true if user prefers reduced motion
 */

import { useState, useEffect } from 'react';

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is defined (SSR safety)
    if (typeof window === 'undefined') {
      return;
    }

    // Create media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Create event handler
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(event.matches);
    };

    // Add event listener
    // Use addEventListener if available (modern browsers)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * useAnimationConfig Hook
 * 
 * Returns animation configuration based on reduced motion preference.
 * Provides safe defaults for animations that respect accessibility.
 * 
 * @returns object with animation configuration
 */
export function useAnimationConfig() {
  const prefersReducedMotion = useReducedMotion();

  return {
    // Whether animations should be enabled
    shouldAnimate: !prefersReducedMotion,

    // Duration multiplier (0 if reduced motion, 1 otherwise)
    durationMultiplier: prefersReducedMotion ? 0 : 1,

    // Transition configuration
    transition: prefersReducedMotion
      ? { duration: 0 }
      : { duration: 0.3, ease: 'easeOut' },

    // Initial state for animations
    initial: prefersReducedMotion ? false : 'hidden',

    // Animate state for animations
    animate: prefersReducedMotion ? false : 'visible',

    // Exit state for animations
    exit: prefersReducedMotion ? false : 'hidden',
  };
}

/**
 * useSafeAnimation Hook
 * 
 * Wraps Framer Motion variants to respect reduced motion preferences.
 * Returns modified variants that disable animations when needed.
 * 
 * @param variants - Framer Motion variants object
 * @returns Modified variants that respect reduced motion
 */
export function useSafeAnimation<T extends Record<string, any>>(
  variants: T
): T | false {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return false;
  }

  return variants;
}

/**
 * useConditionalAnimation Hook
 * 
 * Returns animation props only if animations should be enabled.
 * Useful for conditionally applying Framer Motion props.
 * 
 * @param animationProps - Animation props to apply
 * @returns Animation props or empty object
 */
export function useConditionalAnimation<T extends Record<string, any>>(
  animationProps: T
): T | Record<string, never> {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return {};
  }

  return animationProps;
}

/**
 * Animation duration helper
 * 
 * Returns 0 duration if reduced motion is preferred, otherwise returns the specified duration.
 * 
 * @param duration - Desired animation duration in seconds
 * @returns Adjusted duration based on reduced motion preference
 */
export function useAnimationDuration(duration: number): number {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? 0 : duration;
}

/**
 * Animation delay helper
 * 
 * Returns 0 delay if reduced motion is preferred, otherwise returns the specified delay.
 * 
 * @param delay - Desired animation delay in seconds
 * @returns Adjusted delay based on reduced motion preference
 */
export function useAnimationDelay(delay: number): number {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? 0 : delay;
}
