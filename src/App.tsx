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

const queryClient = new QueryClient();

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
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
        <Route path="/" element={<AnimatedPage><Index /></AnimatedPage>} />
        <Route path="/upload" element={<AnimatedPage><Upload /></AnimatedPage>} />
        <Route path="/auth" element={<AnimatedPage><Auth /></AnimatedPage>} />
        <Route path="/history" element={<AnimatedPage><History /></AnimatedPage>} />
        <Route path="/download/:token" element={<AnimatedPage><Download /></AnimatedPage>} />
        <Route path="/dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
        <Route path="/help" element={<AnimatedPage><HelpCenter /></AnimatedPage>} />
        <Route path="/terms" element={<AnimatedPage><Terms /></AnimatedPage>} />
        <Route path="/privacy" element={<AnimatedPage><Privacy /></AnimatedPage>} />
        <Route path="/api-docs" element={<AnimatedPage><ApiDocs /></AnimatedPage>} />
        <Route path="/rt-designer" element={<AnimatedPage><RTDesigner /></AnimatedPage>} />
        <Route path="/security-checklist" element={<AnimatedPage><SecurityChecklist /></AnimatedPage>} />
        <Route path="/admin" element={<AnimatedPage><AdminDashboard /></AnimatedPage>} />
        <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
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
