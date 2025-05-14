import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { Phone, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import PhoneVerificationForm from "./PhoneVerificationForm";
import api from "@/lib/api";

const SignInForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationStep, setVerificationStep] = useState<"phone" | "otp">("phone"); const { toast } = useToast();
  const navigate = useNavigate();
  const { setUser, isAuthenticated, checkingAuth } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
      return;
    }

    const handleCredentialResponse = async (response: any) => {
      console.log("Google Credential Response:", response);
      const idToken = response.credential;

      if (idToken) {
        try {
          const backendResponse = await fetch('http://localhost:5000/api/google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
          });

          let data: any;
          try {
            data = await backendResponse.json();
          } catch (jsonError: any) { // Corrected type annotation for catch parameter
            console.error('Error parsing JSON response:', jsonError);
            data = { message: `Backend responded with status: ${backendResponse.status}` }; // Provide a fallback message
          }

          if (backendResponse.ok) {
            localStorage.setItem('userToken', data.token);
            setUser(data.user);
            navigate('/dashboard');
            toast({
              title: 'Sign in successful!',
              description: `Welcome, ${data.user.name}!`,
            });
          } else {
            console.error('Google sign-in failed:', data.message || 'Something went wrong.');
            toast({
              title: 'Sign in failed',
              description: data.message || `Failed to sign in with Google. Status: ${backendResponse.status}`,
              variant: 'destructive',
            });
          }
        } catch (error) {
          console.error('Error sending token to backend:', error);
          toast({
            title: 'Sign in error',
            description: 'An error occurred while trying to sign in with Google.',
            variant: 'destructive',
          });
        }
      } else {
        console.error('Google ID token not found in the response.');
        toast({
          title: 'Sign in error',
          description: 'Could not retrieve Google ID token.',
          variant: 'destructive',
        });
      }
    };

    // Initialize Google Sign-in
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: '779962806536-q8b40k2hnvctchnqvb7at1a8221b112d.apps.googleusercontent.com', // Replace with your actual Client ID
        callback: handleCredentialResponse,
      });

      // Render the Sign-in button
      window.google.accounts.id.renderButton(
        document.querySelector('.google-sign-in-button'), // Target the class name
        { theme: 'outline', size: 'large' } // You can customize the button here
      );
    } else {
      console.warn('Google Sign-in API not fully loaded.');
      // Optionally try to load it again or inform the user
    }

    return () => {
      // Cleanup if needed
    };
  }, [navigate, isAuthenticated, setUser, toast]);

  if (checkingAuth) {
    return null; // or <LoadingSpinner />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter a valid phone number.",
      });
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/users/login", { phone: phoneNumber });
      setVerificationStep("otp");
      toast({
        title: "Verification code sent",
        description: `A 6-digit code has been sent to ${phoneNumber}`,
      });
    } catch (error: any) {
      console.error("❌ Login attempt failed:", error?.response?.data);
      toast({
        variant: "destructive",
        title: "Phone number not registered",
        description: "Please register before signing in.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (verificationStep === "otp") {
    return (
      <PhoneVerificationForm
        phoneNumber={phoneNumber}
        onBack={() => setVerificationStep("phone")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone" className="flex items-center gap-2">
          <Phone className="h-4 w-4" /> Phone Number
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="Enter your phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={isLoading}
        onClick={handleSendOtp}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            Send Verification Code
            <Send className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with Google
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full google-sign-in-button" // Added a class for targeting
        // Removed the onClick here, as the Google button is rendered by the library
      >
        <div className="mr-2 h-4 w-4 flex items-center justify-center">
          <span className="font-bold text-red-500">G</span>
        </div>
        Sign in with Google
      </Button>
    </div>
  );
};

export default SignInForm;