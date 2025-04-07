
import { useNavigate } from "react-router-dom";
import { useGuideAuth } from "@/contexts/GuideAuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";

const GuidePendingApproval = () => {
  const { currentGuide, guideLogout } = useGuideAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    guideLogout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
              <CardTitle className="text-center text-xl">Application Under Review</CardTitle>
              <CardDescription className="text-center">
                Your guide application is currently being reviewed by our team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <h4 className="font-medium text-blue-800 mb-2">What happens next?</h4>
                <ul className="list-disc list-inside space-y-2 text-blue-700 text-sm">
                  <li>Our team is reviewing your application</li>
                  <li>This typically takes 24-48 hours</li>
                  <li>You'll receive a notification once approved</li>
                  <li>You can check back anytime to see your status</li>
                </ul>
              </div>
              
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
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GuidePendingApproval;
