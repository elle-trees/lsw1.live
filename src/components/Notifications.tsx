import { useState, useEffect, useCallback } from "react";
import { Bell, Check, ExternalLink, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, AnimatedTabsList, AnimatedTabsTrigger, AnimatedTabsContent } from "@/components/ui/animated-tabs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { useAuth } from "@/components/AuthProvider";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnclaimedRunsBySRCUsername,
  getPlayerByUid,
  subscribeToUnreadUserNotifications,
  subscribeToUnverifiedRuns
} from "@/lib/db";
import { Notification } from "@/types/notifications";
import { LeaderboardEntry } from "@/types/database";
import type { Unsubscribe } from "firebase/firestore";

export function Notifications() {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingRuns, setPendingRuns] = useState<LeaderboardEntry[]>([]);
  const [unclaimedRunsCount, setUnclaimedRunsCount] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("notifications");
  const [loading, setLoading] = useState(false);

  // Fetch unclaimed runs count (this still needs polling as it's a complex query)
  const fetchUnclaimedCount = async () => {
    if (!currentUser) return;
    try {
      const player = await getPlayerByUid(currentUser.uid);
      if (player?.srcUsername) {
        try {
          const unclaimed = await getUnclaimedRunsBySRCUsername(player.srcUsername);
          setUnclaimedRunsCount(unclaimed.length);
        } catch (e) {
          setUnclaimedRunsCount(0);
        }
      } else {
        setUnclaimedRunsCount(0);
      }
    } catch (error) {
      setUnclaimedRunsCount(0);
    }
  };

  // Set up real-time listeners for notifications and pending runs
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setPendingRuns([]);
      return;
    }

    const unsubscribes: (Unsubscribe | null)[] = [];

    // Subscribe to unread notifications
    const unsubNotifications = subscribeToUnreadUserNotifications(
      currentUser.uid,
      (notifs) => {
        setNotifications(notifs);
        setLoading(false);
      }
    );
    if (unsubNotifications) unsubscribes.push(unsubNotifications);

    // Subscribe to unverified runs (admin only)
    if (currentUser.isAdmin) {
      const unsubUnverified = subscribeToUnverifiedRuns((runs) => {
        // Filter out imported runs that are automatically handled/verified differently
        const manualUnverified = runs.filter(run => !run.importedFromSRC);
        setPendingRuns(manualUnverified);
      });
      if (unsubUnverified) unsubscribes.push(unsubUnverified);
    }

    // Initial fetch for unclaimed count
    fetchUnclaimedCount();

    // Poll for unclaimed count (complex query, still needs polling)
    const unclaimedInterval = setInterval(fetchUnclaimedCount, 30000);

    return () => {
      unsubscribes.forEach(unsub => {
        if (unsub) unsub();
      });
      clearInterval(unclaimedInterval);
    };
  }, [currentUser]);

  // Fetch unclaimed count when popover opens
  useEffect(() => {
    if (open && currentUser) {
      fetchUnclaimedCount();
    }
  }, [open, currentUser]);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    await markAllNotificationsAsRead(currentUser.uid);
    setNotifications([]);
  };

  const handleDeleteNotification = async (id: string) => {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const totalCount = notifications.length + (currentUser?.isAdmin ? pendingRuns.length : 0) + unclaimedRunsCount;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative text-ctp-text hover:text-ctp-text border-ctp-surface1 hover:bg-ctp-surface1"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold animate-pulse"
            >
              {totalCount > 99 ? "99+" : totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0 bg-[#1e1e2e] border-ctp-surface1 text-ctp-text" align="end">
        <Tabs defaultValue={currentUser?.isAdmin && pendingRuns.length > 0 ? "pending" : "notifications"} className="w-full" onValueChange={setActiveTab}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-ctp-surface1">
            <h4 className="font-semibold">Notifications</h4>
            {activeTab === "notifications" && notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-2 text-ctp-subtext1 hover:text-ctp-text"
                onClick={handleMarkAllAsRead}
              >
                Mark all read
              </Button>
            )}
          </div>
          
          {currentUser?.isAdmin || unclaimedRunsCount > 0 ? (
            <AnimatedTabsList className="w-full justify-start border-b border-ctp-surface1 bg-transparent p-0" indicatorClassName="h-0.5 bg-ctp-blue">
              <AnimatedTabsTrigger
                value="notifications"
                className="flex-1 px-4 py-2 data-[state=active]:text-ctp-blue"
              >
                Alerts ({notifications.length})
              </AnimatedTabsTrigger>
              {currentUser?.isAdmin && (
                <AnimatedTabsTrigger
                  value="pending"
                  className="flex-1 px-4 py-2 data-[state=active]:text-ctp-blue"
                >
                  Pending ({pendingRuns.length})
                </AnimatedTabsTrigger>
              )}
              {!currentUser?.isAdmin && unclaimedRunsCount > 0 && (
                  <AnimatedTabsTrigger
                  value="unclaimed"
                  className="flex-1 px-4 py-2 data-[state=active]:text-ctp-blue"
                >
                  Unclaimed ({unclaimedRunsCount})
                </AnimatedTabsTrigger>
              )}
            </AnimatedTabsList>
          ) : null}

          <AnimatedTabsContent value="notifications" className="m-0">
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-ctp-subtext1">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p>No new notifications</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 p-4 border-b border-ctp-surface1 last:border-0 hover:bg-ctp-surface0/50 transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {notification.title}
                        </p>
                        <p className="text-sm text-ctp-subtext1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-ctp-subtext0 pt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                        {notification.link && (
                            <Link 
                                to={notification.link} 
                                className="text-xs text-ctp-blue hover:underline flex items-center gap-1 mt-2"
                                onClick={() => setOpen(false)}
                            >
                                View Details <ExternalLink className="h-3 w-3" />
                            </Link>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-ctp-subtext1 hover:text-ctp-green"
                            onClick={() => handleMarkAsRead(notification.id)}
                            title="Mark as read"
                        >
                            <Check className="h-4 w-4" />
                        </Button>
                        {/* <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-ctp-subtext1 hover:text-ctp-red"
                            onClick={() => handleDeleteNotification(notification.id)}
                            title="Delete"
                        >
                            <X className="h-4 w-4" />
                        </Button> */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </AnimatedTabsContent>

          {currentUser?.isAdmin && (
            <AnimatedTabsContent value="pending" className="m-0">
              <ScrollArea className="h-[300px]">
                {pendingRuns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-ctp-subtext1">
                    <Check className="h-8 w-8 mb-2 opacity-50" />
                    <p>No pending runs</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {pendingRuns.map((run) => (
                      <div
                        key={run.id}
                        className="flex flex-col p-4 border-b border-ctp-surface1 last:border-0 hover:bg-ctp-surface0/50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">{run.game || "Game"}</span>
                          <Badge variant="outline" className="text-xs border-ctp-yellow text-ctp-yellow">
                            Pending
                          </Badge>
                        </div>
                        <p className="text-sm text-ctp-subtext1 mb-1">
                          {run.category} - {run.time}
                        </p>
                        <p className="text-xs text-ctp-subtext0">
                          by <span className="text-ctp-blue">{run.playerName}</span> • {run.date}
                        </p>
                        <div className="flex gap-2 mt-3">
                           <Button 
                                variant="default" 
                                size="sm" 
                                className="w-full bg-ctp-blue text-ctp-base hover:bg-ctp-blue/80"
                                asChild
                                onClick={() => setOpen(false)}
                           >
                               <Link to="/admin">Review in Admin</Link>
                           </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </AnimatedTabsContent>
          )}

          {unclaimedRunsCount > 0 && (
             <AnimatedTabsContent value="unclaimed" className="m-0">
                <div className="p-4 flex flex-col items-center text-center">
                    <p className="mb-4 text-sm">You have {unclaimedRunsCount} unclaimed run(s) imported from Speedrun.com.</p>
                    <Button 
                        variant="default" 
                        className="w-full bg-ctp-green text-ctp-base hover:bg-ctp-green/80"
                        asChild
                        onClick={() => setOpen(false)}
                    >
                        <Link to="/settings">Go to Settings to Claim</Link>
                    </Button>
                </div>
             </AnimatedTabsContent>
          )}

        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

