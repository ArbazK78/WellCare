
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import AuthTabs from "@/components/auth/AuthTabs";
import AuthFeatureShowcase from "@/components/auth/AuthFeatureShowcase";

const PhoneVerification = () => {
  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="overflow-hidden">
            <div className="md:grid md:grid-cols-2">
              {/* Left side - Authentication Forms */}
              <div className="p-6 md:p-8">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-2xl font-bold">
                    Welcome to GuideMate
                  </CardTitle>
                  <CardDescription>
                    Sign in or create an account to continue
                  </CardDescription>
                </CardHeader>

                <CardContent className="px-0">
                  <AuthTabs activeTab={activeTab} setActiveTab={setActiveTab} />
                </CardContent>
              </div>
              
              {/* Right side - Feature showcase */}
              <AuthFeatureShowcase />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PhoneVerification;
