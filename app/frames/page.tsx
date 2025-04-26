"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { frames } from "../data/frames";
import StarField from "@/components/StarField";

export default function FrameSelection() {
  const router = useRouter();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const frameVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-black text-white p-8 relative overflow-hidden">
      <StarField />

      <div className="max-w-7xl mx-auto relative z-10 pt-12">
        <div className="flex items-center gap-6 mb-12 pl-4">
          <motion.div
            onClick={() => router.back()}
            className="cursor-pointer w-20 h-20 relative group -mt-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="relative w-full h-full"
              animate={{
                y: [0, -4, 4, 0],
                rotate: [0, -3, 3, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Image
                src="/moon.png"
                alt="Back"
                fill
                className="object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] group-hover:drop-shadow-[0_0_25px_rgba(255,255,255,0.5)] transition-all duration-300"
              />
            </motion.div>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 rounded-full opacity-0 group-hover:opacity-100"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0, 0.2, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300"
          >
            Nocturne&apos;s Studio
          </motion.h2>
        </div>

        <motion.h1
          className="text-6xl mt-10 font-bold mb-30 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-indigo-300 to-purple-300"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Choose Your Frame
        </motion.h1>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {frames.map((frame) => (
            <motion.div
              key={frame.id}
              variants={frameVariants}
              onClick={() => router.push(`/capture?frameId=${frame.id}`)}
              className="group aspect-[4/3] bg-purple-900/10 rounded-lg border-2 border-purple-500/30 p-4 hover:border-purple-400/60 transition-all duration-300 cursor-pointer relative overflow-hidden"
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-purple-500/20 to-indigo-600/20 backdrop-blur-[6px] opacity-0 group-hover:opacity-100 transition-all duration-300"
                initial={false}
              />

              {frame.imagePath ? (
                <motion.div
                  className="relative w-full h-full flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div
                    className={`relative ${
                      frame.layout === "horizontal"
                        ? "w-full h-2/3"
                        : "w-2/3 h-full"
                    }`}
                  >
                    <Image
                      src={frame.imagePath}
                      alt={frame.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-lg text-purple-200">Frame preview</p>
                </div>
              )}

              <motion.div
                className="absolute inset-0 flex flex-col justify-end p-6 z-10 overflow-hidden"
                initial={false}
              >
                <motion.div className="transform translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 space-y-2">
                  <motion.h3 className="text-xl font-semibold text-white/90 drop-shadow-lg">
                    {frame.name}
                  </motion.h3>
                  {frame.description && (
                    <motion.p className="text-sm text-white/80 drop-shadow-lg">
                      {frame.description}
                    </motion.p>
                  )}
                </motion.div>
              </motion.div>

              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-purple-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                initial={false}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
