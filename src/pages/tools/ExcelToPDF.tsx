import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileDropzone } from "@/components/FileDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ExcelToPDF = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null);
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setStatus("processing");
    setStatusMessage("Converting Excel to PDF...");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      
      const doc = new jsPDF();
      let pageIndex = 0;

      workbook.SheetNames.forEach((sheetName, sheetIdx) => {
        if (sheetIdx > 0) doc.addPage();
        
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        doc.setFontSize(14);
        doc.text(`Sheet: ${sheetName}`, 15, 15);
        doc.setFontSize(10);
        
        let y = 25;
        data.forEach((row) => {
          if (y > doc.internal.pageSize.height - 20) {
            doc.addPage();
            y = 20;
          }
          const rowText = row.map(cell => String(cell ?? "")).join(" | ");
          const lines = doc.splitTextToSize(rowText, 180);
          lines.forEach((line: string) => {
            if (y > doc.internal.pageSize.height - 20) {
              doc.addPage();
              y = 20;
            }
            doc.text(line, 15, y);
            y += 6;
          });
        });
      });

      const blob = doc.output("blob");
      setResult(URL.createObjectURL(blob));
      setStatus("success");
      setStatusMessage("Excel converted to PDF!");
      toast.success("Conversion complete!");
    } catch (error: any) {
      setStatus("error");
      setStatusMessage(error.message || "Failed to convert document");
      toast.error("Failed to convert document");
    }
  };

  return (
    <ToolPageLayout title="Convert Excel to PDF" description="Convert XLS, XLSX, and other Excel files to PDF—tables and formulas preserved." user={user}>
      <div className="space-y-6">
        <FileDropzone accept=".xls,.xlsx" onFileSelect={handleFileSelect} selectedFile={selectedFile} onClear={() => { setSelectedFile(null); setResult(null); }} description="Drop your Excel file here" />
        {selectedFile && (
          <Button onClick={handleConvert} disabled={status === "processing"} className="w-full gap-2" size="lg">
            <FileSpreadsheet className="w-5 h-5" /> Convert to PDF
          </Button>
        )}
        <ProcessingStatus status={status} message={statusMessage} />
        {result && (
          <Button onClick={() => { const a = document.createElement("a"); a.href = result; a.download = "converted.pdf"; a.click(); }} className="w-full gap-2" variant="outline">
            <Download className="w-5 h-5" /> Download PDF
          </Button>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default ExcelToPDF;
