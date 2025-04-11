
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSocket } from "@/contexts/SocketContext";
import { useToast } from "@/components/ui/use-toast";

interface User {
  id: string;
  firstName: string;
  lastName: string;
}

interface Participant extends User {
  isCurrentUser?: boolean;
  stream?: MediaStream | null;
}

interface VideoChatProps {
  roomId: string;
}

const VideoChat = ({ roomId }: VideoChatProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const { socket, roomUsers } = useSocket();
  const { toast } = useToast();
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Get local media stream
  useEffect(() => {
    // Initialize user media
    const initializeMedia = async () => {
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          
          setLocalStream(stream);
          
          // Get current user from session storage
          const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");
          if (currentUser.firstName) {
            const currentParticipant: Participant = {
              id: currentUser.id || "user1",
              firstName: currentUser.firstName,
              lastName: currentUser.lastName,
              isCurrentUser: true,
              stream
            };
            
            setParticipants([currentParticipant]);
          }
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
        toast({
          title: "Camera/Microphone Error",
          description: "Could not access your camera or microphone",
          variant: "destructive"
        });
      }
    };
    
    initializeMedia();
    
    return () => {
      // Clean up media streams when component unmounts
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, [toast]);

  // Update participants when roomUsers changes
  useEffect(() => {
    if (roomUsers.length > 0) {
      const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");
      
      // Convert roomUsers to participants
      const updatedParticipants = roomUsers.map(user => {
        // Check if this is the current user
        const isCurrentUser = user.id === currentUser.id;
        
        // If this is current user and we have a local stream, use it
        if (isCurrentUser && localStream) {
          return {
            ...user,
            isCurrentUser: true,
            stream: localStream
          };
        }
        
        // For other users, we would set up WebRTC connection
        // in a real implementation. For now, just display them
        // without video
        return {
          ...user,
          isCurrentUser: false,
          stream: null
        };
      });
      
      setParticipants(updatedParticipants);
    }
  }, [roomUsers, localStream]);

  // Update video elements when participants change
  useEffect(() => {
    participants.forEach(participant => {
      if (participant.stream && videoRefs.current[participant.id]) {
        videoRefs.current[participant.id]!.srcObject = participant.stream;
      }
    });
  }, [participants]);

  // Toggle mic/video functions
  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMicOn;
      });
      setIsMicOn(!isMicOn);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOn;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-secondary rounded-t-md px-4 py-2 flex items-center justify-between">
        <h2 className="font-medium flex items-center">
          <Users className="h-4 w-4 mr-2" />
          Video Chat ({participants.length})
        </h2>
      </div>
      
      <div className="p-4 space-y-4 bg-background rounded-b-md flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-4">
          {participants.map((participant) => (
            <div 
              key={participant.id}
              className="aspect-video bg-black rounded-md overflow-hidden relative"
            >
              {participant.stream && (!participant.isCurrentUser || isVideoOn) ? (
                <video 
                  ref={el => videoRefs.current[participant.id] = el}
                  autoPlay 
                  muted={participant.isCurrentUser}
                  playsInline 
                  className="w-full h-full object-cover"
                ></video>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center">
                    <Avatar className="h-20 w-20 mb-4">
                      <AvatarFallback className="text-2xl">
                        {participant.firstName[0]}
                        {participant.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-white">
                      {participant.firstName} {participant.lastName}
                      {participant.isCurrentUser ? " (You)" : ""}
                    </span>
                  </div>
                </div>
              )}
              
              {participant.isCurrentUser && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  <Button 
                    variant={isMicOn ? "default" : "destructive"} 
                    size="icon" 
                    onClick={toggleMic}
                  >
                    {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant={isVideoOn ? "default" : "destructive"} 
                    size="icon" 
                    onClick={toggleVideo}
                  >
                    {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Participants</h3>
          <div className="space-y-2">
            {participants.map((participant) => (
              <div 
                key={participant.id} 
                className="flex items-center gap-2 p-2 rounded-md bg-secondary"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {participant.firstName[0]}
                    {participant.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <span>
                  {participant.firstName} {participant.lastName}
                  {participant.isCurrentUser ? " (You)" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoChat;
