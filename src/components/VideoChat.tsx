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
  peerConnection?: RTCPeerConnection;
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
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

  // Configuration for WebRTC
  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Create and set up peer connection
  const createPeerConnection = (userId: string) => {
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnections.current[userId] = peerConnection;

    // Add local tracks to the peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      const stream = event.streams[0];
      setParticipants(prev => prev.map(p => 
        p.id === userId ? { ...p, stream } : p
      ));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('ice_candidate', {
          roomId,
          candidate: event.candidate,
          targetUserId: userId
        });
      }
    };

    return peerConnection;
  };

  // Initialize media and set up socket listeners
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const initializeMedia = async () => {
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          
          streamRef.current = stream;
          setLocalStream(stream);
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

    const handleOffer = async ({ offer, userId }: { offer: RTCSessionDescriptionInit, userId: string }) => {
      const peerConnection = createPeerConnection(userId);
      
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      socket?.emit('answer', {
        roomId,
        answer,
        targetUserId: userId
      });
    };

    const handleAnswer = async ({ answer, userId }: { answer: RTCSessionDescriptionInit, userId: string }) => {
      const peerConnection = peerConnections.current[userId];
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async ({ candidate, userId }: { candidate: RTCIceCandidateInit, userId: string }) => {
      const peerConnection = peerConnections.current[userId];
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    initializeMedia();

    // Set up socket listeners
    socket?.on('offer', handleOffer);
    socket?.on('answer', handleAnswer);
    socket?.on('ice_candidate', handleIceCandidate);

    return () => {
      // Clean up media streams and socket listeners
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Close all peer connections
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};

      socket?.off('offer', handleOffer);
      socket?.off('answer', handleAnswer);
      socket?.off('ice_candidate', handleIceCandidate);
    };
  }, [socket, roomId, toast]);

  // Update participants and create peer connections
  useEffect(() => {
    if (roomUsers.length > 0) {
      const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");
      
      const updatedParticipants = roomUsers.map(user => {
        const isCurrentUser = user.id === currentUser.id;
        
        if (isCurrentUser && localStream) {
          return {
            ...user,
            isCurrentUser: true,
            stream: localStream
          };
        }
        
        // Create peer connection for new users
        if (!isCurrentUser && !peerConnections.current[user.id]) {
          const peerConnection = createPeerConnection(user.id);
          
          // Create and send offer
          peerConnection.createOffer()
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => {
              socket?.emit('offer', {
                roomId,
                offer: peerConnection.localDescription,
                targetUserId: user.id
              });
            })
            .catch(console.error);
        }
        
        return {
          ...user,
          isCurrentUser: false,
          stream: null
        };
      });
      
      setParticipants(updatedParticipants);
    } else {
      setParticipants([]);
    }
  }, [roomUsers, localStream, socket, roomId]);

  // Update video elements when participants change
  useEffect(() => {
    participants.forEach(participant => {
      const videoElement = videoRefs.current[participant.id];
      if (participant.stream && videoElement) {
        videoElement.srcObject = participant.stream;
      }
    });
  }, [participants]);

  // Toggle mic/video functions
  const toggleMic = () => {
    if (localStream) {
      const newState = !isMicOn;
      localStream.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });
      setIsMicOn(newState);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const newState = !isVideoOn;
      localStream.getVideoTracks().forEach(track => {
        track.enabled = newState;
      });
      setIsVideoOn(newState);
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
