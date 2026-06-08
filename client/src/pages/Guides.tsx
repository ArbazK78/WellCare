import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Link } from "react-router-dom";
import { Star, Clock, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGuideAuth } from "@/contexts/GuideAuthContext";


const dummyGuides = [
  {
    id: 1,
    name: "Priya Sharma",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&auto=format&q=80",
    rating: 4.9,
    yearsExperience: 2,
    location: "Gurgaon",
    specialties: ["Navigation", "Transport"],
    bio: "Previous experience in healthcare makes me well-suited to assist with medical visits. I'm patient, punctual, and dedicated to providing excellent assistance."
  },
  {
    id: 2,
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
  const { getAllApprovedGuides } = useGuideAuth();
  const pageTopRef = useRef<HTMLDivElement>(null);

  const [guides, setGuides] = useState([]);


  useEffect(() => {
    const fetchGuides = async () => {
      const allGuides = await getAllApprovedGuides();
      const onlyApproved = allGuides.filter(guide => guide.status === "approved");
      setGuides(onlyApproved);
    };
    fetchGuides();
  }, []);
  

  // Use first two dummy guides as fallbacks
  const specialtyDefaults = dummyGuides.map(g => g.specialties);
  const bioDefaults = dummyGuides.map(g => g.bio);

  const allGuides = [
    ...dummyGuides,
    ...guides.map((guide, index)  => ({
      id: guide._id || guide.id,
      name: guide.name,
      image: guide.image || "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=300&h=300&fit=crop&auto=format&q=80",
      rating: guide.rating || 5.0,
      yearsExperience: guide.experience ? parseInt(guide.experience) : 1,
      location: guide.location || "Ahmedabad",
      specialties: guide.specialties && guide.specialties.length > 0
        ? guide.specialties
        : specialtyDefaults[index % specialtyDefaults.length],
      bio: guide.bio?.trim()
        ? guide.bio
        : bioDefaults[index % bioDefaults.length]
    }))
  ];

  useEffect(() => {
    if (pageTopRef.current) {
      pageTopRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, []);

  return (

    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <div ref={pageTopRef} className="bg-blue-100 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Our Trusted Guides</h1>
            <p className="text-xl text-gray-600">
              Meet our carefully selected and verified guides ready to assist you
            </p>
          </div>
        </div>
      </div>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Experienced Guides Near You</h2>
            <p className="text-gray-600">All our guides are verified, trained, and rated by customers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allGuides.map((guide) => (
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
                    <span className="text-sm">{guide.yearsExperience} years of experience</span>
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

                  <p className="text-sm text-gray-600 mb-4">{guide.bio}</p>

                  <Button className="w-full" asChild>
                    <Link to={`/book?guide=${guide.id}`}>Book This Guide</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

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
                <p className="text-gray-600">Government-issued ID checks and address verification</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-medium mb-2">Background Checks</h3>
                <p className="text-gray-600">Criminal and employment history verification</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-medium mb-2">Training Program</h3>
                <p className="text-gray-600">Extensive training on assistance protocols and safety</p>
              </div>
            </div>
          </div>
        </div>
      </section>

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

      <footer className="bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-500">
            <p>© {new Date().getFullYear()} WellCare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Guides;

