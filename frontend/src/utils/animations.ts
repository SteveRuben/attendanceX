/**
 * Animation Utilities - Framer Motion Variants
 * 
 * Reusable animation variants for the homepage redesign.
 * All animations respect prefers-reduced-motion settings.
 */

import { Variants } from 'framer-motion';

// ============================================
// BASIC ANIMATIONS
// ============================================

/**
 * Fade in animation
 * Duration: 600ms
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

/**
 * Slide up animation
 * Duration: 600ms
 * Distance: 30px
 */
export const slideUp: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

/**
 * Slide down animation
 * Duration: 600ms
 * Distance: 30px
 */
export const slideDown: Variants = {
  hidden: {
    opacity: 0,
    y: -30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

/**
 * Slide left animation
 * Duration: 600ms
 * Distance: 30px
 */
export const slideLeft: Variants = {
  hidden: {
    opacity: 0,
    x: 30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

/**
 * Slide right animation
 * Duration: 600ms
 * Distance: 30px
 */
export const slideRight: Variants = {
  hidden: {
    opacity: 0,
    x: -30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

/**
 * Scale in animation
 * Duration: 400ms
 * Scale: 0.9 to 1
 */
export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

/**
 * Scale out animation
 * Duration: 400ms
 * Scale: 1 to 0.9
 */
export const scaleOut: Variants = {
  visible: {
    opacity: 1,
    scale: 1,
  },
  hidden: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.4,
      ease: 'easeIn',
    },
  },
};

// ============================================
// STAGGER ANIMATIONS
// ============================================

/**
 * Stagger container animation
 * Staggers children with 100ms delay
 * Delays start by 200ms
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

/**
 * Fast stagger container
 * Staggers children with 50ms delay
 * Delays start by 100ms
 */
export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

/**
 * Slow stagger container
 * Staggers children with 150ms delay
 * Delays start by 300ms
 */
export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

/**
 * Stagger item animation
 * Used with staggerContainer
 */
export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

// ============================================
// CONTINUOUS ANIMATIONS
// ============================================

/**
 * Float animation (continuous)
 * Duration: 6 seconds
 * Distance: 20px
 */
export const float: Variants = {
  animate: {
    y: [0, -20, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Pulse animation (continuous)
 * Duration: 2 seconds
 */
export const pulse: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Rotate animation (continuous)
 * Duration: 20 seconds
 */
export const rotate: Variants = {
  animate: {
    rotate: [0, 360],
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ============================================
// HOVER ANIMATIONS
// ============================================

/**
 * Hover scale animation
 * Scale: 1 to 1.05
 * Duration: 300ms
 */
export const hoverScale = {
  rest: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

/**
 * Hover lift animation
 * Lift: 0 to -8px
 * Duration: 300ms
 * Adds shadow
 */
export const hoverLift = {
  rest: {
    y: 0,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  hover: {
    y: -8,
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.20)',
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

/**
 * Hover glow animation
 * Duration: 300ms
 * Adds colored glow
 */
export const hoverGlow = {
  rest: {
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  hover: {
    boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

/**
 * Hover rotate animation
 * Rotation: 0 to 5 degrees
 * Duration: 300ms
 */
export const hoverRotate = {
  rest: { rotate: 0 },
  hover: {
    rotate: 5,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// ============================================
// TAP ANIMATIONS
// ============================================

/**
 * Tap scale animation
 * Scale: 1 to 0.95
 * Duration: 100ms
 */
export const tapScale = {
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: 'easeInOut',
    },
  },
};

/**
 * Tap bounce animation
 * Scale: 1 to 0.9 to 1.1 to 1
 * Duration: 300ms
 */
export const tapBounce = {
  tap: {
    scale: [1, 0.9, 1.1, 1],
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
};

// ============================================
// PAGE TRANSITIONS
// ============================================

/**
 * Page fade transition
 * Duration: 300ms
 */
export const pageFade: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
};

/**
 * Page slide transition
 * Duration: 400ms
 * Distance: 50px
 */
export const pageSlide: Variants = {
  initial: {
    opacity: 0,
    x: 50,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    x: -50,
    transition: {
      duration: 0.4,
      ease: 'easeIn',
    },
  },
};

// ============================================
// MODAL ANIMATIONS
// ============================================

/**
 * Modal backdrop animation
 * Duration: 200ms
 */
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

/**
 * Modal content animation
 * Duration: 300ms
 * Scale: 0.95 to 1
 */
export const modalContent: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// ============================================
// DRAWER ANIMATIONS
// ============================================

/**
 * Drawer slide from right
 * Duration: 300ms
 */
export const drawerRight: Variants = {
  hidden: {
    x: '100%',
  },
  visible: {
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

/**
 * Drawer slide from left
 * Duration: 300ms
 */
export const drawerLeft: Variants = {
  hidden: {
    x: '-100%',
  },
  visible: {
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

/**
 * Drawer slide from bottom
 * Duration: 300ms
 */
export const drawerBottom: Variants = {
  hidden: {
    y: '100%',
  },
  visible: {
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create a custom delay variant
 * @param delay - Delay in seconds
 * @returns Variants with custom delay
 */
export function createDelayedVariant(delay: number): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delay,
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };
}

/**
 * Create a custom stagger container
 * @param staggerDelay - Delay between children in seconds
 * @param initialDelay - Initial delay before first child in seconds
 * @returns Variants with custom stagger timing
 */
export function createStaggerContainer(
  staggerDelay: number = 0.1,
  initialDelay: number = 0.2
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
  };
}

/**
 * Create a custom slide animation
 * @param direction - Direction to slide from ('up' | 'down' | 'left' | 'right')
 * @param distance - Distance to slide in pixels
 * @param duration - Animation duration in seconds
 * @returns Variants with custom slide animation
 */
export function createSlideVariant(
  direction: 'up' | 'down' | 'left' | 'right',
  distance: number = 30,
  duration: number = 0.6
): Variants {
  const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
  const value = direction === 'up' || direction === 'left' ? distance : -distance;

  return {
    hidden: {
      opacity: 0,
      [axis]: value,
    },
    visible: {
      opacity: 1,
      [axis]: 0,
      transition: {
        duration,
        ease: 'easeOut',
      },
    },
  };
}

/**
 * Combine multiple variants
 * @param variants - Array of variants to combine
 * @returns Combined variants
 */
export function combineVariants(...variants: Variants[]): Variants {
  return variants.reduce((acc, variant) => {
    return {
      ...acc,
      ...variant,
    };
  }, {});
}

// ============================================
// ANIMATION PRESETS
// ============================================

/**
 * Hero section animation preset
 * Staggered animations for title, subtitle, and CTA
 */
export const heroAnimations = {
  container: staggerContainer,
  title: slideUp,
  subtitle: createDelayedVariant(0.2),
  cta: createDelayedVariant(0.4),
};

/**
 * Card grid animation preset
 * Staggered animations for grid items
 */
export const cardGridAnimations = {
  container: staggerContainer,
  item: staggerItem,
};

/**
 * Carousel animation preset
 * Fade in with slight scale
 */
export const carouselAnimations = {
  container: fadeIn,
  item: scaleIn,
};

/**
 * Form animation preset
 * Slide up with stagger
 */
export const formAnimations = {
  container: staggerContainerFast,
  field: slideUp,
};
