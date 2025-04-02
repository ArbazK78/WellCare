
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, MapPin, ShieldCheck, Weight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            GuideMate
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            Assistance when you need it most. Connect with trusted guides for everyday help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/book">Book a Guide <ArrowRight className="ml-2" /></Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Services Section */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How We Can Help</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-none shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Weight className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-medium mb-4">Carrying Heavy Items</h3>
              <p className="text-gray-600">
                Our guides can help carry heavy groceries, furniture, or other items to your destination.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <MapPin className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-medium mb-4">Navigation Assistance</h3>
              <p className="text-gray-600">
                Get accompanied to hospitals, clinics, or any other location with our experienced guides.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-medium mb-4">Waiting Assistance</h3>
              <p className="text-gray-600">
                Guides can wait with you during appointments and help you return safely.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-blue-50 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <ShieldCheck className="h-16 w-16 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold mb-6">Trusted & Verified Guides</h2>
            <p className="text-lg text-gray-700 mb-8">
              All our guides undergo strict verification and KYC processes. Check their profiles to see ratings, experience, and reviews before booking.
            </p>
            <Button variant="outline" asChild>
              <Link to="/guides">Meet Our Guides</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="container mx-auto px-4 py-16 md:py-24 text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Book a guide for your needs in minutes and experience the convenience of GuideMate.
        </p>
        <Button size="lg" asChild>
          <Link to="/book">Book Now</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-500">
            <p>© {new Date().getFullYear()} GuideMate. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
