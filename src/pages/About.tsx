
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ShieldCheck, UserCheck, Clock, Heart } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero section */}
      <div className="bg-blue-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About GuideMate</h1>
            <p className="text-xl text-gray-600">
              Bringing help and assistance to those who need it most
            </p>
          </div>
        </div>
      </div>

      {/* Our story section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <div className="prose prose-lg">
              <p>
                GuideMate was born from a simple observation: while India has platforms for food 
                and grocery delivery, there wasn't a reliable service connecting people who need 
                physical assistance with trusted helpers.
              </p>
              <p>
                We recognized that many elderly and disabled individuals face daily challenges 
                that could be easily overcome with just a little help from another person – 
                whether it's carrying heavy groceries, navigating to a hospital appointment, 
                or simply providing support to reach a destination safely.
              </p>
              <p>
                Our mission is to create a platform that brings independence, dignity, 
                and peace of mind to those who need assistance, while creating meaningful 
                employment opportunities for guides in the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">How GuideMate Works</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserCheck className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-medium mb-2">1. Book a Guide</h3>
                <p className="text-gray-600">
                  Request assistance through our platform, specifying your needs, location, and time.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-medium mb-2">2. Get Matched</h3>
                <p className="text-gray-600">
                  We connect you with verified guides in your area who can assist with your specific needs.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-medium mb-2">3. Receive Help</h3>
                <p className="text-gray-600">
                  Your guide arrives at the scheduled time to provide the assistance you need.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our guides */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Our Guides</h2>
            <p className="text-xl text-gray-600 mb-8">
              All GuideMate helpers undergo strict verification and training before joining our platform.
            </p>
            
            <div className="bg-blue-50 p-6 rounded-lg mb-8">
              <h3 className="text-xl font-medium mb-4">Guide Verification Process</h3>
              <ul className="text-left space-y-2">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                  <span>Identity verification through government ID</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                  <span>Background checks for safety</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                  <span>Training on assistance protocols</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                  <span>Regular performance reviews based on user feedback</span>
                </li>
              </ul>
            </div>
            
            <Button asChild>
              <Link to="/guides">Meet Our Guides</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="bg-blue-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Book your first guide today and experience the convenience of GuideMate.
          </p>
          <Button size="lg" asChild>
            <Link to="/book">Book a Guide Now</Link>
          </Button>
        </div>
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

export default About;
