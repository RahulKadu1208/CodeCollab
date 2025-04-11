
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import CodeEditor from "@/components/CodeEditor";
import VideoChat from "@/components/VideoChat";
import ChatBox from "@/components/ChatBox";
import { useSocket } from "@/contexts/SocketContext";
import { CopyIcon, Users } from "lucide-react";

const RoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("code");
  const [user, setUser] = useState<{ firstName: string; lastName: string; id: string } | null>(null);
  const { joinRoom, roomUsers, connected } = useSocket();

  // Check if user is logged in
  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      
      // Join the socket room if user is logged in and roomId exists
      if (roomId) {
        joinRoom(roomId, parsedUser);
      }
    } else {
      // Redirect to join page if user is not logged in
      navigate(`/join/${roomId}`);
    }
  }, [roomId, navigate, joinRoom]);

  const copyRoomLink = () => {
    const roomUrl = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(roomUrl);
    
    toast({
      title: "Link copied",
      description: "Share this link with others to invite them",
    });
  };

  if (!user) {
    return null; // Don't render anything while checking user authentication
  }

  return (
    <Layout>
      <div className="container px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Coding Room</h1>
            <div className="flex items-center text-muted-foreground">
              <span>Room ID: {roomId}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-1"
                onClick={copyRoomLink}
              >
                <CopyIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <span className="text-sm mr-2">
                {connected ? (
                  <span className="text-green-500">●</span>
                ) : (
                  <span className="text-red-500">●</span>
                )}
                {connected ? " Connected" : " Connecting..."}
              </span>
              <div className="bg-secondary rounded-full px-3 py-1 text-sm">
                {roomUsers.length} {roomUsers.length === 1 ? "user" : "users"} online
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={copyRoomLink}
            >
              <Users className="h-4 w-4" />
              Invite Others
            </Button>
          </div>
        </div>

        <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-200px)] rounded-lg border">
          <ResizablePanel defaultSize={70} minSize={40}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="border-b px-4 py-2">
                <TabsList>
                  <TabsTrigger value="code">Code Editor</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="code" className="flex-1 p-4">
                <CodeEditor roomId={roomId || ""} />
              </TabsContent>
            </Tabs>
          </ResizablePanel>
          
          <ResizableHandle />
          
          <ResizablePanel defaultSize={30} minSize={20}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={50}>
                <div className="h-full p-4">
                  <VideoChat roomId={roomId || ""} />
                </div>
              </ResizablePanel>
              
              <ResizableHandle />
              
              <ResizablePanel defaultSize={50}>
                <div className="h-full p-4">
                  <ChatBox roomId={roomId || ""} />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </Layout>
  );
};

export default RoomPage;
