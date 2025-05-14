import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { User, Mail, Phone, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PhoneVerificationForm from "./PhoneVerificationForm";
import axios from "axios";
import api from "@/lib/api"; // 👈 Add this at top if not present




const RegisterForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [verificationStep, setVerificationStep] = useState<"form" | "otp">("form");
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; email?: string }>({}); // ⬅️ Moved above 🔥

  const { toast } = useToast(); // ✅ Always stays above any return or conditionals

  // ✅ All functions come below the hooks
  const handleGoogleSignIn = () => {
    toast({
      title: "Google Sign Up",
      description: "This is a dummy implementation. Please connect Supabase for actual Google authentication.",
    });
  };

  const checkUserExists = async (phone: string, email: string) => {
    try {
      const response = await api.post("/users/check-user", { phone, email });
      setFieldErrors({});
      return true;
    } catch (error: any) {
      if (error.response && error.response.data) {
        const { field, message } = error.response.data;

        if (Array.isArray(error.response.data.errors)) {
          const errorsObject: { phone?: string; email?: string } = {};
          error.response.data.errors.forEach((err: any) => {
            errorsObject[err.field] = err.message;
          });
          setFieldErrors(errorsObject);
        } else {
          setFieldErrors((prev) => ({ ...prev, [field]: message }));
        }
      }
      return false;
    }
  };

  const proceedToOtp = async () => {
    const isUnique = await checkUserExists(formData.phone, formData.email);
    if (!isUnique) return;

    setVerificationStep("otp");
    toast({
      title: "Verification code sent",
      description: `A 6-digit code has been sent to ${formData.phone}`,
    });
  };

  const handleSendOtp = async () => {
    if (!formData.phone || formData.phone.length < 10) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter a valid phone number.",
      });
      return;
    }

    if (!formData.name) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter your full name.",
      });
      return;
    }

    setIsLoading(true);

    const isUnique = await checkUserExists(formData.phone, formData.email);
    if (!isUnique) {
      setIsLoading(false);
      return;
    }

    setVerificationStep("otp");
    toast({
      title: "Verification code sent",
      description: `A 6-digit code has been sent to ${formData.phone}`,
    });

    setIsLoading(false);
  };

  // ✅ Only after all hooks: conditionally return the OTP component
  if (verificationStep === "otp") {
    return (
      <PhoneVerificationForm
        phoneNumber={formData.phone}
        onBack={() => setVerificationStep("form")}
        userData={{
          name: formData.name,
          email: formData.email,
        }}
        mode="register"
      />
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="flex items-center gap-2">
          <User className="h-4 w-4" /> Full Name
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="Enter your full name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center gap-2">
          <Mail className="h-4 w-4" /> Email Address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email address"
          value={formData.email}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, email: e.target.value }));
            setFieldErrors(prev => ({ ...prev, email: "" })); // clear error on change
          }}
          className={fieldErrors.email ? "border-red-500" : ""}
        />
        {fieldErrors.email && (
          <p className="text-sm font-medium text-destructive">{fieldErrors.email}</p>
        )}
      </div>


      <div className="space-y-2">
        <Label htmlFor="register-phone" className="flex items-center gap-2">
          <Phone className="h-4 w-4" /> Phone Number
        </Label>
        <Input
          id="register-phone"
          type="tel"
          placeholder="Enter your phone number"
          value={formData.phone}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, phone: e.target.value }));
            setFieldErrors(prev => ({ ...prev, phone: "" })); // clear error on change
          }}
          className={fieldErrors.phone ? "border-red-500" : ""}
          required
        />
        {fieldErrors.phone && (
          <p className="text-sm font-medium text-destructive">{fieldErrors.phone}</p>
        )}
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
        className="w-full"
        onClick={handleGoogleSignIn}
      >
        <div className="mr-2 h-4 w-4 flex items-center justify-center">
          <span className="font-bold text-red-500">G</span>
        </div>
        Sign up with Google
      </Button>
    </div>
  );
};

export default RegisterForm;
