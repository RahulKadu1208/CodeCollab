import { useState, useEffect } from "react";
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
  const [roomExists, setRoomExists] = useState<boolean | null>(null);

  // Check if room exists when component mounts
  useEffect(() => {
    const checkRoom = async () => {
      try {
        const response = await fetch(`https://codecollab-gfyu.onrender.com/api/rooms/${roomId}`);
        const data = await response.json();
        setRoomExists(data.exists);
        
        if (!data.exists) {
          toast({
            title: "Room not found",
            description: "The room you're trying to join doesn't exist",
            variant: "destructive",
          });
          navigate("/");
        }
      } catch (error) {
        console.error('Error checking room:', error);
        toast({
          title: "Error",
          description: "Failed to check room existence",
          variant: "destructive",
        });
        navigate("/");
      }
    };

    checkRoom();
  }, [roomId, navigate, toast]);

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

    // Store user info in session storage
    sessionStorage.setItem(
      "user",
      JSON.stringify({ firstName, lastName, id: Date.now().toString() })
    );
    
    setIsJoining(false);
    navigate(`/room/${roomId}`);
  };

  if (roomExists === null) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4">
          <Card className="w-full max-w-lg border border-border">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="h-8 w-8 rounded-full border-2 border-t-transparent border-primary animate-spin mb-4"></div>
              <p>Checking room...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!roomExists) {
    return null; // Will redirect to home page due to useEffect
  }

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
