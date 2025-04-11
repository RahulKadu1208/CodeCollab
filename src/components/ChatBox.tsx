
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from "@/contexts/SocketContext";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

interface ChatBoxProps {
  roomId: string;
}

const ChatBox = ({ roomId }: ChatBoxProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket, connected } = useSocket();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!socket || !connected) return;
    
    // Listen for new messages
    const onReceiveMessage = (message: Message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    };
    
    // Listen for chat history when joining the room
    const onChatHistory = (history: Message[]) => {
      console.log('Received chat history:', history);
      setMessages(history);
      setIsLoading(false);
    };
    
    // Register event listeners
    socket.on("receive_message", onReceiveMessage);
    socket.on("chat_history", onChatHistory);
    
    // Fetch chat history if we don't get it from socket in a reasonable time
    const fetchMessagesFallback = setTimeout(() => {
      if (isLoading) {
        fetch(`http://localhost:5000/api/rooms/${roomId}/messages`)
          .then(res => res.json())
          .then(data => {
            console.log('Fetched messages via HTTP:', data);
            setMessages(data);
            setIsLoading(false);
          })
          .catch(err => {
            console.error('Error fetching messages:', err);
            setIsLoading(false);
          });
      }
    }, 3000);
    
    return () => {
      // Clean up event listeners
      socket.off("receive_message", onReceiveMessage);
      socket.off("chat_history", onChatHistory);
      clearTimeout(fetchMessagesFallback);
    };
  }, [socket, connected, roomId, isLoading]);
  
  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket || !connected) return;
    
    const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");
    
    if (currentUser.firstName) {
      const message: Message = {
        id: Date.now().toString(),
        senderId: currentUser.id || socket.id,
        senderName: `${currentUser.firstName} ${currentUser.lastName}`,
        text: newMessage,
        timestamp: new Date(),
      };
      
      // Emit message to server
      socket.emit("send_message", { roomId, message });
      
      // Add message locally for immediate feedback
      setMessages((prevMessages) => [...prevMessages, message]);
      setNewMessage("");
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-secondary rounded-t-md px-4 py-2 flex items-center">
        <MessageSquare className="h-4 w-4 mr-2" />
        <h2 className="font-medium">Chat</h2>
      </div>
      
      <ScrollArea className="flex-1 p-4 bg-background rounded-b-md">
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
              No messages yet. Say hello!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.senderId === "system" ? "items-center" : ""
                }`}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className={`${
                    message.senderId === "system" ? "bg-primary" : ""
                  }`}>
                    {message.senderId === "system"
                      ? "S"
                      : message.senderName.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{message.senderName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(new Date(message.timestamp))}
                    </span>
                  </div>
                  
                  <p className={`mt-1 text-sm ${
                    message.senderId === "system" ? "text-muted-foreground" : ""
                  }`}>
                    {message.text}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="mt-2 flex gap-2">
        <Input
          placeholder={connected ? "Type your message..." : "Connecting..."}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSendMessage();
            }
          }}
          disabled={!connected}
          className="flex-1"
        />
        <Button 
          size="icon" 
          onClick={handleSendMessage} 
          disabled={!connected || !newMessage.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatBox;
