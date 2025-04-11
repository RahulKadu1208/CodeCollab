import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { cpp } from "@codemirror/lang-cpp";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { Button } from "@/components/ui/button";
import { Play, Save, Share2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSocket } from "@/contexts/SocketContext";

interface CodeEditorProps {
  roomId: string;
}

const CodeEditor = ({ roomId }: CodeEditorProps) => {
  const [codeByLanguage, setCodeByLanguage] = useState({
    python: '# Write your Python code here\nprint("Hello, CodeTogether!")\n',
    javascript: '// Write your JavaScript code here\nconsole.log("Hello, CodeTogether!");\n',
    cpp: '// Write your C++ code here\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, CodeTogether!" << std::endl;\n    return 0;\n}\n'
  });
  const [language, setLanguage] = useState("python");
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { socket, connected } = useSocket();

  // Get current code based on selected language
  const currentCode = codeByLanguage[language as keyof typeof codeByLanguage];

  useEffect(() => {
    // Listen for code updates from other users
    if (!socket) return;

    const onCodeUpdate = ({ code: newCode, language: newLanguage }: { code: string, language: string }) => {
      console.log('Received code update:', { newCode, newLanguage });
      setCodeByLanguage(prev => ({
        ...prev,
        [newLanguage]: newCode
      }));
      setLanguage(newLanguage);
      setIsLoading(false);
    };

    socket.on('code_update', onCodeUpdate);

    // Fetch initial code if joining an existing room
    if (connected && roomId) {
      fetch(`http://localhost:5000/api/rooms/${roomId}`)
        .then(res => res.json())
        .then(data => {
          if (data.exists && data.room) {
            console.log('Initial room data:', data.room);
            setCodeByLanguage(prev => ({
              ...prev,
              [data.room.language]: data.room.code
            }));
            setLanguage(data.room.language);
          }
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error fetching room data:', err);
          setIsLoading(false);
        });
    }

    return () => {
      socket.off('code_update', onCodeUpdate);
    };
  }, [socket, connected, roomId]);

  const getLanguageExtension = () => {
    switch (language) {
      case "python":
        return python();
      case "javascript":
        return javascript();
      case "cpp":
        return cpp();
      default:
        return python();
    }
  };

  const executeCode = () => {
    if (!socket || !connected) {
      toast({
        title: "Cannot execute code",
        description: "Not connected to server",
        variant: "destructive"
      });
      return;
    }

    setIsExecuting(true);
    setOutput("");

    // Emit code execution event to server
    socket.emit("execute_code", { roomId, code: currentCode, language });

    // Listen for execution result
    const onExecutionResult = (result: { success: boolean; output: string; error: string | null }) => {
      setIsExecuting(false);
      
      if (result.success) {
        setOutput(result.output || "No output generated");
        toast({
          title: "Code executed",
          description: "Your code ran successfully",
        });
      } else {
        setOutput(result.error || "An error occurred while executing the code");
        toast({
          title: "Execution failed",
          description: result.error || "An error occurred while executing the code",
          variant: "destructive"
        });
      }
    };

    socket.once("execution_result", onExecutionResult);
  };

  const handleSave = () => {
    if (!socket || !connected) {
      toast({
        title: "Cannot save",
        description: "Not connected to server",
        variant: "destructive"
      });
      return;
    }

    // Save to backend via socket
    socket.emit("code_change", { roomId, code: currentCode, language });
    
    toast({
      title: "Code saved",
      description: "Your code has been saved to the server",
    });
  };

  const handleCodeChange = (newCode: string) => {
    setCodeByLanguage(prev => ({
      ...prev,
      [language]: newCode
    }));
    
    // Debounce sending updates to avoid overwhelming the server
    if (socket && connected) {
      socket.emit("code_change", { roomId, code: newCode, language });
    }
  };

  const handleShare = () => {
    // Copy room URL to clipboard
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied",
      description: "Room link copied to clipboard",
    });
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    // No need to set default template as it's already in the initial state
    if (socket && connected) {
      socket.emit("code_change", { 
        roomId, 
        code: codeByLanguage[value as keyof typeof codeByLanguage], 
        language: value 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full justify-center items-center">
        <RefreshCw className="h-8 w-8 animate-spin mb-4" />
        <p>Loading code editor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary rounded-t-md">
        <div className="flex items-center gap-4">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="cpp">C++</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
          <Button size="sm" onClick={executeCode} disabled={isExecuting}>
            {isExecuting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Run
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="code-editor border border-border">
        <CodeMirror
          value={currentCode}
          height="400px"
          theme={dracula}
          extensions={[getLanguageExtension()]}
          onChange={handleCodeChange}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
        />
      </div>

      <div className="mt-4">
        <h3 className="font-medium mb-2">Output:</h3>
        <div className="bg-secondary p-4 rounded-md font-code whitespace-pre-wrap min-h-[100px] max-h-[200px] overflow-y-auto">
          {output || "Run your code to see output here"}
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
