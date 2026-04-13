import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
}

const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: [0.22, 1, 0.36, 1] as const,
        }
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: {
            duration: 0.2,
            ease: [0.22, 1, 0.36, 1] as const,
        }
    }
};

export default function PageTransition({ children, className = '' }: PageTransitionProps) {
    return (
        <motion.div
            className={className}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
        >
            {children}
        </motion.div>
    );
}
