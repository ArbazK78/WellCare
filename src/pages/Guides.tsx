
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Link } from "react-router-dom";
import { Star, Clock, MapPin } from "lucide-react";

// Sample guide data
const guides = [
  {
    id: 1,
    name: "Rajesh Kumar",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&auto=format&q=80",
    rating: 4.8,
    yearsExperience: 3,
    location: "South Delhi",
    specialties: ["Heavy Lifting", "Navigation"],
    bio: "I enjoy helping people get to their destinations safely and comfortably. With 3 years of experience as a guide, I specialize in accompanying elderly clients to medical appointments."
  },
  {
    id: 2,
    name: "Priya Sharma",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&auto=format&q=80",
    rating: 4.9,
    yearsExperience: 2,
    location: "Gurgaon",
    specialties: ["Navigation", "Transport"],
    bio: "Previous experience in healthcare makes me well-suited to assist with medical visits. I'm patient, punctual, and dedicated to providing excellent assistance."
  },
  {
    id: 3,
    name: "Amit Patel",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&auto=format&q=80",
    rating: 4.7,
    yearsExperience: 4,
    location: "Noida",
    specialties: ["Heavy Lifting", "Transport"],
    bio: "Former logistics professional with a passion for helping others. I provide reliable assistance with carrying heavy items and transportation needs throughout the city."
  },
  {
    id: 4,
    name: "Suman Roy",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&auto=format&q=80",
    rating: 4.6,
    yearsExperience: 1,
    location: "West Delhi",
    specialties: ["Navigation", "Waiting Assistance"],
    bio: "I'm dedicated to providing support to those who need assistance navigating the city. Reliable, friendly, and always punctual."
  }
];

const Guides = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-blue-100 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Our Trusted Guides</h1>
            <p className="text-xl text-gray-600">
              Meet our carefully selected and verified guides ready to assist you
            </p>
          </div>
        </div>
      </div>

      {/* Guide listing */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold mb-2">
              Experienced Guides Near You
            </h2>
            <p className="text-gray-600">
              All our guides are verified, trained, and rated by customers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {guides.map((guide) => (
              <Card key={guide.id} className="overflow-hidden">
                <div className="w-full">
                  <AspectRatio ratio={1}>
                    <img
                      src={guide.image}
                      alt={guide.name}
                      className="object-cover w-full h-full"
                    />
                  </AspectRatio>
                </div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-semibold">{guide.name}</h3>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="ml-1 font-medium">{guide.rating}</span>
                    </div>
                  </div>

                  <div className="flex items-center text-gray-600 mb-3">
                    <Clock className="h-4 w-4 mr-1" />
                    <span className="text-sm">
                      {guide.yearsExperience} years of experience
                    </span>
                  </div>

                  <div className="flex items-center text-gray-600 mb-4">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="text-sm">{guide.location}</span>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">Specialties:</p>
                    <div className="flex flex-wrap gap-2">
                      {guide.specialties.map((specialty, index) => (
                        <span 
                          key={index}
                          className="text-xs bg-blue-100 text-blue-800 py-1 px-2 rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    {guide.bio}
                  </p>

                  <Button className="w-full" asChild>
                    <Link to={`/book?guide=${guide.id}`}>Book This Guide</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Verification information */}
      <section className="bg-blue-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Our Verification Process</h2>
            <p className="text-lg text-gray-600 mb-8">
              We take safety and security seriously. Every guide on our platform undergoes:
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-medium mb-2">Identity Verification</h3>
                <p className="text-gray-600">
                  Government-issued ID checks and address verification
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-medium mb-2">Background Checks</h3>
                <p className="text-gray-600">
                  Criminal and employment history verification
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-medium mb-2">Training Program</h3>
                <p className="text-gray-600">
                  Extensive training on assistance protocols and safety
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Book a Guide?</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Find the perfect guide for your needs and book them in minutes.
          </p>
          <Button size="lg" asChild>
            <Link to="/book">Book Now</Link>
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

export default Guides;
