import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 595.28; // A4 width in points
const PAGE_HEIGHT = 841.89; // A4 height in points
const MARGIN = 50;
const LINE_HEIGHT = 14;
const FONT_SIZE = 11;

/**
 * Creates a PDF from text content using pdf-lib
 * @param text The text content to convert to PDF
 * @param filename Optional filename for download
 * @returns Blob URL for the PDF
 */
export async function createPdfFromText(text: string): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const maxWidth = PAGE_WIDTH - 2 * MARGIN;
  const lines = wrapText(text, font, FONT_SIZE, maxWidth);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  for (const line of lines) {
    if (y < MARGIN + LINE_HEIGHT) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    page.drawText(line, {
      x: MARGIN,
      y,
      size: FONT_SIZE,
      font,
      color: rgb(0, 0, 0),
    });

    y -= LINE_HEIGHT;
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
}

/**
 * Creates a PDF from multiple images using pdf-lib
 * @param imageDataUrls Array of image data URLs
 * @returns Blob for the PDF
 */
export async function createPdfFromImages(imageDataUrls: string[]): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  for (const dataUrl of imageDataUrls) {
    const imageBytes = await fetch(dataUrl).then((res) => res.arrayBuffer());
    
    let image;
    if (dataUrl.includes("image/png")) {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      image = await pdfDoc.embedJpg(imageBytes);
    }

    const { width, height } = image;
    
    // Scale image to fit A4 page while maintaining aspect ratio
    const pageWidth = PAGE_WIDTH - 2 * MARGIN;
    const pageHeight = PAGE_HEIGHT - 2 * MARGIN;
    
    const scale = Math.min(pageWidth / width, pageHeight / height);
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    
    // Center the image on the page
    const x = (PAGE_WIDTH - scaledWidth) / 2;
    const y = (PAGE_HEIGHT - scaledHeight) / 2;

    page.drawImage(image, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
}

/**
 * Creates a PDF from Excel data (sheet name + rows)
 * @param sheets Array of sheet data with name and rows
 * @returns Blob for the PDF
 */
export async function createPdfFromExcelData(
  sheets: Array<{ name: string; rows: string[][] }>
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const maxWidth = PAGE_WIDTH - 2 * MARGIN;

  for (const sheet of sheets) {
    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    // Draw sheet name as header
    page.drawText(`Sheet: ${sheet.name}`, {
      x: MARGIN,
      y,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 25;

    for (const row of sheet.rows) {
      const rowText = row.map((cell) => String(cell ?? "")).join(" | ");
      const lines = wrapText(rowText, font, FONT_SIZE, maxWidth);

      for (const line of lines) {
        if (y < MARGIN + LINE_HEIGHT) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
        }

        page.drawText(line, {
          x: MARGIN,
          y,
          size: FONT_SIZE,
          font,
          color: rgb(0, 0, 0),
        });

        y -= LINE_HEIGHT;
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
}

/**
 * Word-wrap text to fit within a maximum width
 */
function wrapText(
  text: string,
  font: any,
  fontSize: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }

    const words = paragraph.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Downloads a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
