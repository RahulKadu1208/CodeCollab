import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useToast } from "@/components/ui/use-toast";

type SocketProviderProps = {
  children: React.ReactNode;
};

type User = {
  firstName: string;
  lastName: string;
  id: string;
};

type SocketContextType = {
  socket: Socket | null;
  connected: boolean;
  roomUsers: User[];
  joinRoom: (roomId: string, user: User) => void;
  leaveRoom: (roomId: string) => void;
  isConnecting: boolean;
  currentRoomId: string | null;
};

// In a production environment, this would be configured via environment variables
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  roomUsers: [],
  joinRoom: () => {},
  leaveRoom: () => {},
  isConnecting: false,
  currentRoomId: null,
});

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [roomUsers, setRoomUsers] = useState<User[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    setSocket(socketInstance);

    // Socket event handlers
    const onConnect = () => {
      console.log('Socket connected');
      setConnected(true);
      setIsConnecting(false);
      
      // If we were in a room before reconnecting, rejoin it
      if (currentRoomId) {
        const storedUser = sessionStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          // Clear room users before rejoining to prevent duplicates
          setRoomUsers([]);
          socketInstance.emit("join_room", { roomId: currentRoomId, user });
        }
      }
    };

    const onDisconnect = (reason: string) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
      
      toast({
        title: "Disconnected",
        description: "Lost connection to the server. Trying to reconnect...",
        variant: "destructive",
      });
    };

    const onError = (error: Error) => {
      console.error('Socket error:', error);
      setIsConnecting(false);
      
      toast({
        title: "Connection Error",
        description: "Failed to connect to the server.",
        variant: "destructive",
      });
    };

    const onUserJoined = ({ user, users }: { user: User, users: User[] }) => {
      console.log('User joined:', user, 'All users:', users);
      // Remove duplicates by using a Map with user.id as key
      const uniqueUsers = Array.from(
        new Map(users.map(user => [user.id, user])).values()
      );
      setRoomUsers(uniqueUsers);
      
      // Don't show toast for the current user
      const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");
      if (user.id !== currentUser.id) {
        toast({
          title: "User Joined",
          description: `${user.firstName} ${user.lastName} joined the room`,
        });
      }
    };

    const onUserLeft = ({ user, users }: { user: User, users: User[] }) => {
      console.log('User left:', user, 'Remaining users:', users);
      // Remove duplicates by using a Map with user.id as key
      const uniqueUsers = Array.from(
        new Map(users.map(user => [user.id, user])).values()
      );
      setRoomUsers(uniqueUsers);
      
      toast({
        title: "User Left",
        description: `${user.firstName} ${user.lastName} left the room`,
      });
    };

    // Register event listeners
    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on("connect_error", onError);
    socketInstance.on("user_joined", onUserJoined);
    socketInstance.on("user_left", onUserLeft);

    return () => {
      // Clean up event listeners on unmount
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off("connect_error", onError);
      socketInstance.off("user_joined", onUserJoined);
      socketInstance.off("user_left", onUserLeft);
      
      if (socketInstance.connected) {
        socketInstance.disconnect();
      }
    };
  }, [toast, currentRoomId]);

  const joinRoom = useCallback((roomId: string, user: User) => {
    if (!socket) return;
    
    setIsConnecting(true);
    setCurrentRoomId(roomId);
    // Clear room users before joining to prevent duplicates
    setRoomUsers([]);
    
    // Connect if not already connected
    if (!socket.connected) {
      socket.connect();
    }
    
    socket.emit("join_room", { roomId, user });
  }, [socket]);

  const leaveRoom = useCallback((roomId: string) => {
    if (!socket) return;
    
    socket.emit("leave_room", { roomId });
    setCurrentRoomId(null);
    setRoomUsers([]);
  }, [socket]);

  return (
    <SocketContext.Provider value={{ 
      socket, 
      connected, 
      roomUsers, 
      joinRoom, 
      leaveRoom, 
      isConnecting,
      currentRoomId
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
