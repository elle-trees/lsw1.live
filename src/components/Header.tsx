import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, User, Settings, ShieldAlert, Download, Radio, Trophy, Github, Menu, Plus, Bell, BarChart3 } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import LegoStudIcon from "@/components/icons/LegoStudIcon";
import { useAuth } from "@/components/AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { LoginModal } from "@/components/LoginModal";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage, logError } from "@/lib/errorUtils";
import { getUnverifiedLeaderboardEntries, getUnclaimedRunsBySRCUsername, getPlayerByUid } from "@/lib/db";
import { usePrefetchOnHover } from "@/hooks/usePrefetch";
import { Notifications } from "@/components/Notifications";

export function Header() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unclaimedRunsCount, setUnclaimedRunsCount] = useState(0);
  const [unverifiedRunsCount, setUnverifiedRunsCount] = useState(0);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUnclaimedRunsCount(0);
      setUnverifiedRunsCount(0);
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      });
    } catch (error) {
      logError(error, "Header.handleLogout");
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to log out."),
        variant: "destructive",
      });
    }
  };

  // Fetch notification counts
  useEffect(() => {
    if (!currentUser || loading) {
      setUnclaimedRunsCount(0);
      setUnverifiedRunsCount(0);
      return;
    }

    const fetchNotificationCounts = async () => {
      try {
        // Check for unclaimed runs (for all users)
        const player = await getPlayerByUid(currentUser.uid);
        if (player?.srcUsername) {
          try {
            const unclaimedRuns = await getUnclaimedRunsBySRCUsername(player.srcUsername);
            setUnclaimedRunsCount(unclaimedRuns.length);
          } catch (error) {
            setUnclaimedRunsCount(0);
          }
        } else {
          setUnclaimedRunsCount(0);
        }

        // Check for unverified runs (for admins only)
        if (currentUser.isAdmin) {
          try {
            const unverifiedRuns = await getUnverifiedLeaderboardEntries();
            // Count only manually submitted runs (not imported)
            const manualUnverified = unverifiedRuns.filter(run => !run.importedFromSRC);
            setUnverifiedRunsCount(manualUnverified.length);
          } catch (error) {
            setUnverifiedRunsCount(0);
          }
        } else {
          setUnverifiedRunsCount(0);
        }
      } catch (error) {
        // Silent fail
      }
    };

    fetchNotificationCounts();
    
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchNotificationCounts, 30000);
    
    return () => clearInterval(interval);
  }, [currentUser?.uid, currentUser?.isAdmin, loading]);

  const handleNotificationClick = () => {
    if (currentUser?.isAdmin && unverifiedRunsCount > 0) {
      navigate("/admin");
    } else if (unclaimedRunsCount > 0) {
      navigate("/settings");
    }
  };

  const notificationCount = currentUser?.isAdmin ? unverifiedRunsCount : unclaimedRunsCount;
  const hasNotifications = notificationCount > 0;

  const NavLinks = () => {
    // Prefetch hooks for all navigation links
    const leaderboardsPrefetch = usePrefetchOnHover("/leaderboards");
    const pointsPrefetch = usePrefetchOnHover("/points");
    const submitPrefetch = usePrefetchOnHover("/submit");
    const livePrefetch = usePrefetchOnHover("/live");
    const downloadsPrefetch = usePrefetchOnHover("/downloads");
    const statsPrefetch = usePrefetchOnHover("/stats");
    const adminPrefetch = usePrefetchOnHover("/admin");

    return (
      <>
        <Link 
          to="/leaderboards" 
          className="text-[#a6e3a1] hover:text-[#a6e3a1] flex items-center gap-1 transition-all duration-300 relative group"
          onClick={() => setIsMobileMenuOpen(false)}
          {...leaderboardsPrefetch}
        >
          <Trophy className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
          <span className="relative">
            Leaderboards
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#a6e3a1] via-ctp-green to-[#a6e3a1] transition-all duration-300 group-hover:w-full"></span>
          </span>
        </Link>
        <Link 
          to="/points" 
          className="text-[#fab387] hover:text-[#fab387] flex items-center gap-1 transition-all duration-300 relative group"
          onClick={() => setIsMobileMenuOpen(false)}
          {...pointsPrefetch}
        >
          <LegoStudIcon size={16} color="#fab387" className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
          <span className="relative">
            Studs
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#fab387] via-ctp-pink to-[#fab387] transition-all duration-300 group-hover:w-full"></span>
          </span>
        </Link>
        <Link 
          to="/submit" 
          className="text-[#eba0ac] hover:text-[#eba0ac] flex items-center gap-1 transition-all duration-300 relative group"
          onClick={() => setIsMobileMenuOpen(false)}
          {...submitPrefetch}
        >
          <Upload className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:translate-y-[-2px]" />
          <span className="relative">
            Submit Run
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#eba0ac] via-ctp-mauve to-[#eba0ac] transition-all duration-300 group-hover:w-full"></span>
          </span>
        </Link>
        <Link 
          to="/live" 
          className="text-[#f38ba8] hover:text-[#f38ba8] flex items-center gap-1 transition-all duration-300 relative group"
          onClick={() => setIsMobileMenuOpen(false)}
          {...livePrefetch}
        >
          <Radio className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
          <span className="relative">
            Live
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#f38ba8] via-ctp-sapphire to-[#f38ba8] transition-all duration-300 group-hover:w-full"></span>
          </span>
        </Link>
        <Link 
          to="/downloads" 
          className="text-[#cba6f7] hover:text-[#cba6f7] flex items-center gap-1 transition-all duration-300 relative group"
          onClick={() => setIsMobileMenuOpen(false)}
          {...downloadsPrefetch}
        >
          <Download className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:translate-y-[2px]" />
          <span className="relative">
            Downloads
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#cba6f7] via-ctp-sky to-[#cba6f7] transition-all duration-300 group-hover:w-full"></span>
          </span>
        </Link>
        <Link 
          to="/stats" 
          className="text-[#89b4fa] hover:text-[#89b4fa] flex items-center gap-1 transition-all duration-300 relative group"
          onClick={() => setIsMobileMenuOpen(false)}
          {...statsPrefetch}
        >
          <BarChart3 className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
          <span className="relative">
            Stats
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#89b4fa] via-ctp-blue to-[#89b4fa] transition-all duration-300 group-hover:w-full"></span>
          </span>
        </Link>
        {currentUser?.isAdmin && (
          <Link 
            to="/admin" 
            className="text-[#f2cdcd] hover:text-[#f2cdcd] flex items-center gap-1 transition-all duration-300 relative group"
            onClick={() => setIsMobileMenuOpen(false)}
            {...adminPrefetch}
          >
            <ShieldAlert className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
            <span className="relative">
              Admin
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#f2cdcd] via-ctp-pink to-[#f2cdcd] transition-all duration-300 group-hover:w-full"></span>
            </span>
          </Link>
        )}
      </>
    );
  };

  return (
    <>
      <header className="bg-[#1e1e2e] border-b border-ctp-surface1 shadow-lg sticky top-0 z-40 w-full overflow-x-hidden">
        <div className="flex items-center justify-between h-16 px-2 sm:px-4 min-w-0 w-full">
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-10 min-w-0 flex-shrink">
            <Link to="/" className="flex items-center space-x-1 sm:space-x-2 group transition-transform duration-300 hover:scale-105 flex-shrink-0">
              <div className="transition-transform duration-300 group-hover:rotate-12">
                <LegoStudIcon size={28} className="sm:w-8 sm:h-8" color="#60a5fa" />
              </div>
              <span className="text-base sm:text-lg md:text-xl font-bold text-[#74c7ec] whitespace-nowrap">lsw1.dev</span>
            </Link>
            {/* Desktop Navigation - Only shown on very large screens */}
            <nav className="hidden xl:flex space-x-6 flex-shrink min-w-0">
              <NavLinks />
            </nav>
          </div>
          
          {/* Mobile Menu Button - Shown on all screens except xl and above */}
          <div className="flex items-center gap-2 xl:gap-3 flex-shrink-0">
            {/* Mobile Menu Sheet */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="xl:hidden text-[hsl(220,17%,92%)] hover:bg-[#89b4fa]/20 hover:text-[#89b4fa] z-[100] flex-shrink-0"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] bg-[#1e1e2e] border-ctp-surface1 z-[100]">
                <div className="flex flex-col gap-6 mt-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <LegoStudIcon size={28} color="#60a5fa" />
                    <span className="text-lg font-bold text-[#74c7ec]">lsw1.dev</span>
                  </div>
                  <nav className="flex flex-col gap-4">
                    <NavLinks />
                  </nav>
                  <div className="pt-4 border-t border-ctp-surface1">
                    {loading ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : currentUser ? (
                      <div className="flex flex-col gap-3">
                <Link 
                          to={`/player/${currentUser.uid}`}
                          className="text-sm text-ctp-subtext1 hover:text-ctp-text transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                >
                          Hi, {currentUser.displayName || currentUser.email?.split('@')[0]}
                </Link>
                        {hasNotifications && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              handleNotificationClick();
                              setIsMobileMenuOpen(false);
                            }}
                            className="relative w-full text-ctp-text hover:text-ctp-text border-yellow-600/50 hover:bg-yellow-600/20 hover:border-yellow-600"
                            title={currentUser.isAdmin ? `${unverifiedRunsCount} run(s) waiting for verification` : `${unclaimedRunsCount} unclaimed run(s)`}
                          >
                            <Bell className="h-4 w-4 mr-2" />
                            <span className="flex-1 text-left">
                              {currentUser.isAdmin ? 'Verify Runs' : 'Claim Runs'}
                            </span>
                            <Badge 
                              variant="destructive" 
                              className="h-5 w-5 flex items-center justify-center p-0 text-xs font-bold"
                            >
                              {notificationCount > 99 ? '99+' : notificationCount}
                            </Badge>
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          asChild
                          className="w-full text-ctp-text hover:text-ctp-text border-ctp-surface1 hover:bg-ctp-blue hover:border-ctp-blue"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Link to="/settings">
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                </Link>
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full text-ctp-text hover:text-ctp-text border-ctp-surface1 hover:bg-ctp-blue hover:border-ctp-blue"
                        >
                          Logout
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsLoginOpen(true);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-ctp-text hover:text-ctp-text border-ctp-surface1 hover:bg-ctp-blue hover:border-ctp-blue flex items-center gap-2"
                >
                        <User className="h-4 w-4" />
                        Sign In
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-4 pt-4 border-t border-ctp-surface1">
                    <a
                      href="https://discord.gg/6A5MNqaK49"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ctp-subtext1 hover:text-[#5865F2] transition-all duration-300 hover:scale-110"
                      aria-label="Discord Server"
                >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                    </a>
                    <a
                      href="https://github.com/elle-trees/lsw1.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ctp-subtext1 hover:text-ctp-text transition-colors"
                      aria-label="GitHub Repository"
                    >
                      <Github className="h-5 w-5" />
                    </a>
                  </div>
          </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Social Links & Auth */}
            <div className="hidden xl:flex items-center gap-3 flex-shrink-0">
              <a
                href="https://discord.gg/6A5MNqaK49"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ctp-subtext1 hover:text-[#5865F2] transition-all duration-300 hover:scale-110"
                aria-label="Discord Server"
              >
                <svg className="h-5 w-5 transition-transform duration-300 hover:rotate-12" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
              <a
                href="https://github.com/elle-trees/lsw1.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ctp-subtext1 hover:text-ctp-text transition-all duration-300 hover:scale-110"
                aria-label="GitHub Repository"
              >
                <Github className="h-5 w-5 transition-transform duration-300 hover:rotate-12" />
              </a>
            {loading ? (
                <Button variant="outline" className="text-ctp-text border-ctp-surface1">
                  Loading...
                </Button>
              ) : currentUser ? (
                <div className="flex items-center gap-2">
                  <Link 
                    to={`/player/${currentUser.uid}`}
                    className="text-ctp-subtext1 hover:text-ctp-text mr-2 transition-all duration-300 hover:scale-105 cursor-pointer font-medium"
                  >
                    Hi, {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </Link>
                  <Notifications />
                  <Button 
                    variant="outline" 
                    asChild
                className="text-ctp-text hover:text-ctp-text border-ctp-surface1 hover:bg-ctp-blue hover:border-ctp-blue transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    <Link to="/settings">
                      <Settings className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                      Settings
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleLogout}
                className="text-ctp-text hover:text-ctp-text border-ctp-surface1 hover:bg-ctp-blue hover:border-ctp-blue transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setIsLoginOpen(true)}
              className="text-ctp-text hover:text-ctp-text border-ctp-surface1 hover:bg-ctp-blue hover:border-ctp-blue flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <User className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      <LoginModal open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </>
  );
}