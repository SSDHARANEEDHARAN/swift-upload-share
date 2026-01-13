import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileDropzone } from "@/components/FileDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createPdfFromExcelData, downloadBlob } from "@/lib/pdf-utils";

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
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const sheets = workbook.worksheets.map((worksheet) => {
        const rows: string[][] = [];
        worksheet.eachRow({ includeEmpty: false }, (row) => {
          const rowValues: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell) => {
            // Handle different cell value types
            const value = cell.value;
            if (value === null || value === undefined) {
              rowValues.push("");
            } else if (typeof value === "object" && "result" in value) {
              // Formula cell - use the result
              rowValues.push(String(value.result ?? ""));
            } else if (typeof value === "object" && "richText" in value) {
              // Rich text - concatenate text parts
              rowValues.push((value.richText as Array<{ text: string }>).map(t => t.text).join(""));
            } else {
              rowValues.push(String(value));
            }
          });
          rows.push(rowValues);
        });
        return { name: worksheet.name, rows };
      });

      const blob = await createPdfFromExcelData(sheets);
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

  const handleDownload = () => {
    if (result) {
      const a = document.createElement("a");
      a.href = result;
      a.download = "converted.pdf";
      a.click();
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
          <Button onClick={handleDownload} className="w-full gap-2" variant="outline">
            <Download className="w-5 h-5" /> Download PDF
          </Button>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default ExcelToPDF;
