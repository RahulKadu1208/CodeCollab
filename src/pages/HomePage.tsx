import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Layout } from "@/components/Layout";
import { Code2, Users } from "lucide-react";
import axios from "axios";

const HomePage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [roomName, setRoomName] = useState("");

  const createRoom = async () => {
    if (!roomName.trim()) {
      toast({
        title: "Room name required",
        description: "Please provide a name for your room",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Call the backend API to create a room with the room name
      console.log("🚀 ~ createRoom ~ ${process.env.REACT_APP_BACKEND_URL}/api/rooms:", `https://codecollab-gfyu.onrender.com/api/rooms`)
      const response = await axios.post(`https://codecollab-gfyu.onrender.com/api/rooms`, {
        name: roomName.trim()
      });
      const { roomId } = response.data;
      
      setIsCreating(false);
      navigate(`/join/${roomId}`);
    } catch (error) {
      console.error('Error creating room:', error);
      setIsCreating(false);
      toast({
        title: "Error creating room",
        description: "Failed to create a new room. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <Card className="w-full max-w-lg border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
              <Code2 className="h-6 w-6 text-primary" />
              Create Coding Room
            </CardTitle>
            <CardDescription>
              Start a new collaborative coding session. Share the room link with others to code together in real-time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="roomName" className="block text-sm font-medium">
                  Room Name
                </label>
                <Input
                  id="roomName"
                  placeholder="My Awesome Project"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              onClick={createRoom}
              disabled={isCreating}
              className="relative group"
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                  Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Create Room
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            Got an invitation code? 
            <Button 
              variant="link" 
              onClick={() => navigate("/join/placeholder")}
              className="px-1 py-0 h-auto"
            >
              Join existing room
            </Button>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
