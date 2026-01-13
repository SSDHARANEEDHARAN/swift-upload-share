import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, FileText, Upload, X, Download, File as FileIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Tesseract from "tesseract.js";
import { createPdfFromText, downloadBlob } from "@/lib/pdf-utils";

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

interface ImageFile {
  file: File;
  preview: string;
  text?: string;
  status: "pending" | "processing" | "done" | "error";
  progress: number;
}

const BatchOCR = () => {
  const [user, setUser] = useState<any>(null);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("eng");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [combinedText, setCombinedText] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages: ImageFile[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
      progress: 0,
    }));
    setImages((prev) => [...prev, ...newImages]);
    setCombinedText("");
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setImages([]);
    setCombinedText("");
  };

  const processAllImages = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    const results: string[] = [];

    for (let i = 0; i < images.length; i++) {
      setCurrentIndex(i);
      setImages((prev) =>
        prev.map((img, idx) =>
          idx === i ? { ...img, status: "processing", progress: 0 } : img
        )
      );

      try {
        const result = await Tesseract.recognize(images[i].file, selectedLanguage, {
          logger: (m) => {
            if (m.status === "recognizing text") {
              const progress = Math.round(m.progress * 100);
              setImages((prev) =>
                prev.map((img, idx) =>
                  idx === i ? { ...img, progress } : img
                )
              );
            }
          },
        });

        const text = result.data.text;
        results.push(`--- Image ${i + 1}: ${images[i].file.name} ---\n${text}\n`);
        
        setImages((prev) =>
          prev.map((img, idx) =>
            idx === i ? { ...img, status: "done", text, progress: 100 } : img
          )
        );
      } catch (error) {
        setImages((prev) =>
          prev.map((img, idx) =>
            idx === i ? { ...img, status: "error", progress: 0 } : img
          )
        );
      }
    }

    setCombinedText(results.join("\n"));
    setIsProcessing(false);
    toast.success(`Processed ${images.length} images!`);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(combinedText);
    toast.success("Copied to clipboard!");
  };

  const exportAsTxt = () => {
    const blob = new Blob([combinedText], { type: "text/plain" });
    downloadBlob(blob, "extracted-text.txt");
    toast.success("Downloaded as TXT!");
  };

  const exportAsPdf = async () => {
    try {
      const blob = await createPdfFromText(combinedText);
      downloadBlob(blob, "extracted-text.pdf");
      toast.success("Downloaded as PDF!");
    } catch (error) {
      toast.error("Failed to create PDF");
    }
  };

  const exportAsDocx = async () => {
    // Simple DOCX export using HTML to Word approach
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>";
    const footer = "</body></html>";
    const content = combinedText.split("\n").map(p => `<p>${p}</p>`).join("");
    
    const blob = new Blob([header + content + footer], {
      type: "application/msword",
    });
    
    downloadBlob(blob, "extracted-text.doc");
    toast.success("Downloaded as DOC!");
  };

  const overallProgress = images.length > 0
    ? Math.round(images.reduce((sum, img) => sum + img.progress, 0) / images.length)
    : 0;

  return (
    <ToolPageLayout
      title="Batch OCR"
      description="Extract text from multiple images at once. Upload several images and process them all together."
      user={user}
    >
      <div className="space-y-6">
        {/* Upload area */}
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelect}
            className="hidden"
            id="batch-upload"
            disabled={isProcessing}
          />
          <label htmlFor="batch-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-foreground font-medium">Click to upload multiple images</p>
            <p className="text-sm text-muted-foreground mt-1">
              or drag and drop images here
            </p>
          </label>
        </div>

        {/* Image previews */}
        {images.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">{images.length} images selected</h3>
              <Button variant="outline" size="sm" onClick={clearAll} disabled={isProcessing}>
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-border"
                  />
                  
                  {/* Status overlay */}
                  {img.status === "processing" && (
                    <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
                      <CircularProgress value={img.progress} size={40} />
                    </div>
                  )}
                  {img.status === "done" && (
                    <div className="absolute inset-0 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-green-500" />
                    </div>
                  )}
                  {img.status === "error" && (
                    <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <X className="w-6 h-6 text-red-500" />
                    </div>
                  )}

                  {/* Remove button */}
                  {!isProcessing && (
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Language selection */}
        {images.length > 0 && !combinedText && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Text Language</label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={isProcessing}>
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

        {/* Process button */}
        {images.length > 0 && !combinedText && (
          <Button
            onClick={processAllImages}
            disabled={isProcessing}
            className="w-full gap-2"
            size="lg"
          >
            {isProcessing ? (
              <>
                <CircularProgress value={overallProgress} size={20} />
                Processing {currentIndex + 1} of {images.length}...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Extract Text from All Images
              </>
            )}
          </Button>
        )}

        {/* Results */}
        {combinedText && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-medium text-foreground">Extracted Text</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
              </div>
            </div>

            <Textarea
              value={combinedText}
              readOnly
              className="min-h-[300px] bg-secondary/50 font-mono text-sm"
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

export default BatchOCR;
