import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Copy, Loader2, ArrowRight } from "lucide-react";
import { 
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

type PhoneVerificationFormProps = {
  phoneNumber: string;
  onBack: () => void;
  userData?: {
    name?: string;
    email?: string;
  };
  mode?: "login" | "register"; // ✅ NEW

};

const PhoneVerificationForm = ({ phoneNumber, onBack, userData, mode = "login" }: PhoneVerificationFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login, register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [generatedOtp] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());

  // Get the return URL from location state or default to book page
  const returnUrl = location.state?.returnUrl || "/dashboard";

  const copyOtpToClipboard = () => {
    navigator.clipboard.writeText(generatedOtp);
    toast({
      title: "OTP copied",
      description: "OTP has been copied to clipboard",
    });
  };

  const handleOtpVerification = async () => {
    if (otp.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "Please enter a valid 6-digit code.",
      });
      return;
    }
  
    setIsLoading(true);
  
    setTimeout(async () => {
      setIsLoading(false);
  
      if (otp === generatedOtp) {
        toast({
          title: "Verification successful",
          description: "Your phone number has been verified.",
        });
        
        if (mode === "register" && userData?.name) {
          toast({
            title: `Welcome aboard, ${userData.name}!`,
            description: "Your account has been created successfully.",
          });
        }
  
        let success = false;
  
        if (mode === "register" && userData?.name) {
          success = await register(userData.name, phoneNumber, userData.email);
        } else {
          success = await login(phoneNumber);
        }
  
        if (success) {
          navigate(returnUrl);
        }
  
      } else {
        toast({
          variant: "destructive",
          title: "Invalid code",
          description: "The verification code you entered is incorrect.",
        });
      }
    }, 1500);
  };
  
  

  const resendOtp = () => {
    toast({
      title: "Code resent",
      description: `A new verification code has been sent to ${phoneNumber}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 p-3 rounded-md border border-amber-200 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-sm font-medium text-amber-800">Demo Mode: Your OTP is</h4>
            <p className="text-amber-900 font-mono text-xl">{generatedOtp}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyOtpToClipboard}
            className="text-amber-800 border-amber-300"
          >
            <Copy className="h-4 w-4 mr-1" /> Copy
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <Label htmlFor="otp-input" className="text-center block">Enter verification code</Label>
        <div className="flex justify-center py-2">
          <InputOTP
            id="otp-input"
            maxLength={6}
            value={otp}
            onChange={setOtp}
            className="gap-2"
          >
            <InputOTPGroup>
              <InputOTPSlot key={0} index={0} />
              <InputOTPSlot key={1} index={1} />
              <InputOTPSlot key={2} index={2} />
              <InputOTPSlot key={3} index={3} />
              <InputOTPSlot key={4} index={4} />
              <InputOTPSlot key={5} index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        
        <div className="text-center">
          <Button 
            variant="link" 
            type="button" 
            onClick={resendOtp}
            className="text-sm"
          >
            Didn't receive a code? Resend
          </Button>
        </div>
      </div>
      
      <div className="flex space-x-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          className="flex-1"
        >
          Back
        </Button>
        <Button 
          type="button" 
          className="flex-1" 
          disabled={isLoading}
          onClick={handleOtpVerification}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PhoneVerificationForm;
