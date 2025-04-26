"use client";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

interface StarPosition {
  left: number;
  top: number;
}

const StarField = () => {
  const [stars, setStars] = useState<StarPosition[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Generate star positions only on client-side
    const starPositions = [...Array(15)].map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
    }));
    setStars(starPositions);
    setIsClient(true);
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ duration: 2 }}
        className="stars"
      />
      {isClient &&
        stars.map((position, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            initial={{ opacity: 0 }}
            animate={{
              scale: [0.5, 1, 0.5],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              left: `${position.left}%`,
              top: `${position.top}%`,
            }}
          />
        ))}
    </div>
  );
};

export default StarField;
