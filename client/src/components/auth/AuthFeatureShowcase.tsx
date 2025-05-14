
import { Shield, Phone, User } from "lucide-react";

const AuthFeatureShowcase = () => {
  return (
    <div className="hidden md:block bg-blue-600 text-white p-8">
      <div className="h-full flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-4">Join GuideMate Today</h2>
          <p className="mb-6">Get assistance when you need it most with our trusted guides.</p>
          
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="mr-2 mt-1 bg-blue-500 p-1 rounded-full">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Verified Guides</p>
                <p className="text-sm text-blue-100">All our guides undergo strict verification</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="mr-2 mt-1 bg-blue-500 p-1 rounded-full">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Easy Booking</p>
                <p className="text-sm text-blue-100">Book a guide with just a few taps</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="mr-2 mt-1 bg-blue-500 p-1 rounded-full">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Personalized Assistance</p>
                <p className="text-sm text-blue-100">Get help that's tailored to your needs</p>
              </div>
            </li>
          </ul>
        </div>
        
        <div className="mt-8 bg-blue-700 p-4 rounded-lg">
          <p className="italic text-sm text-blue-100">
            "GuideMate made my hospital visits so much easier. Having someone to help me navigate and carry my things was invaluable."
          </p>
          <p className="mt-2 font-medium">— Sarah J.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthFeatureShowcase;
