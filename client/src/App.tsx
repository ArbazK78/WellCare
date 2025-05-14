import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BookingProvider } from "@/contexts/BookingContext";
import { GuideAuthProvider } from "@/contexts/GuideAuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import GuideProtectedRoute from "@/components/GuideProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Book from "./pages/Book";
import About from "./pages/About";
import Guides from "./pages/Guides";
import Dashboard from "./pages/Dashboard";
import PhoneVerification from "./pages/PhoneVerification";
import GuideRegister from "./pages/guide/GuideRegister";
import GuideLogin from "./pages/guide/GuideLogin";
import GuideDashboard from "./pages/guide/GuideDashboard";
import GuideEditProfile from "./pages/guide/GuideEditProfile";
import GuidePendingApproval from "./pages/guide/GuidePendingApproval";
import GuideRejected from "./pages/guide/GuideRejected";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { useAuth } from "@/contexts/AuthContext";
import BookingConfirmationPage from "./pages/BookingConfirmationPage";

const AppRoutes = () => {
  const { checkingAuth } = useAuth();

  if (checkingAuth) return null;

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/about" element={<About />} />
      <Route path="/guides" element={<Guides />} />
      <Route path="/verify-phone" element={<PhoneVerification />} />
      <Route path="/book" element={
        <ProtectedRoute>
          <Book />
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      {/* ✅ ADD THIS NEW ROUTE */}
      <Route path="/booking-confirmation/:bookingId" element={
        <ProtectedRoute>
          <BookingConfirmationPage />
        </ProtectedRoute>
      } />
      <Route path="/guide/register" element={<GuideRegister />} />
      <Route path="/guide/login" element={<GuideLogin />} />
      <Route path="/guide/dashboard" element={
        <GuideProtectedRoute>
          <GuideDashboard />
        </GuideProtectedRoute>
      } />
      <Route path="/guide/edit-profile" element={
        <GuideProtectedRoute>
          <GuideEditProfile />
        </GuideProtectedRoute>
      } />
      <Route path="/guide/pending-approval" element={<GuidePendingApproval />} />
      <Route path="/guide/rejected" element={<GuideRejected />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={new QueryClient()}>
    <TooltipProvider>
      <AuthProvider> {/* ✅ mount context here first */}
        <GuideAuthProvider>
          <BookingProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes /> {/* ✅ use useAuth only inside this */}
            </BrowserRouter>
          </BookingProvider>
        </GuideAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;