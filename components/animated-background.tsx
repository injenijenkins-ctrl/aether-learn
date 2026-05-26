'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 bg-indigo-600"
        initial={{ x: -100, y: -100 }}
        animate={{
          x: [0, 100, 0],
          y: [0, -100, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute right-0 top-0 w-96 h-96 rounded-full blur-3xl opacity-20 bg-purple-600"
        initial={{ x: 100, y: -100 }}
        animate={{
          x: [-100, 0, -100],
          y: [100, 0, 100],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 bg-blue-600"
        initial={{ x: 0, y: 100 }}
        animate={{
          x: [0, 100, -100, 0],
          y: [-100, 0, 100, -100],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
    </div>
  );
}
