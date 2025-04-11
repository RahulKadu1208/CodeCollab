
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Layout } from "@/components/Layout";
import { LogIn } from "lucide-react";

const JoinRoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both your first and last name",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    // In a real app, this would send the user data to the backend
    setTimeout(() => {
      // Store user info in session storage (would be handled better in a real app)
      sessionStorage.setItem(
        "user",
        JSON.stringify({ firstName, lastName, id: Date.now().toString() })
      );
      
      setIsJoining(false);
      navigate(`/room/${roomId}`);
    }, 1000);
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <Card className="w-full max-w-lg border border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Join Coding Room</CardTitle>
            <CardDescription>
              Enter your name to join the collaborative coding session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="block text-sm font-medium">
                    First Name
                  </label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="block text-sm font-medium">
                    Last Name
                  </label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              onClick={handleJoin}
              disabled={isJoining}
              className="relative group"
            >
              {isJoining ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                  Joining...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Join Room
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default JoinRoomPage;
