"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, User, Trophy, CheckCircle, Upload, X, Sparkles, Gem, Users } from "lucide-react";
import { getCategoryName, getPlatformName, getLevelName } from "@/lib/dataValidation";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { updatePlayerProfile, getPlayerByUid, getUnclaimedRunsBySRCUsername, claimRun, getCategories, getPlatforms, getLevels, getCategoriesFromFirestore } from "@/lib/db";
import { updateEmail, updatePassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNavigate } from "@tanstack/react-router";
import { LeaderboardEntry } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";

const UserSettings = () => {
  const { t } = useTranslation();
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameColor, setNameColor] = useState("#cba6f7"); // Default color
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [bio, setBio] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [twitchUsername, setTwitchUsername] = useState("");
  const [srcUsername, setSrcUsername] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [unclaimedSRCRuns, setUnclaimedSRCRuns] = useState<LeaderboardEntry[]>([]);
  const [loadingSRCUnclaimed, setLoadingSRCUnclaimed] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>([]);
  const [levels, setLevels] = useState<{ id: string; name: string }[]>([]);
  const [unclaimedLeaderboardType, setUnclaimedLeaderboardType] = useState<'regular' | 'individual-level' | 'community-golds'>('regular');
  const { startUpload, isUploading } = useUploadThing("profilePicture");

  const fetchUnclaimedSRCRuns = useCallback(async (srcUsername: string) => {
    if (!srcUsername || !currentUser) return;
    setLoadingSRCUnclaimed(true);
    try {
      const runs = await getUnclaimedRunsBySRCUsername(srcUsername);
      const trulyUnclaimed = runs.filter(run => run.playerId !== currentUser.uid);
      setUnclaimedSRCRuns(trulyUnclaimed);
    } catch (_error) {
      // Silent fail
    } finally {
      setLoadingSRCUnclaimed(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        toast({
            title: t("settings.authenticationRequired"),
            description: t("settings.pleaseLoginToView"),
          variant: "destructive",
        });
        navigate({ to: '/' }); // Redirect to home or login
        return;
      }

      const fetchPlayerData = async () => {
        setPageLoading(true);
        try {
          // Fetch user data first - this is the critical part
          const player = await getPlayerByUid(currentUser.uid);
          if (player) {
            setDisplayName(player.displayName || currentUser.displayName || "");
            setEmail(player.email || currentUser.email || "");
            setNameColor(player.nameColor || "#cba6f7");
            setProfilePicture(player.profilePicture || "");
            setBio(player.bio || "");
            setPronouns(player.pronouns || "");
            setTwitchUsername(player.twitchUsername || "");
            setSrcUsername(player.srcUsername || "");
            // Check for unclaimed runs after loading player data
            if (player.srcUsername) {
              fetchUnclaimedSRCRuns(player.srcUsername);
            }
          } else {
            // If player doesn't exist in DB, use Firebase auth data
            setDisplayName(currentUser.displayName || "");
            setEmail(currentUser.email || "");
            setProfilePicture("");
            setBio("");
            setPronouns("");
            setTwitchUsername("");
          }

          // Fetch categories, platforms, and levels for displaying unclaimed runs
          // This is done separately so failures here don't prevent user data from loading
          try {
            const [_fetchedCategories, fetchedPlatforms, fetchedLevels, regularCategories, ilCategories, cgCategories] = await Promise.all([
              getCategories(),
              getPlatforms(),
              getLevels(),
              getCategoriesFromFirestore('regular'),
              getCategoriesFromFirestore('individual-level'),
              getCategoriesFromFirestore('community-golds'),
            ]);
            setCategories([...regularCategories, ...ilCategories, ...cgCategories]);
            setPlatforms(fetchedPlatforms);
            setLevels(fetchedLevels);
          } catch (_error) {
            // Silent fail for categories/platforms/levels - they're not critical for basic functionality
            // User can still edit their profile even if these fail to load
            console.warn("Failed to load categories/platforms/levels:", _error);
          }
        } catch (error) {
          // Only show error toast if the actual user data fetch fails
          console.error("Failed to load user data:", error);
          toast({
            title: t("common.error"),
            description: t("settings.failedToLoadUserData"),
            variant: "destructive",
          });
        } finally {
          setPageLoading(false);
        }
      };
      fetchPlayerData();
    }
  }, [currentUser, authLoading, navigate, toast, fetchUnclaimedSRCRuns]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Validate displayName
    if (!displayName || !displayName.trim()) {
      toast({
        title: t("settings.invalidDisplayName"),
        description: t("settings.pleaseEnterDisplayName"),
        variant: "destructive",
      });
      return;
    }

    try {
      // Update Firebase Auth profile if displayName changed
      // Use auth.currentUser instead of currentUser from context to ensure we have the actual Firebase User object
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error("No authenticated user found.");
      }
      
      const newDisplayName = displayName.trim();
      const currentDisplayName = currentUser.displayName || "";
      
      if (newDisplayName !== currentDisplayName) {
        await updateProfile(firebaseUser, { displayName: newDisplayName });
        // Reload the user to refresh auth state
        await firebaseUser.reload();
      }

      // Update Firestore player profile (creates document if it doesn't exist)
      // profilePicture: pass the value directly (empty string will delete, undefined will skip, URL will save)
      const profileData: any = {
        displayName: newDisplayName, 
        nameColor,
        email: currentUser.email || email || "",
        bio: bio.trim() || "",
        pronouns: pronouns.trim() || "",
        twitchUsername: twitchUsername.trim() || "",
        srcUsername: srcUsername.trim() || ""
      };
      
      // Only include profilePicture if it has a value (empty string will delete it)
      if (profilePicture !== undefined) {
        profileData.profilePicture = profilePicture;
      }
      
      const success = await updatePlayerProfile(currentUser.uid, profileData);
      
      // Also update Firebase Auth profile picture if it exists
      if (profilePicture && auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, {
            photoURL: profilePicture
          });
        } catch (_error) {
          // Don't fail the whole update if this fails
        }
      }

      if (!success) {
        throw new Error("Failed to save profile to database.");
      }

      // Refresh the page data to show updated info immediately
      // Fetch updated player data from Firestore
      const player = await getPlayerByUid(currentUser.uid);
      if (player) {
        // Update local state with the saved data
        setDisplayName(player.displayName || newDisplayName);
        setNameColor(player.nameColor || nameColor);
        setProfilePicture(player.profilePicture || "");
        setBio(player.bio || "");
        setPronouns(player.pronouns || "");
        setTwitchUsername(player.twitchUsername || "");
        setSrcUsername(player.srcUsername || "");
      } else {
        // Fallback to the new display name if player fetch fails
        setDisplayName(newDisplayName);
      }

      toast({
        title: t("settings.profileUpdated"),
        description: t("settings.profileSaved"),
        });
      
      // Refresh the auth context by manually triggering a refresh
      // The AuthProvider's refresh interval (every 3 seconds) will pick up the changes,
      // but we can also force an immediate refresh by reloading the page after a short delay
      // to ensure all components (like the header) show the updated display name
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      if (srcUsername.trim()) {
        fetchUnclaimedSRCRuns(srcUsername.trim());
      }
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("settings.failedToUpdateProfile"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (email === currentUser.email) {
      toast({
        title: t("settings.noChange"),
        description: t("settings.emailAlreadySame"),
      });
      return;
    }

    try {
      // Use auth.currentUser instead of currentUser from context
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error("No authenticated user found.");
      }
      
      await updateEmail(firebaseUser, email);
      await updatePlayerProfile(currentUser.uid, { email }); // Update in Firestore as well
      toast({
        title: t("settings.emailUpdated"),
        description: t("settings.emailUpdatedDescription"),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("settings.failedToUpdateEmail"),
        variant: "destructive",
      });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: t("settings.passwordMismatch"),
        description: t("settings.passwordsDoNotMatch"),
        variant: "destructive",
      });
      return;
    }

    // Enhanced password validation
    if (newPassword.length < 8) {
      toast({
        title: t("settings.passwordTooShort"),
        description: t("settings.passwordMinLength"),
        variant: "destructive",
      });
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      toast({
        title: t("settings.passwordRequirementsNotMet"),
        description: t("settings.passwordNeedsUppercase"),
        variant: "destructive",
      });
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      toast({
        title: t("settings.passwordRequirementsNotMet"),
        description: t("settings.passwordNeedsLowercase"),
        variant: "destructive",
      });
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      toast({
        title: t("settings.passwordRequirementsNotMet"),
        description: t("settings.passwordNeedsNumber"),
        variant: "destructive",
      });
      return;
    }

    try {
      // Use auth.currentUser instead of currentUser from context
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error("No authenticated user found.");
      }
      
      await updatePassword(firebaseUser, newPassword);
      toast({
        title: t("settings.passwordUpdated"),
        description: t("settings.passwordChangedSuccess"),
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("settings.failedToUpdatePassword"),
        variant: "destructive",
      });
    }
  };

  const handleClaimRun = async (runId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      const success = await claimRun(runId, currentUser.uid);
      if (success) {
        toast({
          title: t("player.runClaimed"),
          description: t("player.runLinkedToAccount"),
        });
        // Refresh unclaimed runs list
        if (srcUsername) {
          fetchUnclaimedSRCRuns(srcUsername);
        }
      } else {
        throw new Error("Failed to claim run.");
      }
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("player.failedToClaimRun"),
        variant: "destructive",
      });
    }
  };

  const handleClaimAllRuns = async () => {
    if (!currentUser?.uid || !srcUsername) return;
    
    try {
      // Use autoClaimRunsBySRCUsername which claims all matching runs
      const { autoClaimRunsBySRCUsername } = await import("@/lib/db");
      const claimedCount = await autoClaimRunsBySRCUsername(currentUser.uid, srcUsername);
      
      if (claimedCount > 0) {
        toast({
          title: t("settings.runsClaimed"),
          description: t("settings.successfullyClaimed", { count: claimedCount }),
        });
        // Refresh unclaimed runs list
        fetchUnclaimedSRCRuns(srcUsername);
      } else {
        toast({
          title: t("settings.noRunsToClaim"),
          description: t("settings.noUnclaimedRunsFound"),
        });
      }
    } catch (error: any) {
      toast({
          title: t("common.error"),
          description: error.message || t("settings.failedToClaimRun"),
        variant: "destructive",
      });
    }
  };

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(240,21%,15%)] to-[hsl(235,19%,13%)] text-ctp-text flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cba6f7]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1e2e] text-ctp-text py-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">

        {/* Profile Settings and Claim Runs - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Profile Information */}
          <Card className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-ctp-text">
                {t("settings.profile")}
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[calc(100vh-200px)] overflow-y-auto">
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <Label>{t("settings.profilePicture")}</Label>
                <div className="flex items-center gap-4 mb-2">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profilePicture || `https://api.dicebear.com/7.x/lorelei-neutral/svg?seed=${displayName}`} />
                    <AvatarFallback>{displayName.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;
                          
                          // Validate file size (4MB max)
                          if (file.size > 4 * 1024 * 1024) {
                            toast({
                              title: t("settings.fileTooLarge") || "File Too Large",
                              description: t("settings.profilePictureMaxSize") || "Profile picture must be less than 4MB.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Validate file type
                          if (!file.type.startsWith('image/')) {
                            toast({
                              title: t("settings.invalidFileType") || "Invalid File Type",
                              description: t("settings.pleaseUploadImage") || "Please upload an image file.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          try {
                            const uploadedFiles = await startUpload([file]);
                            if (uploadedFiles && uploadedFiles.length > 0) {
                              const fileUrl = uploadedFiles[0]?.url;
                              if (fileUrl) {
                                setProfilePicture(fileUrl);
                                toast({
                                  title: t("settings.profilePictureUploaded") || "Profile Picture Uploaded",
                                  description: t("settings.clickSaveToApply") || "Click 'Save Profile' to save your changes.",
                                });
                              }
                            }
                          } catch (error) {
                            toast({
                              title: t("settings.uploadFailed") || "Upload Failed",
                              description: t("settings.failedToUploadPicture") || "Failed to upload profile picture. Please try again.",
                              variant: "destructive",
                            });
                          }
                        };
                        input.click();
                      }}
                      disabled={isUploading}
                      className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)] hover:bg-[hsl(234,14%,29%)]"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? t("settings.uploading") || "Uploading..." : t("settings.upload")}
                    </Button>
                    {profilePicture && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setProfilePicture("");
                          toast({
                            title: t("settings.profilePictureRemoved") || "Profile Picture Removed",
                            description: t("settings.clickSaveToApply") || "Click 'Save Profile' to save your changes.",
                          });
                        }}
                        className="ml-2 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t("settings.remove")}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-ctp-overlay0 mt-1">
                  {t("settings.profilePictureInstructions") || "Upload a profile picture (max 4MB). Click \"Save Profile\" to apply changes."}
                </p>
              </div>
              <div>
                <Label htmlFor="displayName">{t("settings.displayName")}</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("settings.enterDisplayName") || "Enter your display name"}
                  className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]"
                  required
                />
                <p className="text-xs text-ctp-overlay0 mt-1">
                  {t("settings.displayNameDescription") || "Choose a display name that will be displayed on leaderboards and your profile."}
                </p>
              </div>
              <div>
                <Label htmlFor="nameColor">{t("settings.nameColor")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="nameColor"
                    type="color"
                    value={nameColor}
                    onChange={(e) => setNameColor(e.target.value)}
                    className="h-10 w-10 p-0 border-none cursor-pointer"
                    title="Choose your name color"
                  />
                  <Input
                    type="text"
                    value={nameColor}
                    onChange={(e) => setNameColor(e.target.value)}
                    placeholder="#cba6f7"
                    className="flex-grow bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]"
                  />
                </div>
                <p className="text-xs text-ctp-overlay0 mt-1">
                  {t("settings.nameColorDescription") || "This color will be used for your name on leaderboards."}
                </p>
              </div>
              <div>
                <Label htmlFor="pronouns">{t("settings.pronouns")}</Label>
                <Input
                  id="pronouns"
                  type="text"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  placeholder="e.g., they/them, he/him, she/her"
                  className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]"
                  maxLength={50}
                />
                <p className="text-xs text-ctp-overlay0 mt-1">
                  {t("settings.pronounsDescription")}
                </p>
              </div>
              <div>
                <Label htmlFor="bio">{t("settings.bio")}</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)] min-h-[60px]"
                  maxLength={500}
                  rows={3}
                />
                <p className="text-xs text-ctp-overlay0 mt-1">
                  {bio.length}/500 characters. Your bio will be displayed on your profile.
                </p>
              </div>
              <div>
                <Label htmlFor="twitchUsername">{t("settings.twitchUsername")}</Label>
                <Input
                  id="twitchUsername"
                  type="text"
                  value={twitchUsername}
                  onChange={(e) => setTwitchUsername(e.target.value)}
                  placeholder="e.g., lsw1live"
                  className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]"
                  maxLength={50}
                />
                <p className="text-xs text-ctp-overlay0 mt-1">
                  {t("settings.twitchUsernameDescription")}
                </p>
              </div>
              <div>
                <Label htmlFor="srcUsername">{t("settings.srcUsername")}</Label>
                <Input
                  id="srcUsername"
                  type="text"
                  value={srcUsername}
                  onChange={(e) => setSrcUsername(e.target.value)}
                  placeholder="e.g., YourSRCUsername"
                  className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]"
                  maxLength={50}
                />
                <p className="text-xs text-ctp-overlay0 mt-1">
                  {t("settings.srcUsernameDescription")}
                </p>
              </div>
              <Button type="submit" className="bg-[#cba6f7] hover:bg-[#b4a0e2] text-[hsl(240,21%,15%)] font-bold">
                {t("settings.saveProfile")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Claim Runs */}
        <Card className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-ctp-text">
              {t("settings.claimYourRuns")}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-200px)] overflow-y-auto">
            <p className="text-xs text-[hsl(222,15%,60%)] mb-3">
              {t("settings.claimRunsDescription")}
            </p>
            
            {/* SRC Username Runs */}
            {srcUsername && (
              <>
                <div className="flex items-center justify-between mb-3 mt-3">
                  <h3 className="text-xs font-semibold text-ctp-text">{t("settings.runsImportedFromSRC", { username: srcUsername })}</h3>
                  {unclaimedSRCRuns.length > 0 && (
                    <Button
                      onClick={handleClaimAllRuns}
                      className="bg-[#cba6f7] hover:bg-[#b4a0e2] text-[hsl(240,21%,15%)] font-bold"
                      disabled={loadingSRCUnclaimed}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t("settings.claimAllRuns")} ({unclaimedSRCRuns.length})
                    </Button>
                  )}
                </div>
                {loadingSRCUnclaimed ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cba6f7] mx-auto"></div>
                  </div>
                ) : unclaimedSRCRuns.length === 0 ? (
                  <p className="text-[hsl(222,15%,60%)] text-center py-4">
                    {t("settings.noUnclaimedRunsForSRC")}
                  </p>
                ) : (
                <>
                  <div className="grid grid-cols-3 mb-3 gap-1 bg-ctp-surface0/50 rounded-none border border-ctp-surface1 p-0.5">
                    <Button
                      variant={unclaimedLeaderboardType === 'regular' ? "default" : "ghost"}
                      onClick={() => setUnclaimedLeaderboardType('regular')}
                      className={`h-auto py-2 px-3 rounded-none transition-all duration-300 ${
                        unclaimedLeaderboardType === 'regular' 
                          ? "bg-[#f9e2af] text-[#11111b] hover:bg-[#f9e2af]/90 shadow-sm" 
                          : "text-ctp-text hover:bg-ctp-surface1 hover:text-ctp-text"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Trophy className="h-4 w-4" />
                        <span className="hidden sm:inline font-medium">Full Game</span>
                        <span className="sm:hidden font-medium">FG</span>
                      </div>
                    </Button>
                    <Button
                      variant={unclaimedLeaderboardType === 'individual-level' ? "default" : "ghost"}
                      onClick={() => setUnclaimedLeaderboardType('individual-level')}
                      className={`h-auto py-2 px-3 rounded-none transition-all duration-300 ${
                        unclaimedLeaderboardType === 'individual-level' 
                          ? "bg-[#f9e2af] text-[#11111b] hover:bg-[#f9e2af]/90 shadow-sm" 
                          : "text-ctp-text hover:bg-ctp-surface1 hover:text-ctp-text"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        <span className="hidden sm:inline font-medium">Individual Level</span>
                        <span className="sm:hidden font-medium">IL</span>
                      </div>
                    </Button>
                    <Button
                      variant={unclaimedLeaderboardType === 'community-golds' ? "default" : "ghost"}
                      onClick={() => setUnclaimedLeaderboardType('community-golds')}
                      className={`h-auto py-2 px-3 rounded-none transition-all duration-300 ${
                        unclaimedLeaderboardType === 'community-golds' 
                          ? "bg-[#f9e2af] text-[#11111b] hover:bg-[#f9e2af]/90 shadow-sm" 
                          : "text-ctp-text hover:bg-ctp-surface1 hover:text-ctp-text"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Gem className="h-4 w-4" />
                        <span className="hidden sm:inline font-medium">Community Golds</span>
                        <span className="sm:hidden font-medium">CGs</span>
                      </div>
                    </Button>
                  </div>

                  <div className="mt-0">
                      {(() => {
                        // Filter runs by leaderboard type
                        const filteredRuns = unclaimedSRCRuns.filter(run => {
                          const runLeaderboardType = run.leaderboardType || 'regular';
                          return runLeaderboardType === unclaimedLeaderboardType;
                        });

                        if (filteredRuns.length === 0) {
                          return (
                            <div className="text-center py-8">
                              <p className="text-ctp-overlay0">{t("settings.noUnclaimedRunsForType", { 
                                type: unclaimedLeaderboardType === 'regular' ? t("submit.fullGame") : 
                                      unclaimedLeaderboardType === 'individual-level' ? t("submit.individualLevels") : 
                                      t("submit.communityGolds")
                              })}</p>
                            </div>
                          );
                        }

                        return (
                          <div className="overflow-x-auto scrollbar-custom rounded-none">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-[hsl(235,13%,30%)]">
                                  <th className="py-3 px-4 text-left">{t("leaderboards.category")}</th>
                                  {unclaimedLeaderboardType !== 'regular' && (
                                    <th className="py-3 px-4 text-left">{t("leaderboards.level")}</th>
                                  )}
                                  <th className="py-3 px-4 text-left">{t("leaderboards.time")}</th>
                                  <th className="py-3 px-4 text-left">{t("leaderboards.date")}</th>
                                  <th className="py-3 px-4 text-left">{t("leaderboards.platform")}</th>
                                  <th className="py-3 px-4 text-left">{t("leaderboards.runType")}</th>
                                  <th className="py-3 px-4 text-left">{t("settings.action")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredRuns.map((run) => {
                                  const categoryName = getCategoryName(
                                    run.category,
                                    categories,
                                    run.srcCategoryName
                                  );
                                  const platformName = getPlatformName(
                                    run.platform,
                                    platforms,
                                    run.srcPlatformName
                                  );
                                  const levelName = unclaimedLeaderboardType !== 'regular' && run.level
                                    ? getLevelName(run.level, levels, run.srcLevelName)
                                    : undefined;

                                  return (
                                    <tr 
                                      key={run.id} 
                                      className="border-b border-[hsl(235,13%,30%)] hover:bg-[hsl(235,19%,13%)] transition-colors"
                                    >
                                      <td className="py-3 px-4 font-medium">{categoryName}</td>
                                      {unclaimedLeaderboardType !== 'regular' && (
                                        <td className="py-3 px-4 text-ctp-overlay0">
                                          {levelName || run.srcLevelName || '—'}
                                        </td>
                                      )}
                                      <td className="py-3 px-4 text-base font-semibold text-left">{formatTime(run.time)}</td>
                                      <td className="py-3 px-4 text-ctp-overlay0 text-left">{formatDate(run.date)}</td>
                                      <td className="py-3 px-4">
                                        <Badge variant="outline" className="border-[hsl(235,13%,30%)]">
                                          {platformName}
                                        </Badge>
                                      </td>
                                      <td className="py-3 px-4">
                                        <Badge variant="outline" className="border-[hsl(235,13%,30%)] flex items-center gap-1 w-fit">
                                          {run.runType === 'solo' ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                                          {run.runType.charAt(0).toUpperCase() + run.runType.slice(1)}
                                        </Badge>
                                      </td>
                                      <td className="py-3 px-4">
                                        <Button
                                          onClick={() => handleClaimRun(run.id)}
                                          size="sm"
                                          className="bg-[#cba6f7] hover:bg-[#b4a0e2] text-[hsl(240,21%,15%)] font-bold"
                                        >
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          {t("settings.claim")}
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                  </div>
                </>
                )}
              </>
            )}
            
            {!srcUsername && (
              <p className="text-[hsl(222,15%,60%)] text-center py-4">
                {t("settings.setSRCUsernameToFindRuns") || "Set your Speedrun.com username above to find unclaimed runs imported from Speedrun.com."}
              </p>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Email Settings */}
        <Card className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)] mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-ctp-text">
              {t("settings.changeEmail")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div>
                <Label htmlFor="email">{t("settings.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]"
                />
              </div>
              <Button type="submit" className="bg-[#cba6f7] hover:bg-[#b4a0e2] text-[hsl(240,21%,15%)] font-bold">
                {t("settings.update")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)] mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-ctp-text">
              {t("settings.changePassword")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]"
                />
                <p className="text-xs text-[hsl(222,15%,60%)] mt-1">
                  {t("settings.passwordRequirements") || "Password must be at least 8 characters with uppercase, lowercase, and a number."}
                </p>
              </div>
              <div>
                <Label htmlFor="confirmPassword">{t("settings.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]"
                />
              </div>
              <Button type="submit" className="bg-[#cba6f7] hover:bg-[#b4a0e2] text-[hsl(240,21%,15%)] font-bold">
                {t("settings.update")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserSettings;