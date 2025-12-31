import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export const LoadingSpinner = ({ size = "md", text }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        className={`relative ${sizeClasses[size]}`}
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Shield SVG */}
        <svg
          viewBox="0 0 32 32"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shield shape */}
          <motion.path
            d="M16 2 L28 6 L28 14 C28 22 22 28 16 30 C10 28 4 22 4 14 L4 6 Z"
            className="fill-primary"
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          {/* Inner shield highlight */}
          <motion.path
            d="M16 5 L25 8 L25 14 C25 20.5 20 25.5 16 27 C12 25.5 7 20.5 7 14 L7 8 Z"
            className="fill-primary/40"
            animate={{
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
          />
          {/* Lock body */}
          <rect
            x="12"
            y="14"
            width="8"
            height="7"
            rx="1"
            className="fill-primary-foreground"
          />
          {/* Lock shackle */}
          <path
            d="M13 14 L13 11 C13 9 14.5 7.5 16 7.5 C17.5 7.5 19 9 19 11 L19 14"
            className="stroke-primary-foreground"
            strokeWidth="2"
            fill="none"
          />
          {/* Keyhole */}
          <circle cx="16" cy="17" r="1.5" className="fill-primary" />
        </svg>

        {/* Rotating ring */}
        <motion.div
          className="absolute inset-0 border-2 border-primary/30 rounded-full"
          style={{ borderTopColor: "hsl(var(--primary))" }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </motion.div>

      {text && (
        <motion.p
          className="text-muted-foreground text-sm font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export const FullPageLoader = ({ text = "Loading..." }: { text?: string }) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
};
