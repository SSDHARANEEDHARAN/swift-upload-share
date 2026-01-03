import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AIError } from "@/hooks/useAIErrorHandler";

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function AIStatusBanner({
  error,
  onRetry,
}: {
  error: AIError | null;
  onRetry?: () => void;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (error?.type === "rate_limit" && typeof error.retryAfter === "number") {
      setRemaining(error.retryAfter);
      const id = setInterval(() => {
        setRemaining((prev) => {
          if (prev === null) return null;
          return prev > 0 ? prev - 1 : 0;
        });
      }, 1000);
      return () => clearInterval(id);
    }

    setRemaining(null);
  }, [error?.type, error?.retryAfter]);

  const view = useMemo(() => {
    if (!error) return null;

    switch (error.type) {
      case "rate_limit":
        return {
          title: "Rate limit reached",
          tone: "warn" as const,
        };
      case "credits_exhausted":
        return {
          title: "AI credits exhausted",
          tone: "error" as const,
        };
      case "network":
        return {
          title: "Network error",
          tone: "warn" as const,
        };
      default:
        return {
          title: "AI service error",
          tone: "error" as const,
        };
    }
  }, [error]);

  if (!error || !view) return null;

  const isRateLimited = error.type === "rate_limit" && remaining !== null && remaining > 0;
  const canRetry = !!onRetry && !isRateLimited;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        view.tone === "error" && "bg-destructive/10 border-destructive/20",
        view.tone === "warn" && "bg-secondary/40 border-border",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 rounded-lg p-2",
            view.tone === "error" && "bg-destructive/10 text-destructive",
            view.tone === "warn" && "bg-primary/10 text-primary",
          )}
        >
          <AlertTriangle className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-foreground">{view.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{error.message}</p>
              {isRateLimited && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Retry available in <span className="font-medium text-foreground">{formatDuration(remaining)}</span>.
                </p>
              )}
            </div>

            {onRetry && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={!canRetry}
                className="shrink-0 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {isRateLimited ? "Wait" : "Retry"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
