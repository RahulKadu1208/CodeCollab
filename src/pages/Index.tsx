
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { Code, Users, Video, MessageSquare } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container px-4 py-12 md:py-24">
        <div className="flex flex-col items-center text-center mb-12">
          <div className="rounded-full bg-primary/10 p-3 mb-4">
            <Code className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Code Together in Real-Time
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mb-8">
            A collaborative platform for developers to code, chat, and share ideas with teammates, all in one place.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/")}>
              Create Room
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate("/join/placeholder")}
            >
              Join Existing Room
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-card rounded-lg p-6 border border-border flex flex-col items-center text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Code className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Real-time Code Editor</h3>
            <p className="text-muted-foreground">
              Write and execute code with real-time collaboration and syntax highlighting.
            </p>
          </div>
          
          <div className="bg-card rounded-lg p-6 border border-border flex flex-col items-center text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Video Conferencing</h3>
            <p className="text-muted-foreground">
              Connect face-to-face with teammates through integrated WebRTC video calls.
            </p>
          </div>
          
          <div className="bg-card rounded-lg p-6 border border-border flex flex-col items-center text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Integrated Chat</h3>
            <p className="text-muted-foreground">
              Discuss ideas and share feedback without leaving the coding environment.
            </p>
          </div>
        </div>

        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to start collaborating?</h2>
          <Button 
            size="lg" 
            className="flex items-center gap-2"
            onClick={() => navigate("/")}
          >
            <Users className="h-5 w-5" />
            Create a Room Now
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
