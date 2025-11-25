import { Variants, Transition } from "framer-motion";

/**
 * Animation variants and presets for consistent animations across the site
 */

// Common transitions
export const transitions = {
  smooth: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } as Transition, // Smoother, more polished
  spring: { type: "spring", stiffness: 280, damping: 28 } as Transition, // Softer spring
  springBounce: { type: "spring", stiffness: 350, damping: 20 } as Transition,
  gentle: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } as Transition,
  quick: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } as Transition, // Less abrupt
  slow: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } as Transition,
};

// Fade animations
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.smooth },
  exit: { opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
};

// Slide animations
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.spring,
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
};

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.spring,
  },
  exit: { 
    opacity: 0, 
    y: 20,
    transition: transitions.quick,
  },
};

export const slideLeftVariants: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.spring,
  },
  exit: { 
    opacity: 0, 
    x: -30,
    transition: transitions.quick,
  },
};

export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.spring,
  },
  exit: { 
    opacity: 0, 
    x: 30,
    transition: transitions.quick,
  },
};

// Scale animations
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: transitions.springBounce,
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
};

// Combined fade + slide
export const fadeSlideUpVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.spring,
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
};

export const fadeSlideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.spring,
  },
  exit: { 
    opacity: 0, 
    y: 20,
    transition: transitions.quick,
  },
};

// Stagger container variants for lists
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.08,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.spring,
  },
};

// Card hover animations
export const cardHoverVariants: Variants = {
  rest: { 
    scale: 1,
    y: 0,
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
  hover: {
    scale: 1.02,
    y: -4,
    boxShadow: "0 12px 40px rgba(203, 166, 247, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)",
    transition: transitions.smooth,
  },
};

// Button animations
export const buttonVariants: Variants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.05,
    transition: transitions.quick,
  },
  tap: { 
    scale: 0.95,
    transition: transitions.quick,
  },
};

// Page transition variants - smooth, polished transitions
export const pageVariants: Variants = {
  initial: { 
    opacity: 0,
    y: 8,
  },
  enter: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1], // Custom easing for smooth feel
      opacity: { duration: 0.3 },
    },
  },
  exit: { 
    opacity: 0,
    y: -4,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 0.2, 1],
      opacity: { duration: 0.2 },
    },
  },
};

// Modal/Dialog animations
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 12,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.springBounce,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
};

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: transitions.smooth,
  },
  exit: { 
    opacity: 0,
    transition: transitions.quick,
  },
};

// Table row animations
export const tableRowVariants: Variants = {
  hidden: { 
    opacity: 0,
    x: -20,
  },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.03,
      ...transitions.spring,
    },
  }),
};

// Badge animations
export const badgeVariants: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.springBounce,
  },
};

// Icon animations
export const iconVariants: Variants = {
  rest: { 
    scale: 1,
    rotate: 0,
  },
  hover: {
    scale: 1.2,
    rotate: 12,
    transition: transitions.quick,
  },
};

// Pulse animation for loading states
export const pulseVariants: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Shimmer animation
export const shimmerVariants: Variants = {
  shimmer: {
    backgroundPosition: ["-1000px 0", "1000px 0"],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// Utility function to create staggered delays
export const getStaggerDelay = (index: number, baseDelay: number = 0.05) => {
  return index * baseDelay;
};

// Utility function for spring transitions with custom values
export const createSpringTransition = (
  stiffness: number = 300,
  damping: number = 30
): Transition => ({
  type: "spring",
  stiffness,
  damping,
});

