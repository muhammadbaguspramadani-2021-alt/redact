'use client';
import { motion } from 'framer-motion';

interface RedactedProps {
  children: React.ReactNode;
  className?: string;
}

export function Redacted({ children, className = "" }: RedactedProps) {
  return (
    <motion.span
      whileHover={{ scale: 1.02 }}
      className={`redacted-base ${className}`}
    >
      {children}
    </motion.span>
  );
}
