"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import StarField from "@/components/StarField";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-900 via-purple-900 to-black text-white relative overflow-hidden">
      <StarField />

      <motion.div
        className="relative z-10 text-center space-y-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="relative w-48 h-48 mx-auto mb-8"
          animate={{
            y: [0, -15, 0],
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-purple-500/20"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ filter: "blur(15px)" }}
          />
          <Image
            src="/moon.png"
            alt="Nocturne's Booth Logo"
            width={192}
            height={192}
            className="drop-shadow-[0_0_25px_rgba(168,85,247,0.4)]"
          />
        </motion.div>
        <motion.h1
          variants={itemVariants}
          className="text-6xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-indigo-300 to-purple-300"
        >
          Nocturne&apos;s Studio
        </motion.h1>
        <motion.p
          variants={itemVariants}
          className="text-xl text-purple-200/80 max-w-md mx-auto mb-8"
        >
          Capture your moments in the ethereal glow of moonlight
        </motion.p>
        <motion.div variants={itemVariants} className="space-y-6">
          <motion.a
            href="/frames"
            className="inline-block px-12 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xl rounded-full shadow-lg relative group overflow-hidden"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-indigo-400/20"
              animate={{
                rotate: [0, 360],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{ filter: "blur(8px)" }}
            />
            <span className="relative">Start Capture</span>
          </motion.a>
        </motion.div>
      </motion.div>
    </main>
  );
}
