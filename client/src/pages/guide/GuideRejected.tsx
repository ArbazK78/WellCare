import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGuideAuth } from "@/contexts/GuideAuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Navbar from "@/components/Navbar";

const GuideRejected = () => {
  const { currentGuide, guideLogout } = useGuideAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    guideLogout();
    navigate("/");
  };

useEffect(() => {
  const timer = setTimeout(() => {
    navigate("/");
  }, 15000); // 15 seconds

  return () => clearTimeout(timer); // cleanup on unmount
}, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <X className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-center text-xl">Application Not Approved</CardTitle>
              <CardDescription className="text-center">
                Unfortunately, your guide application was not approved at this time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 p-4 rounded-md border border-red-100">
                <h4 className="font-medium text-red-800 mb-2">Common reasons for rejection:</h4>
                <ul className="list-disc list-inside space-y-2 text-red-700 text-sm">
                  <li>Incomplete or inaccurate information</li>
                  <li>Unable to verify identity or credentials</li>
                  <li>Not meeting minimum requirements</li>
                  <li>High volume of applications in your area</li>
                </ul>
              </div>
              
              <p className="text-center mt-4">
                For more information or to appeal this decision, please contact our support team.
              </p>
              
              {currentGuide && (
                <div className="space-y-2 pt-2">
                  <div>
                    <span className="text-sm font-medium">Name:</span>
                    <span className="ml-2">{currentGuide.name}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Phone:</span>
                    <span className="ml-2">{currentGuide.phone}</span>
                  </div>
                  {currentGuide.email && (
                    <div>
                      <span className="text-sm font-medium">Email:</span>
                      <span className="ml-2">{currentGuide.email}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium">Application Date:</span>
                    <span className="ml-2">{new Date(currentGuide.registeredAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                onClick={() => navigate("/")} 
                variant="default" 
                className="w-full"
              >
                Return to Home
              </Button>
              <Button 
                onClick={handleLogout}
                variant="outline" 
                className="w-full"
              >
                Logout
              </Button>
              <p className="text-sm text-gray-500 mt-4 text-center">
            You will be redirected to the homepage shortly...
          </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GuideRejected;
