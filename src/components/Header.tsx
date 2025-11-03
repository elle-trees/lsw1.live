import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, Home, User, Settings, ShieldAlert, Download, Radio, Trophy, Github } from "lucide-react"; // Import Download, Radio, and Trophy icons
import LegoStudIcon from "@/components/icons/LegoStudIcon";
import { useAuth } from "@/components/AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { LoginModal } from "@/components/LoginModal";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const { currentUser, loading } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log out.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <header className="bg-[hsl(240,21%,15%)] border-b border-[hsl(235,13%,30%)]">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-10 px-4">
            <Link to="/" className="flex items-center space-x-2 group transition-transform duration-300 hover:scale-105">
              <div className="transition-transform duration-300 group-hover:rotate-12">
                <LegoStudIcon size={32} color="#60a5fa" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-[#60a5fa] to-[#cba6f7] bg-clip-text text-transparent">lsw1.dev</span>
            </Link>
            <nav className="hidden md:flex space-x-6">
                <Link 
                  to="/" 
                  className="text-[hsl(222,15%,60%)] hover:text-[hsl(220,17%,92%)] flex items-center gap-1 transition-all duration-300 relative group"
                >
                  <Home className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  <span>Home</span>
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#cba6f7] transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link 
                  to="/leaderboards" 
                  className="text-[hsl(222,15%,60%)] hover:text-[hsl(220,17%,92%)] transition-all duration-300 relative group"
                >
                  <span>Leaderboards</span>
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#cba6f7] transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link 
                  to="/points" 
                  className="text-[hsl(222,15%,60%)] hover:text-[hsl(220,17%,92%)] flex items-center gap-1 transition-all duration-300 relative group"
                >
                  <Trophy className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                  <span>Points</span>
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#cba6f7] transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link 
                  to="/submit" 
                  className="text-[hsl(222,15%,60%)] hover:text-[hsl(220,17%,92%)] flex items-center gap-1 transition-all duration-300 relative group"
                >
                  <Upload className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:translate-y-[-2px]" />
                  <span>Submit Run</span>
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#cba6f7] transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link 
                  to="/live" 
                  className="text-[hsl(222,15%,60%)] hover:text-[hsl(220,17%,92%)] flex items-center gap-1 transition-all duration-300 relative group"
                >
                  <Radio className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                  <span>Live</span>
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#cba6f7] transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link 
                  to="/downloads" 
                  className="text-[hsl(222,15%,60%)] hover:text-[hsl(220,17%,92%)] flex items-center gap-1 transition-all duration-300 relative group"
                >
                  <Download className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:translate-y-[2px]" />
                  <span>Downloads</span>
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#cba6f7] transition-all duration-300 group-hover:w-full"></span>
                </Link>
                {currentUser?.isAdmin && ( // Conditionally render Admin link
                  <Link 
                    to="/admin" 
                    className="text-[hsl(222,15%,60%)] hover:text-[hsl(220,17%,92%)] flex items-center gap-1 transition-all duration-300 relative group"
                  >
                    <ShieldAlert className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                    <span>Admin</span>
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#cba6f7] transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                )}
              </nav>
          </div>
          <div className="px-4 flex items-center gap-3">
            <a
              href="https://github.com/elle-trees/lsw1.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[hsl(222,15%,60%)] hover:text-[hsl(220,17%,92%)] transition-all duration-300 hover:scale-110"
              aria-label="GitHub Repository"
            >
              <Github className="h-5 w-5 transition-transform duration-300 hover:rotate-12" />
            </a>
            {loading ? (
                <Button variant="outline" className="text-[hsl(220,17%,92%)] border-[hsl(235,13%,30%)]">
                  Loading...
                </Button>
              ) : currentUser ? (
                <div className="flex items-center gap-2">
                  <Link 
                    to={`/player/${currentUser.uid}`}
                    className="text-[hsl(222,15%,60%)] hover:text-[hsl(220,17%,92%)] mr-2 transition-all duration-300 hover:scale-105 cursor-pointer font-medium"
                  >
                    Hi, {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </Link>
                  <Button 
                    variant="outline" 
                    asChild
                    className="text-[hsl(220,17%,92%)] border-[hsl(235,13%,30%)] hover:bg-[hsl(234,14%,29%)] transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    <Link to="/settings">
                      <Settings className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                      Settings
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleLogout}
                    className="text-[hsl(220,17%,92%)] border-[hsl(235,13%,30%)] hover:bg-[hsl(234,14%,29%)] transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setIsLoginOpen(true)}
                  className="text-[hsl(220,17%,92%)] border-[hsl(235,13%,30%)] hover:bg-[hsl(234,14%,29%)] flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <User className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  Sign In
                </Button>
              )}
          </div>
        </div>
      </header>
      <LoginModal open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </>
  );
}