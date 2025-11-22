import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GameDetailsConfig } from "@/types/database";
import { getGameDetailsConfig } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Upload, Radio, Download, BarChart3, ShieldAlert, User, Settings, Github, Menu, Bell } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import LegoStudIcon from "@/components/icons/LegoStudIcon";
import { useAuth } from "@/components/AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { LoginModal } from "@/components/LoginModal";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage, logError } from "@/lib/errorUtils";
import { getUnverifiedLeaderboardEntries, getUnclaimedRunsBySRCUsername, getPlayerByUid } from "@/lib/db";
import { Notifications } from "@/components/Notifications";

interface GameDetailsProps {
  className?: string;
}

// Icon mapping for header links
const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number; color?: string }>> = {
  Trophy,
  Upload,
  Radio,
  Download,
  BarChart3,
  ShieldAlert,
};

export function GameDetails({ className }: GameDetailsProps) {
  const [config, setConfig] = useState<GameDetailsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unclaimedRunsCount, setUnclaimedRunsCount] = useState(0);
  const [unverifiedRunsCount, setUnverifiedRunsCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const gameConfig = await getGameDetailsConfig();
        setConfig(gameConfig);
      } catch (error) {
        console.error("Error fetching game details config:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

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
      logError(error, "GameDetails.handleLogout");
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to log out."),
        variant: "destructive",
      });
    }
  };

  // Fetch notification counts
  useEffect(() => {
    if (!currentUser || authLoading) {
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
  }, [currentUser, authLoading]);

  const handleNotificationClick = () => {
    if (currentUser?.isAdmin && unverifiedRunsCount > 0) {
      navigate("/admin");
    } else if (unclaimedRunsCount > 0) {
      navigate("/settings");
    }
  };

  const notificationCount = currentUser?.isAdmin ? unverifiedRunsCount : unclaimedRunsCount;
  const hasNotifications = notificationCount > 0;

  // Don't render if loading, disabled, or not visible on current page
  if (loading || !config || !config.enabled) {
    // Still render header controls even if game details are disabled
    return (
      <header className="bg-[#1e1e2e] shadow-lg sticky top-0 z-40 w-full overflow-x-hidden">
        <div className="flex items-center justify-between h-16 px-2 sm:px-4 min-w-0 w-full">
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-10 min-w-0 flex-shrink">
            {/* Empty space where game details would be */}
          </div>
          
          {/* Mobile Menu Button - Shown on all screens except xl and above */}
          <div className="flex items-center gap-2 xl:gap-3 flex-shrink-0">
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
                  <div className="pt-4 border-t border-ctp-surface1">
                    {authLoading ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : currentUser ? (
                      <div className="flex flex-col gap-3">
                        <Link 
                          to={`/player/${currentUser.uid}`}
                          className="text-sm text-ctp-text transition-colors"
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
                      className="text-[#5865F2] hover:text-[#5865F2] transition-all duration-300 hover:scale-110"
                      aria-label="Discord Server"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                    </a>
                    {config?.speedrunComUrl && (
                      <a
                        href={config.speedrunComUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#F59E0B] hover:text-[#F59E0B] transition-all duration-300 hover:scale-110"
                        aria-label="Speedrun.com"
                      >
                        <Trophy className="h-5 w-5" />
                      </a>
                    )}
                    <a
                      href="https://github.com/elle-trees/lsw1.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ctp-text hover:text-ctp-text transition-colors"
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
                className="text-[#5865F2] hover:text-[#5865F2] transition-all duration-300 hover:scale-110"
                aria-label="Discord Server"
              >
                <svg className="h-5 w-5 transition-transform duration-300 hover:rotate-12" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
              {config?.speedrunComUrl && (
                <a
                  href={config.speedrunComUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F59E0B] hover:text-[#F59E0B] transition-all duration-300 hover:scale-110"
                  aria-label="Speedrun.com"
                >
                  <Trophy className="h-5 w-5 transition-transform duration-300 hover:rotate-12" />
                </a>
              )}
              <a
                href="https://github.com/elle-trees/lsw1.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ctp-text hover:text-ctp-text transition-all duration-300 hover:scale-110"
                aria-label="GitHub Repository"
              >
                <Github className="h-5 w-5 transition-transform duration-300 hover:rotate-12" />
              </a>
              {authLoading ? (
                <Button variant="outline" className="text-ctp-text border-ctp-surface1">
                  Loading...
                </Button>
              ) : currentUser ? (
                <div className="flex items-center gap-2">
                  <Link 
                    to={`/player/${currentUser.uid}`}
                    className="text-ctp-text hover:text-ctp-text mr-2 transition-all duration-300 hover:scale-105 cursor-pointer font-medium"
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
    );
  }

  // Check if component should be visible on current page
  const currentPath = location.pathname;
  const isVisible = config.visibleOnPages.some(page => {
    if (page === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(page);
  });

  // Sort platforms by order
  const sortedPlatforms = [...config.platforms].sort((a, b) => {
    const orderA = a.order ?? Infinity;
    const orderB = b.order ?? Infinity;
    return orderA - orderB;
  });

  // Sort header links by order and filter by admin status
  // Also ensure admin link is always present for admins
  let headerLinks = [...(config.headerLinks || [])];
  
  // If user is admin, ensure admin link exists
  if (currentUser?.isAdmin) {
    const hasAdminLink = headerLinks.some(link => link.route === "/admin");
    if (!hasAdminLink) {
      headerLinks.push({
        id: "admin",
        label: "Admin",
        route: "/admin",
        icon: "ShieldAlert",
        color: "#f2cdcd",
        order: 999, // Put it at the end if not configured
        adminOnly: true,
      });
    }
  }
  
  const sortedHeaderLinks = headerLinks
    .filter(link => !link.adminOnly || currentUser?.isAdmin)
    .sort((a, b) => {
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;
      return orderA - orderB;
    });

  return (
    <>
      <header className="bg-[#1e1e2e] shadow-lg sticky top-0 z-40 w-full overflow-x-hidden">
        <div className="flex items-start justify-between px-2 sm:px-4 min-w-0 w-full py-3">
          {/* Game Details Section - Left Side */}
          <div className="flex items-start gap-2 sm:gap-4 lg:gap-5 min-w-0 flex-shrink flex-1">
            {isVisible ? (
              <div className="flex items-end gap-2 sm:gap-4 lg:gap-5 min-w-0 flex-shrink flex-1">
                {/* Game Cover Image */}
                {config.coverImageUrl && (
                  <div className="flex-shrink-0">
                    <img
                      src={config.coverImageUrl}
                      alt={config.title}
                      className="w-20 h-28 sm:w-24 sm:h-32 object-cover rounded-none border border-ctp-surface1"
                    />
                  </div>
                )}

                {/* Main Content */}
                <div className="flex-1 min-w-0 flex flex-col h-28 sm:h-32">
                  <div className="flex-1">
                    {/* Title and Categories */}
                    <div className="mb-1.5">
                      <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-ctp-text mb-1.5">
                        {config.title}
                        {config.subtitle && (
                          <span className="text-ctp-subtext1 font-normal text-sm sm:text-base"> ({config.subtitle})</span>
                        )}
                      </h1>
                      {config.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {config.categories.map((category, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-ctp-surface0 text-ctp-text border-ctp-surface1 text-xs sm:text-sm px-2 py-1"
                            >
                              {category}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Platform Buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {sortedPlatforms.map((platform) => (
                        <Button
                          key={platform.id}
                          variant="outline"
                          className="bg-ctp-surface0 text-ctp-text border-ctp-surface1 hover:bg-ctp-surface1 hover:border-ctp-mauve/50 rounded-none text-xs sm:text-sm px-2.5 py-1 h-auto"
                        >
                          {platform.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Header Navigation Links */}
                  {sortedHeaderLinks.length > 0 && (
                    <nav className="flex flex-wrap gap-2 sm:gap-3 lg:gap-4">
                      {sortedHeaderLinks.map((link) => {
                        const IconComponent = link.icon === "LegoStud" 
                          ? LegoStudIcon 
                          : (link.icon ? iconMap[link.icon] : null);
                        const linkColor = link.color || "#cdd6f4";
                        const isActive = location.pathname === link.route || 
                          (link.route !== "/" && location.pathname.startsWith(link.route));

                        return (
                          <Link
                            key={link.id}
                            to={link.route}
                            className="relative flex items-center gap-1 transition-all duration-300 group text-sm"
                            style={{ color: linkColor }}
                          >
                            {IconComponent && (
                              link.icon === "LegoStud" ? (
                                <LegoStudIcon 
                                  size={16} 
                                  color={linkColor}
                                  className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
                                />
                              ) : (
                                <IconComponent 
                                  className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
                                  style={{ color: linkColor }}
                                />
                              )
                            )}
                            <span className="relative">
                              {link.label}
                              <span 
                                className="absolute -bottom-1 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full"
                                style={{ backgroundColor: linkColor }}
                              ></span>
                            </span>
                            {isActive && (
                              <span 
                                className="absolute -bottom-1 left-0 w-full h-0.5"
                                style={{ backgroundColor: linkColor }}
                              ></span>
                            )}
                          </Link>
                        );
                      })}
                    </nav>
                  )}
                </div>
              </div>
            ) : null}
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
                  <div className="pt-4 border-t border-ctp-surface1">
                    {authLoading ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : currentUser ? (
                      <div className="flex flex-col gap-3">
                        <Link 
                          to={`/player/${currentUser.uid}`}
                          className="text-sm text-ctp-text transition-colors"
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
                      className="text-[#5865F2] hover:text-[#5865F2] transition-all duration-300 hover:scale-110"
                      aria-label="Discord Server"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                    </a>
                    {config?.speedrunComUrl && (
                      <a
                        href={config.speedrunComUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#F59E0B] hover:text-[#F59E0B] transition-all duration-300 hover:scale-110"
                        aria-label="Speedrun.com"
                      >
                        <Trophy className="h-5 w-5" />
                      </a>
                    )}
                    <a
                      href="https://github.com/elle-trees/lsw1.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ctp-text hover:text-ctp-text transition-colors"
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
                className="text-[#5865F2] hover:text-[#5865F2] transition-all duration-300 hover:scale-110"
                aria-label="Discord Server"
              >
                <svg className="h-5 w-5 transition-transform duration-300 hover:rotate-12" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
              {config?.speedrunComUrl && (
                <a
                  href={config.speedrunComUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F59E0B] hover:text-[#F59E0B] transition-all duration-300 hover:scale-110"
                  aria-label="Speedrun.com"
                >
                  <Trophy className="h-5 w-5 transition-transform duration-300 hover:rotate-12" />
                </a>
              )}
              <a
                href="https://github.com/elle-trees/lsw1.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ctp-text hover:text-ctp-text transition-all duration-300 hover:scale-110"
                aria-label="GitHub Repository"
              >
                <Github className="h-5 w-5 transition-transform duration-300 hover:rotate-12" />
              </a>
              {authLoading ? (
                <Button variant="outline" className="text-ctp-text border-ctp-surface1">
                  Loading...
                </Button>
              ) : currentUser ? (
                <div className="flex items-center gap-2">
                  <Link 
                    to={`/player/${currentUser.uid}`}
                    className="text-ctp-text hover:text-ctp-text mr-2 transition-all duration-300 hover:scale-105 cursor-pointer font-medium"
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
