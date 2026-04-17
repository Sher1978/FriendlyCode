import React from 'react';
import { motion } from 'framer-motion';

const DubaiTechBadge = ({ className = "" }) => {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-yellow-500/10 blur-md rounded-full" />
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-md border border-[#D4AF37]/40 rounded-full"
      >
        {/* Shimmer Effect */}
        <motion.div
          animate={{
            left: ['-100%', '200%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 1
          }}
          className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 pointer-events-none"
        />

        {/* Icon - Diamond/Hexagon shape */}
        <div className="w-2 h-2 rounded-sm bg-gradient-to-tr from-[#C8A84B] to-[#FFD700] rotate-45 shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
        
        <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#C8A84B] bg-clip-text text-transparent">
          Dubai Tech
        </span>
      </motion.div>
    </div>
  );
};

export default DubaiTechBadge;
