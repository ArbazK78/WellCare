import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BookingProvider } from "@/contexts/BookingContext";
import { GuideAuthProvider } from "@/contexts/GuideAuthContext";
import { CustomerRealtimeProvider } from "@/contexts/CustomerRealtimeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import GuideProtectedRoute from "@/components/GuideProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import GuideLayout from "@/components/GuideLayout";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

import Index from "./pages/IndexV2";
import Blogs from "./pages/Blogs";
import BlogArticle from "./pages/BlogArticle";
import NotFound from "./pages/NotFound";
import Book from "./pages/Book";
import About from "./pages/AboutV2";
import Guides from "./pages/GuidesV2";
import Dashboard from "./pages/Dashboard";
import PhoneVerification from "./pages/PhoneVerificationV2";
import BookingConfirmationPage from "./pages/BookingConfirmationPage";
import FindingGuide from "./pages/FindingGuide";

import GuideRegister from "./pages/guide/GuideRegister";
import GuideLogin from "./pages/guide/GuideLogin";
import GuideDashboard from "./pages/guide/GuideDashboard";
import GuideEditProfile from "./pages/guide/GuideEditProfile";
import GuidePendingApproval from "./pages/guide/GuidePendingApproval";
import GuideRejected from "./pages/guide/GuideRejected";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLogin from "./pages/admin/AdminLoginV2";
import AdminForgotPassword from "./pages/admin/AdminForgotPassword";
import AdminAcceptInvitation from "./pages/admin/AdminAcceptInvitation";

import { useAuth } from "@/contexts/AuthContext";
import "@/i18n";
import { ThemeProvider } from "next-themes";
import "@/styles/ui2.css";

const AppRoutes = () => {
  const { checkingAuth } = useAuth();
  
  if (checkingAuth) {
    // FC-6 fix: Show a loading state instead of a completely blank screen
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
      <Routes>
        {/* ── Customer routes ───────────────────────────────────────────── */}
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="/guides" element={<Guides />} />
        <Route path="/blogs" element={<Blogs />} />
        <Route path="/blogs/:slug" element={<BlogArticle />} />
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
        <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
        <Route path="/admin/invite" element={<AdminAcceptInvitation />} />
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
  );
};

// FC-4 fix: Instantiate QueryClient outside the component to prevent recreating it on every render
const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <GuideAuthProvider>
          <BookingProvider>
            <CustomerRealtimeProvider>
            <Toaster />
            <BrowserRouter>
              <AppErrorBoundary>
                <AppRoutes />
              </AppErrorBoundary>
            </BrowserRouter>
            </CustomerRealtimeProvider>
          </BookingProvider>
        </GuideAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;