"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * First page load: no animation (fast first paint). Next navigations: the new page fades and slides in.
 * Only opacity + translate (a lasting filter/transform would break the fixed navbar and 3D canvas).
 */
let firstLoad = true;

export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [animate] = useState(() => !firstLoad);
  useEffect(() => {
    firstLoad = false;
  }, []);
  return (
    <motion.div
      initial={animate && !reduce ? { opacity: 0, y: 24 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
