import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
  { label: "One special character", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  const { strength, passedCount, results } = useMemo(() => {
    const results = requirements.map((req) => ({
      ...req,
      passed: req.test(password),
    }));
    const passedCount = results.filter((r) => r.passed).length;
    
    let strength: "weak" | "fair" | "good" | "strong" = "weak";
    if (passedCount >= 4) strength = "strong";
    else if (passedCount >= 3) strength = "good";
    else if (passedCount >= 2) strength = "fair";
    
    return { strength, passedCount, results };
  }, [password]);

  const strengthColors = {
    weak: "bg-destructive",
    fair: "bg-orange-500",
    good: "bg-yellow-500",
    strong: "bg-primary",
  };

  const strengthLabels = {
    weak: "Weak",
    fair: "Fair",
    good: "Good",
    strong: "Strong",
  };

  if (!password) return null;

  return (
    <div className="mt-2 space-y-3">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span
            className={`font-medium ${
              strength === "strong"
                ? "text-primary"
                : strength === "good"
                ? "text-yellow-600 dark:text-yellow-400"
                : strength === "fair"
                ? "text-orange-600 dark:text-orange-400"
                : "text-destructive"
            }`}
          >
            {strengthLabels[strength]}
          </span>
        </div>
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${strengthColors[strength]}`}
            style={{ width: `${(passedCount / requirements.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-1.5">
        {results.map((req, index) => (
          <div
            key={index}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              req.passed ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {req.passed ? (
              <Check className="w-3 h-3 shrink-0" />
            ) : (
              <X className="w-3 h-3 shrink-0" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
