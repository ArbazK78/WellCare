
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SignInForm from "./SignInForm";
import RegisterForm from "./RegisterForm";

type AuthTabsProps = {
  activeTab: "signin" | "register";
  setActiveTab: (value: "signin" | "register") => void;
};

const AuthTabs = ({ activeTab, setActiveTab }: AuthTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "signin" | "register")} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-8">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>
      
      <TabsContent value="signin" className="mt-0">
        <SignInForm />
      </TabsContent>
      
      <TabsContent value="register" className="mt-0">
        <RegisterForm />
      </TabsContent>
    </Tabs>
  );
};

export default AuthTabs;
