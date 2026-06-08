import api from "@/lib/api";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Search, LogOut } from "lucide-react";
import { Guide, GuideStatus } from "@/contexts/GuideAuthContext";
import Navbar from "@/components/Navbar";

type GuideWithPassword = Guide & { _id: string };

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [guides, setGuides] = useState<GuideWithPassword[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<GuideWithPassword | null>(null);

  const adminToken = localStorage.getItem("admin_token");
  const authHeaders = { Authorization: `Bearer ${adminToken}` };

  const handleAdminLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };
  
  useEffect(() => {
    const fetchGuides = async () => {
      try {
        const { data } = await api.get("/admin/guides", { headers: authHeaders });
        setGuides(data);
      } catch (err) {
        console.error("Failed to fetch guides", err);
      }
    };
  
    fetchGuides();
  }, []);
  

  const updateGuideStatus = async (guideId: string, status: GuideStatus) => {
    try {
      await api.put(`/admin/guides/${guideId}/status`, { status }, { headers: authHeaders });
  
      const { data } = await api.get("/admin/guides", { headers: authHeaders });
      setGuides(data);
  
      toast({
        title: `Guide ${status}`,
        description: `The guide has been ${status} successfully.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Unable to update guide status",
      });
    }
  };
  

  const getPendingGuides = () => guides.filter(guide => guide.status === "pending");
  const getApprovedGuides = () => guides.filter(guide => guide.status === "approved");
  const getRejectedGuides = () => guides.filter(guide => guide.status === "rejected");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">WellCare Admin</CardTitle>
            <CardTitle className="text-xl">Control Panel</CardTitle>
            <CardDescription>
              Manage guide applications and monitor the platform
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              Pending Applications ({getPendingGuides().length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved Guides ({getApprovedGuides().length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected Applications ({getRejectedGuides().length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Guide Applications</CardTitle>
                <CardDescription>
                  Review and approve or reject guide applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableCaption>List of pending guide applications</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Registration Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPendingGuides().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No pending applications
                        </TableCell>
                      </TableRow>
                    ) : (
                      getPendingGuides().map((guide) => (
                        <TableRow key={guide._id}>
                          <TableCell>{guide.name}</TableCell>
                          <TableCell>{guide.phone}</TableCell>
                          <TableCell>{guide.email || "—"}</TableCell>
                          <TableCell>
                            {new Date(guide.registeredAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedGuide(guide)}
                                  >
                                    <Search className="h-4 w-4 mr-1" /> View
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Guide Application</DialogTitle>
                                    <DialogDescription>
                                      Review the guide's application details
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  {selectedGuide && (
                                    <div className="space-y-4 py-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <h4 className="text-sm font-medium mb-1">Name</h4>
                                          <p>{selectedGuide.name}</p>
                                        </div>
                                        <div>
                                          <h4 className="text-sm font-medium mb-1">Phone</h4>
                                          <p>{selectedGuide.phone}</p>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h4 className="text-sm font-medium mb-1">Email</h4>
                                        <p>{selectedGuide.email || "Not provided"}</p>
                                      </div>
                                      
                                      <div>
                                        <h4 className="text-sm font-medium mb-1">Registration Date</h4>
                                        <p>{new Date(selectedGuide.registeredAt).toLocaleString()}</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <DialogFooter className="flex justify-between">
                                    <Button
                                      variant="destructive"
                                      onClick={() => {
                                        if (selectedGuide) {
                                          updateGuideStatus(selectedGuide._id, "rejected");
                                        }
                                      }}
                                    >
                                      <X className="h-4 w-4 mr-1" /> Reject
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        if (selectedGuide) {
                                          updateGuideStatus(selectedGuide._id, "approved");
                                        }
                                      }}
                                    >
                                      <Check className="h-4 w-4 mr-1" /> Approve
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => updateGuideStatus(guide._id, "approved")}
                              >
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => updateGuideStatus(guide._id, "rejected")}
                              >
                                <X className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="approved">
            <Card>
              <CardHeader>
                <CardTitle>Approved Guides</CardTitle>
                <CardDescription>
                  List of all approved guides
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getApprovedGuides().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No approved guides
                        </TableCell>
                      </TableRow>
                    ) : (
                      getApprovedGuides().map((guide) => (
                        <TableRow key={guide._id}>
                          <TableCell>{guide.name}</TableCell>
                          <TableCell>{guide.phone}</TableCell>
                          <TableCell>{guide.email || "—"}</TableCell>
                          <TableCell>{guide.rating || "No ratings"}</TableCell>
                          <TableCell>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => updateGuideStatus(guide._id, "rejected")}
                            >
                              Revoke Access
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rejected">
            <Card>
              <CardHeader>
                <CardTitle>Rejected Applications</CardTitle>
                <CardDescription>
                  Previously rejected guide applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Registration Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getRejectedGuides().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No rejected applications
                        </TableCell>
                      </TableRow>
                    ) : (
                      getRejectedGuides().map((guide) => (
                        <TableRow key={guide._id}>
                          <TableCell>{guide.name}</TableCell>
                          <TableCell>{guide.phone}</TableCell>
                          <TableCell>{guide.email || "—"}</TableCell>
                          <TableCell>
                            {new Date(guide.registeredAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateGuideStatus(guide._id, "approved")}
                            >
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
