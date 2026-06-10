import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BookingProvider } from "@/contexts/BookingContext";
import { GuideAuthProvider } from "@/contexts/GuideAuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import GuideProtectedRoute from "@/components/GuideProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import GuideLayout from "@/components/GuideLayout";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Book from "./pages/Book";
import About from "./pages/About";
import Guides from "./pages/Guides";
import Dashboard from "./pages/Dashboard";
import PhoneVerification from "./pages/PhoneVerification";
import BookingConfirmationPage from "./pages/BookingConfirmationPage";
import FindingGuide from "./pages/FindingGuide";

import GuideRegister from "./pages/guide/GuideRegister";
import GuideLogin from "./pages/guide/GuideLogin";
import GuideDashboard from "./pages/guide/GuideDashboard";
import GuideEditProfile from "./pages/guide/GuideEditProfile";
import GuidePendingApproval from "./pages/guide/GuidePendingApproval";
import GuideRejected from "./pages/guide/GuideRejected";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLogin from "./pages/admin/AdminLogin";

import { useAuth } from "@/contexts/AuthContext";

/**
 * CustomerRouteGuard — wraps all customer-side routes.
 *
 * Conflict rule: if a guide_token exists when a customer page loads,
 * clear it immediately. The customer site has no knowledge of guide auth.
 */
const CustomerRouteGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isGuideRoute = location.pathname.startsWith("/guide");

  useEffect(() => {
    if (!isGuideRoute) {
      const guideToken = localStorage.getItem("guide_token");
      if (guideToken) {
        localStorage.removeItem("guide_token");
        localStorage.removeItem("guide_data");
      }
    }
  }, [isGuideRoute]);

  return <>{children}</>;
};

const AppRoutes = () => {
  const { checkingAuth } = useAuth();
  if (checkingAuth) return null;

  return (
    <CustomerRouteGuard>
      <Routes>
        {/* ── Customer routes ───────────────────────────────────────────── */}
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="/guides" element={<Guides />} />
        <Route path="/verify-phone" element={<PhoneVerification />} />
        <Route path="/book" element={
          <ProtectedRoute><Book /></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/booking-confirmation/:bookingId" element={
          <ProtectedRoute><BookingConfirmationPage /></ProtectedRoute>
        } />
        {/* Finding Guide — live loader shown after booking is created */}
        <Route path="/finding-guide/:bookingId" element={
          <ProtectedRoute><FindingGuide /></ProtectedRoute>
        } />

        {/* ── Admin routes ──────────────────────────────────────────────── */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          <AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>
        } />

        {/* ── Guide portal routes (all wrapped in GuideLayout) ──────────── */}
        <Route path="/guide/login" element={
          <GuideLayout><GuideLogin /></GuideLayout>
        } />
        <Route path="/guide/register" element={
          <GuideLayout><GuideRegister /></GuideLayout>
        } />
        <Route path="/guide/pending-approval" element={
          <GuideLayout><GuidePendingApproval /></GuideLayout>
        } />
        <Route path="/guide/rejected" element={
          <GuideLayout><GuideRejected /></GuideLayout>
        } />
        <Route path="/guide/dashboard" element={
          <GuideLayout>
            <GuideProtectedRoute><GuideDashboard /></GuideProtectedRoute>
          </GuideLayout>
        } />
        <Route path="/guide/edit-profile" element={
          <GuideLayout>
            <GuideProtectedRoute><GuideEditProfile /></GuideProtectedRoute>
          </GuideLayout>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </CustomerRouteGuard>
  );
};

const App = () => (
  <QueryClientProvider client={new QueryClient()}>
    <TooltipProvider>
      <AuthProvider>
        <GuideAuthProvider>
          <BookingProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </BookingProvider>
        </GuideAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;