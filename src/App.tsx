
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
import GuidePendingApproval from "./pages/guide/GuidePendingApproval";
import GuideRejected from "./pages/guide/GuideRejected";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <GuideAuthProvider>
          <BookingProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
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
                
                {/* Guide Routes */}
                <Route path="/guide/register" element={<GuideRegister />} />
                <Route path="/guide/login" element={<GuideLogin />} />
                <Route path="/guide/dashboard" element={
                  <GuideProtectedRoute>
                    <GuideDashboard />
                  </GuideProtectedRoute>
                } />
                <Route path="/guide/pending-approval" element={<GuidePendingApproval />} />
                <Route path="/guide/rejected" element={<GuideRejected />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </BookingProvider>
        </GuideAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
