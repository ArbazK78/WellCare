import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGuideAuth } from "@/contexts/GuideAuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Briefcase, BookOpen, FileText } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea"; // For Bio field
import { useEffect } from "react"; // if not already imported
import MultiSelect from "@/components/MultiSelect"; // This is your custom component

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Phone, User, Lock, Mail, ArrowRight, Eye, EyeOff } from "lucide-react";


const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  phone: z.string().min(10, {
    message: "Phone number must be at least 10 digits.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }).optional().or(z.literal("")),
  // profile_picture: z.instanceof(FileList).refine(files => files ?.length ===1 || !files,),
  // government_id: z.instanceof(FileList).refine(files => files ?.length === 1 || !files,),
  location: z.string().min(2, { message: "Location is required." }),
  experience: z.string().min(1, { message: "Please select your experience level." }), // radio group = string
  specialties: z.array(z.string()).min(1, { message: "Select at least one specialty." }), // multi-select = array
  bio: z.string().max(300, { message: "Bio must be under 300 characters." }).optional(),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

const experienceOptions = [
  "0-6 Months",
  "1 Year",
  "2 Years",
  "3 Years",
  "4 Years",
  "5+ Years"
];

const specialtyOptions = [
  "Navigation",
  "Medical Visit Assistance",
  "Waiting Assistance",
  "Public Transport Guidance",
  "Shopping Help"
];

const GuideRegister = () => {
  const { guideRegister } = useGuideAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (registrationSuccess) {
      const timer = setTimeout(() => {
        navigate("/");
      }, 15000); // 15 seconds
  
      return () => clearTimeout(timer); // cleanup if unmounted early
    }
  }, [registrationSuccess, navigate]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      location: "",
      experience: "",
      specialties: [],
      bio: "",
      password: "",
      confirmPassword: "",
      // profile_picture: undefined,
      // government_id: undefined,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const result = await guideRegister(
        data.phone,
        data.name,
        data.password,
        data.email || undefined,
        // data.profile_picture,
        // data.government_id,
        data.location,
        data.experience,
        data.specialties,
        data.bio || ""
      );

      if (result === "success") {
        setRegistrationSuccess(true);
        toast({
          title: "Registration successful",
          description: "Your application has been submitted for review.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: result,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Become a Guide</CardTitle>
              <CardDescription>
                Register to start helping people navigate through their journeys.
              </CardDescription>
            </CardHeader>

            {registrationSuccess ? (
              <CardContent className="space-y-6">
                <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center">
                  <h3 className="text-xl font-semibold text-green-800 mb-2">Application Submitted!</h3>
                  <p className="text-green-700 mb-4">
                    We are reviewing your application. We'll notify you once your profile is approved.
                  </p>
                  <p className="text-sm text-green-600">
                    Our team ensures all guides meet our quality and safety standards.
                  </p>
                </div>

                <div className="flex flex-col space-y-2">
                  <Button onClick={() => navigate("/")} variant="default">
                    Return to Home
                  </Button>
                  <Button onClick={() => navigate("/guide/login")} variant="outline">
                    Already approved? Login
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-4 text-center">
            You will be redirected to the homepage shortly...
          </p>
              </CardContent>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <User className="h-4 w-4" /> Full Name
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="h-4 w-4" /> Phone Number
                          </FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="Enter your phone number" {...field} />
                          </FormControl>
                          <FormDescription>
                            This will be used for login and customer communication.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="h-4 w-4" /> Email (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* New Fields for Passport sized Image & Government IDs */}

                    {/* <FormField
                      control={form.control}
                      name="profile_picture"
                      render={({ field: {value, onChange, ...field} }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                              Profile Picture
                          </FormLabel>
                          <FormControl>
                          <Input type="file" accept = ".jpeg,.png" onChange={(e) => onChange(e.target.files)} {...field} placeholder="Select your profile image" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="government_id"
                      render={({ field: {value, onChange, ...field} }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                             Valid ID Proof
                          </FormLabel>
                          <FormControl>
                            <Input type="file" accept = ".pdf, .jpeg, .png" onChange={(e) => onChange(e.target.files)} {...field} placeholder="Please upload your valid ID proof" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    /> */}

                    {/* New 3 fields starts from here  */}
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Location
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your city/area" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Changed Experience to Radio Group (Single Select) */}
                    <FormField
                      control={form.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience</FormLabel>
                          <FormControl>
                            <select
                              value={field.value}
                              onChange={field.onChange}
                              className="w-full p-2 border rounded-md"
                            >
                              <option value="">Select experience</option>
                              {experienceOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                    {/* Replace this:  Traditional Way of using Select/*/}
                    {/* <FormField
                      control={form.control}
                      name="specialties"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" /> Specialties
                          </FormLabel>
                          <FormControl>
                            <select
                              multiple
                              value={field.value}
                              onChange={(e) => field.onChange(Array.from(e.target.selectedOptions, option => option.value))}
                              className="w-full p-2 border rounded"
                            >
                              {specialtyOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    /> */}

                    <FormField
                      control={form.control}
                      name="specialties"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specialties</FormLabel>
                          <FormControl>
                            <MultiSelect
                              options={specialtyOptions}
                              selected={field.value}
                              onChange={field.onChange}
                              placeholder="Select specialties..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Bio Field */}
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Bio (Optional)
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe yourself and your guiding style (max 300 characters)"
                              className="resize-none"
                              maxLength={300}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            <div className="flex justify-between">
                              <span>Tell customers about yourself</span>
                              <span>{field.value?.length || 0}/300</span>
                            </div>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Lock className="h-4 w-4" /> Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a password"
                                {...field}
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Must be at least 8 characters long.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                {...field}
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>

                  <CardFooter className="flex flex-col space-y-4">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Submitting..." : "Register as Guide"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>

                    <div className="text-center text-sm">
                      Already registered? {" "}
                      <Link to="/guide/login" className="text-blue-600 hover:underline">
                        Login here
                      </Link>
                    </div>
                  </CardFooter>
                </form>
              </Form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GuideRegister;
