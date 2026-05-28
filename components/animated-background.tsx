'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#080B11' }}>
      {/* Primary accent orb — violet */}
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: 480,
          height: 480,
          background: 'radial-gradient(circle, rgba(124,106,245,0.18) 0%, transparent 70%)',
          top: '-10%',
          left: '-5%',
        }}
        animate={{ x: [0, 80, 0], y: [0, -60, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Secondary accent orb — blue */}
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(91,141,245,0.14) 0%, transparent 70%)',
          top: '5%',
          right: '-8%',
        }}
        animate={{ x: [-60, 0, -60], y: [60, 0, 60] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Bottom center orb */}
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: 360,
          height: 360,
          background: 'radial-gradient(circle, rgba(124,106,245,0.10) 0%, transparent 70%)',
          bottom: '-5%',
          left: '40%',
        }}
        animate={{ x: [0, 80, -80, 0], y: [-60, 0, 60, -60] }}
        transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(124,106,245,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,106,245,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(8,11,17,0.6) 100%)',
        }}
      />
    </div>
  );
}
