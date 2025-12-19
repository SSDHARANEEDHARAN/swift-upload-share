import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface ProcessingStatusProps {
  status: "idle" | "processing" | "success" | "error";
  message?: string;
}

export const ProcessingStatus = ({ status, message }: ProcessingStatusProps) => {
  if (status === "idle") return null;

  return (
    <div className={`
      flex items-center gap-3 p-4 rounded-xl
      ${status === "processing" ? "bg-primary/10 text-primary" : ""}
      ${status === "success" ? "bg-green-500/10 text-green-500" : ""}
      ${status === "error" ? "bg-destructive/10 text-destructive" : ""}
    `}>
      {status === "processing" && <Loader2 className="w-5 h-5 animate-spin" />}
      {status === "success" && <CheckCircle className="w-5 h-5" />}
      {status === "error" && <XCircle className="w-5 h-5" />}
      <span className="font-medium">{message}</span>
    </div>
  );
};
