import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProfileBootstrap } from "@/components/ProfileBootstrap";
import { SecurityBanner } from "@/components/SecurityBanner";
import Index from "./pages/Index";
import Upload from "./pages/Upload";
import Download from "./pages/Download";
import History from "./pages/History";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import HelpCenter from "./pages/HelpCenter";
import Dashboard from "./pages/Dashboard";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import ApiDocs from "./pages/ApiDocs";
import RTDesigner from "./pages/RTDesigner";
import SecurityChecklist from "./pages/SecurityChecklist";
import AdminDashboard from "./pages/AdminDashboard";

// Image Tools
import EditImage from "./pages/tools/EditImage";
import UpscaleImage from "./pages/tools/UpscaleImage";
import RecolorImage from "./pages/tools/RecolorImage";
import RemoveBackground from "./pages/tools/RemoveBackground";
import VectorizeImage from "./pages/tools/VectorizeImage";
import ImageTo3D from "./pages/tools/ImageTo3D";
import ImageToVideo from "./pages/tools/ImageToVideo";
import ImageToText from "./pages/tools/ImageToText";
import BatchOCR from "./pages/tools/BatchOCR";
import SharedNotes from "./pages/tools/SharedNotes";
// PDF Tools
import CompressPDF from "./pages/tools/CompressPDF";
import ImagesToPDF from "./pages/tools/ImagesToPDF";
import PasswordProtectPDF from "./pages/tools/PasswordProtectPDF";
import WordToPDF from "./pages/tools/WordToPDF";
import ExcelToPDF from "./pages/tools/ExcelToPDF";
import PPTToPDF from "./pages/tools/PPTToPDF";
import PDFToWord from "./pages/tools/PDFToWord";
import PDFToExcel from "./pages/tools/PDFToExcel";
import PDFToPPT from "./pages/tools/PDFToPPT";
import PDFToPDFA from "./pages/tools/PDFToPDFA";
import SetPDFPermissions from "./pages/tools/SetPDFPermissions";

const queryClient = new QueryClient();

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};

const AnimatedPage = ({ children }: { children: React.ReactNode }) => (
  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
    {children}
  </motion.div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <AnimatedPage>
              <Index />
            </AnimatedPage>
          }
        />
        <Route
          path="/upload"
          element={
            <AnimatedPage>
              <Upload />
            </AnimatedPage>
          }
        />
        <Route
          path="/auth"
          element={
            <AnimatedPage>
              <Auth />
            </AnimatedPage>
          }
        />
        <Route
          path="/history"
          element={
            <AnimatedPage>
              <History />
            </AnimatedPage>
          }
        />
        <Route
          path="/download/:token"
          element={
            <AnimatedPage>
              <Download />
            </AnimatedPage>
          }
        />

        {/* Image Tools */}
        <Route
          path="/tools/edit-image"
          element={
            <AnimatedPage>
              <EditImage />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/upscale-image"
          element={
            <AnimatedPage>
              <UpscaleImage />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/recolor-image"
          element={
            <AnimatedPage>
              <RecolorImage />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/remove-background"
          element={
            <AnimatedPage>
              <RemoveBackground />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/vectorize-image"
          element={
            <AnimatedPage>
              <VectorizeImage />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/image-to-3d"
          element={
            <AnimatedPage>
              <ImageTo3D />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/image-to-video"
          element={
            <AnimatedPage>
              <ImageToVideo />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/image-to-text"
          element={
            <AnimatedPage>
              <ImageToText />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/batch-ocr"
          element={
            <AnimatedPage>
              <BatchOCR />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/shared-notes"
          element={
            <AnimatedPage>
              <SharedNotes />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/shared-notes/:token"
          element={
            <AnimatedPage>
              <SharedNotes />
            </AnimatedPage>
          }
        />

        {/* PDF Tools */}
        <Route
          path="/tools/compress-pdf"
          element={
            <AnimatedPage>
              <CompressPDF />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/images-to-pdf"
          element={
            <AnimatedPage>
              <ImagesToPDF />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/password-protect-pdf"
          element={
            <AnimatedPage>
              <PasswordProtectPDF />
            </AnimatedPage>
          }
        />

        <Route
          path="/tools/word-to-pdf"
          element={
            <AnimatedPage>
              <WordToPDF />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/excel-to-pdf"
          element={
            <AnimatedPage>
              <ExcelToPDF />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/ppt-to-pdf"
          element={
            <AnimatedPage>
              <PPTToPDF />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/pdf-to-word"
          element={
            <AnimatedPage>
              <PDFToWord />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/pdf-to-excel"
          element={
            <AnimatedPage>
              <PDFToExcel />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/pdf-to-ppt"
          element={
            <AnimatedPage>
              <PDFToPPT />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/pdf-to-pdfa"
          element={
            <AnimatedPage>
              <PDFToPDFA />
            </AnimatedPage>
          }
        />
        <Route
          path="/tools/set-pdf-permissions"
          element={
            <AnimatedPage>
              <SetPDFPermissions />
            </AnimatedPage>
          }
        />

        {/* User Pages */}
        <Route
          path="/dashboard"
          element={
            <AnimatedPage>
              <Dashboard />
            </AnimatedPage>
          }
        />
        <Route
          path="/help"
          element={
            <AnimatedPage>
              <HelpCenter />
            </AnimatedPage>
          }
        />
        <Route
          path="/terms"
          element={
            <AnimatedPage>
              <Terms />
            </AnimatedPage>
          }
        />
        <Route
          path="/privacy"
          element={
            <AnimatedPage>
              <Privacy />
            </AnimatedPage>
          }
        />
        <Route
          path="/api-docs"
          element={
            <AnimatedPage>
              <ApiDocs />
            </AnimatedPage>
          }
        />
        <Route
          path="/rt-designer"
          element={
            <AnimatedPage>
              <RTDesigner />
            </AnimatedPage>
          }
        />
        <Route
          path="/security-checklist"
          element={
            <AnimatedPage>
              <SecurityChecklist />
            </AnimatedPage>
          }
        />
        <Route
          path="/admin"
          element={
            <AnimatedPage>
              <AdminDashboard />
            </AnimatedPage>
          }
        />

        <Route
          path="*"
          element={
            <AnimatedPage>
              <NotFound />
            </AnimatedPage>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SecurityBanner />
            <ProfileBootstrap />
            <AnimatedRoutes />
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
