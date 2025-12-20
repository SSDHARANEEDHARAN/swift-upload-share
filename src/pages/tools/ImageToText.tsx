import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, FileText, Image, Download, File as FileIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Tesseract from "tesseract.js";
import { jsPDF } from "jspdf";

const SAMPLE_IMAGE_URL = "https://images.unsplash.com/photo-1586339949216-35c2747cc36d?w=800&q=80";

const OCR_LANGUAGES = [
  { code: "eng", name: "English" },
  { code: "spa", name: "Spanish" },
  { code: "fra", name: "French" },
  { code: "deu", name: "German" },
  { code: "ita", name: "Italian" },
  { code: "por", name: "Portuguese" },
  { code: "rus", name: "Russian" },
  { code: "jpn", name: "Japanese" },
  { code: "kor", name: "Korean" },
  { code: "chi_sim", name: "Chinese (Simplified)" },
  { code: "chi_tra", name: "Chinese (Traditional)" },
  { code: "ara", name: "Arabic" },
  { code: "hin", name: "Hindi" },
  { code: "tha", name: "Thai" },
  { code: "vie", name: "Vietnamese" },
  { code: "nld", name: "Dutch" },
  { code: "pol", name: "Polish" },
  { code: "tur", name: "Turkish" },
];

const ImageToText = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("eng");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleImageSelect = (file: File) => {
    setSelectedFile(file);
    setExtractedText("");
    setStatus("idle");
    setProgress(0);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setExtractedText("");
    setStatus("idle");
    setProgress(0);
  };

  const handleUseSampleImage = async () => {
    setStatus("processing");
    setStatusMessage("Loading sample image...");
    setProgress(0);
    
    try {
      const response = await fetch(SAMPLE_IMAGE_URL);
      const blob = await response.blob();
      const file = new File([blob], "sample-image.jpg", { type: "image/jpeg" });
      
      setSelectedFile(file);
      setPreview(SAMPLE_IMAGE_URL);
      setStatus("idle");
      setStatusMessage("");
      toast.success("Sample image loaded!");
    } catch (error) {
      setStatus("error");
      setStatusMessage("Failed to load sample image");
      toast.error("Failed to load sample image");
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) return;

    setStatus("processing");
    setStatusMessage("Initializing OCR...");
    setProgress(0);

    try {
      const result = await Tesseract.recognize(selectedFile, selectedLanguage, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            const progressValue = Math.round(m.progress * 100);
            setProgress(progressValue);
            setStatusMessage(`Recognizing text... ${progressValue}%`);
          } else if (m.status === "loading tesseract core") {
            setStatusMessage("Loading OCR engine...");
            setProgress(10);
          } else if (m.status === "initializing tesseract") {
            setStatusMessage("Initializing...");
            setProgress(20);
          } else if (m.status === "loading language traineddata") {
            setStatusMessage("Loading language data...");
            setProgress(30);
          } else if (m.status === "initializing api") {
            setStatusMessage("Preparing...");
            setProgress(40);
          }
        },
      });

      setExtractedText(result.data.text);
      setStatus("success");
      setStatusMessage("Text extracted successfully!");
      setProgress(100);
      toast.success("Text extracted!");
    } catch (error: any) {
      setStatus("error");
      setStatusMessage(error.message || "Failed to extract text");
      toast.error("Failed to extract text");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    toast.success("Text copied to clipboard!");
  };

  const exportAsTxt = () => {
    const blob = new Blob([extractedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted-text.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded as TXT!");
  };

  const exportAsPdf = () => {
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(extractedText, 180);
    let y = 20;
    
    lines.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 15, y);
      y += 7;
    });

    doc.save("extracted-text.pdf");
    toast.success("Downloaded as PDF!");
  };

  const exportAsDocx = async () => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>";
    const footer = "</body></html>";
    const content = extractedText.split("\n").map(p => `<p>${p}</p>`).join("");
    
    const blob = new Blob([header + content + footer], {
      type: "application/msword",
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted-text.doc";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded as DOC!");
  };

  return (
    <ToolPageLayout
      title="Image to Text (OCR)"
      description="Extract text from images using optical character recognition. Supports multiple languages."
      user={user}
    >
      <div className="space-y-6">
        {!selectedFile && (
          <Button
            variant="outline"
            onClick={handleUseSampleImage}
            className="w-full gap-2"
            disabled={status === "processing"}
          >
            <Image className="w-5 h-5" />
            Use Sample Image
          </Button>
        )}

        <ImageDropzone 
          onImageSelect={handleImageSelect} 
          preview={preview}
          onClear={handleClear}
        />

        {selectedFile && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Text Language</label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {OCR_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedFile && !extractedText && status !== "processing" && (
          <Button
            onClick={handleExtract}
            className="w-full gap-2"
            size="lg"
          >
            <FileText className="w-5 h-5" />
            Extract Text
          </Button>
        )}

        {status === "processing" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CircularProgress value={progress} size={100} />
            <p className="text-muted-foreground text-sm animate-pulse">{statusMessage}</p>
          </div>
        )}

        {status === "success" || status === "error" ? (
          <ProcessingStatus status={status} message={statusMessage} />
        ) : null}

        {extractedText && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">Extracted Text</h3>
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                <Copy className="w-4 h-4" />
                Copy
              </Button>
            </div>
            <Textarea
              value={extractedText}
              readOnly
              className="min-h-[200px] bg-secondary/50 font-mono text-sm"
            />
            
            {/* Export buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Export as:</span>
              <Button variant="outline" size="sm" onClick={exportAsTxt} className="gap-2">
                <FileIcon className="w-4 h-4" />
                TXT
              </Button>
              <Button variant="outline" size="sm" onClick={exportAsPdf} className="gap-2">
                <Download className="w-4 h-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportAsDocx} className="gap-2">
                <Download className="w-4 h-4" />
                DOC
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default ImageToText;
