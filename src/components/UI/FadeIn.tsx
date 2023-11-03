import type { HTMLMotionProps } from 'framer-motion';
import { motion } from 'framer-motion';

const FadeIn = (props: HTMLMotionProps<'div'>) => (
  <motion.div
    initial={{ opacity: 0, x: 0, y: 20 }}
    animate={{ opacity: 1, x: 0, y: 0 }}
    transition={{ duration: 0.4, type: 'spring' }}
    {...props}
  >
    {props.children}
  </motion.div>
);

export { FadeIn };
