
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGuideAuth } from "@/contexts/GuideAuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { User, Phone, Mail, Languages, BookOpen, Eye, EyeOff } from "lucide-react";

import MultiSelect from "@/components/MultiSelect";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email.").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits."),
  bio: z.string().optional(),
  languages: z.array(z.string()).default([]),
  specialties: z.array(z.string()).default([]),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  const hasCurrentPassword = !!data.currentPassword?.trim();
  const hasNewPassword = !!data.newPassword?.trim();
  const hasConfirmPassword = !!data.confirmPassword?.trim();

  if (hasCurrentPassword || hasNewPassword || hasConfirmPassword) {
    return hasCurrentPassword && hasNewPassword && hasConfirmPassword;
  }

  return true;
}, {
  message: "All password fields must be filled to change password",
  path: ["newPassword"],
}).refine((data) => {
  if (data.newPassword && data.confirmPassword) {
    return data.newPassword === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

const GuideEditProfile = () => {
  const { currentGuide, updateGuideProfile } = useGuideAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Safely initialize default values
  const getDefaultValues = (): FormValues => ({
    name: currentGuide?.name || "",
    email: currentGuide?.email || "",
    phone: currentGuide?.phone || "",
    bio: currentGuide?.bio || "",
    languages: Array.isArray(currentGuide?.languages) ? [...currentGuide.languages] : [],
    specialties: Array.isArray(currentGuide?.specialties) ? [...currentGuide.specialties] : [],
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form with current guide data when available
  useEffect(() => {
    if (currentGuide) {
      console.log("Resetting form with guide data:", currentGuide);
      form.reset(getDefaultValues());
    }
  }, [currentGuide, form]);

  // Replace your current onSubmit function with this updated version:
const onSubmit = async (values: FormValues) => {
  setIsSubmitting(true);

  try {
    // Password change logic (keep your existing code)
    if (values.currentPassword) {
      const guides = JSON.parse(localStorage.getItem("guides") || "[]");
      const guide = guides.find((g: any) => g.id === currentGuide?.id);

      if (!guide || guide.password !== values.currentPassword) {
        toast({
          variant: "destructive",
          title: "Incorrect password",
          description: "Your current password is incorrect.",
        });
        setIsSubmitting(false);
        return;
      }

      const updatedGuides = guides.map((g: any) =>
        g.id === currentGuide?.id ? { ...g, password: values.newPassword } : g
      );
      localStorage.setItem("guides", JSON.stringify(updatedGuides));
    }

    // Prepare update data (modified to use context)
    const { currentPassword, newPassword, confirmPassword, ...updateData } = values;

    // Ensure arrays are properly formatted
    updateData.languages = Array.isArray(updateData.languages) ? updateData.languages : [];
    updateData.specialties = Array.isArray(updateData.specialties) ? updateData.specialties : [];

    // 🔥 Key Change: Use context method instead of direct API call
    await updateGuideProfile(updateData);

    toast({
      title: "Profile updated",
      description: "Your profile has been successfully updated.",
    });

    navigate("/guide/dashboard");
  } catch (error) {
    console.error("Profile update error:", error);
    toast({
      variant: "destructive",
      title: "Update failed",
      description: "An error occurred while updating your profile.",
    });
  } finally {
    setIsSubmitting(false);
  }
};

  // Define options outside the render to prevent recreating them on every render
  const languageOptions = [
    "English", "Spanish", "French", "German", "Chinese",
    "Japanese", "Arabic", "Russian", "Hindi", "Gujarati", "Portuguese"
  ];

  const specialtyOptions = [
    "Navigation",
    "Medical Visit Assistance",
    "Waiting Assistance",
    "Public Transport Guidance",
    "Shopping Help",
    "Form Filling Support",
    "Elderly Care Assistance",
    "Language Translation",
    "Tech Help (e.g., Apps & Phones)"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Edit Guide Profile</CardTitle>
              <CardDescription>
                Update your profile information to help customers know more about you.
              </CardDescription>
            </CardHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Basic Information</h3>

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <User className="h-4 w-4" /> Full Name
                          </FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <Input type="tel" {...field} />
                          </FormControl>
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
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Professional Details Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Professional Details</h3>

                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Write a short bio about yourself"
                              className="resize-none"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            This will be displayed on your public profile.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
                      <FormField
                        control={form.control}
                        name="languages"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Languages className="h-4 w-4" /> Languages
                            </FormLabel>
                            <FormControl>
                              <MultiSelect
                                options={languageOptions}
                                selected={field.value || []}
                                onChange={field.onChange}
                                placeholder="Select languages you speak"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="specialties"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" /> Specialties
                            </FormLabel>
                            <FormControl>
                              <div className="min-h-[48px]">
                                <MultiSelect
                                  placeholder="Select your specialties"
                                  options={specialtyOptions}
                                  selected={form.watch("specialties")}
                                  onChange={(value) => form.setValue("specialties", value)}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>


                        )}
                      />
                    </div>
                  </div>

                  {/* Password Change Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Change Password (Optional)</h3>

                    <FormField
                      control={form.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder="Enter your current password"
                                {...field}
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Enter new password"
                                {...field}
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Must be at least 8 characters.
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
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Confirm new password"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/guide/dashboard")}
                  >
                    Cancel
                  </Button>

                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GuideEditProfile;
