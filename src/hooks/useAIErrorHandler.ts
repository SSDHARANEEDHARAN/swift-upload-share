import { toast } from "sonner";

export type AIErrorType = 'rate_limit' | 'credits_exhausted' | 'network' | 'unknown';

export interface AIError {
  type: AIErrorType;
  message: string;
  retryAfter?: number;
}

export const parseAIError = (error: any): AIError => {
  const status =
    error?.status ??
    error?.statusCode ??
    error?.context?.status ??
    error?.response?.status ??
    undefined;

  const errorMessage = error?.message || error?.error || String(error);

  // Check for rate limit errors
  if (status === 429 || errorMessage.includes("429") || errorMessage.toLowerCase().includes("rate limit")) {
    return {
      type: "rate_limit",
      message: "Too many requests. Please wait a moment before trying again.",
      retryAfter: typeof error?.retryAfter === "number" ? error.retryAfter : 60,
    };
  }

  // Check for credits exhausted
  if (
    status === 402 ||
    errorMessage.includes("402") ||
    errorMessage.toLowerCase().includes("credits") ||
    errorMessage.toLowerCase().includes("payment")
  ) {
    return {
      type: "credits_exhausted",
      message: "AI credits exhausted. Please add credits to continue using AI features.",
    };
  }

  // Check for network errors
  if (errorMessage.toLowerCase().includes("network") || errorMessage.toLowerCase().includes("fetch")) {
    return {
      type: "network",
      message: "Network error. Please check your connection and try again.",
    };
  }

  // Provider / gateway errors
  if (typeof status === "number" && status >= 500) {
    return {
      type: "unknown",
      message: "AI service error. Please try again in a moment.",
    };
  }

  // Default unknown error
  return {
    type: "unknown",
    message: errorMessage || "An unexpected error occurred. Please try again.",
  };
};

export const handleAIError = (error: any, setStatus: (status: string) => void, setStatusMessage: (msg: string) => void) => {
  const parsedError = parseAIError(error);
  
  setStatus('error');
  setStatusMessage(parsedError.message);
  
  switch (parsedError.type) {
    case 'rate_limit':
      toast.error('Rate Limit Exceeded', {
        description: parsedError.message,
        duration: 5000,
      });
      break;
    case 'credits_exhausted':
      toast.error('Credits Exhausted', {
        description: parsedError.message,
        duration: 8000,
      });
      break;
    case 'network':
      toast.error('Network Error', {
        description: parsedError.message,
        duration: 5000,
      });
      break;
    default:
      toast.error('Error', {
        description: parsedError.message,
        duration: 5000,
      });
  }
  
  return parsedError;
};

export const useAIErrorHandler = () => {
  return { parseAIError, handleAIError };
};
