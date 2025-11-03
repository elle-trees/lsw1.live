import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Gamepad2, Timer, User, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { addLeaderboardEntry, getCategories, getPlatforms, runTypes, getPlayerByUsername } from "@/lib/db";
import { useNavigate } from "react-router-dom";

const SubmitRun = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string }[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<{ id: string; name: string }[]>([]);
  
  const [formData, setFormData] = useState({
    playerName: currentUser?.displayName || "",
    player2Name: "", // New state for player2Name
    category: "",
    platform: "",
    runType: "",
    time: "",
    videoUrl: "",
    comment: "",
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedCategories, fetchedPlatforms] = await Promise.all([
          getCategories(),
          getPlatforms()
        ]);
        setAvailableCategories(fetchedCategories);
        setAvailablePlatforms(fetchedPlatforms);
      } catch (error) {
        // Silent fail
      }
    };
    
    fetchData();
  }, []);

  // Update playerName when currentUser loads (if field is still empty)
  // For non-admins, always set to current user's name and lock it
  useEffect(() => {
    if (currentUser?.displayName) {
      setFormData(prev => {
        // If not admin, always lock to current user's name
        if (!currentUser.isAdmin) {
          return { ...prev, playerName: currentUser.displayName || "" };
        }
        // For admins, only update if the field is empty or still has the old email-based default
        if (!prev.playerName || prev.playerName === currentUser.email?.split('@')[0]) {
          return { ...prev, playerName: currentUser.displayName || "" };
        }
        return prev;
      });
    }
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Prevent non-admins from changing player name
    if (name === "playerName" && !currentUser?.isAdmin) {
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit a run.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.playerName || !formData.playerName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your player name.",
        variant: "destructive",
      });
      return;
    }

    // For non-admin users, ensure they can only submit for themselves
    if (!currentUser.isAdmin) {
      const currentUserDisplayName = currentUser.displayName || currentUser.email?.split('@')[0] || "";
      if (formData.playerName.trim() !== currentUserDisplayName) {
        toast({
          title: "Invalid Player Name",
          description: "You can only submit runs for yourself. Please use your own player name.",
          variant: "destructive",
        });
        // Reset to current user's name
        setFormData(prev => ({ ...prev, playerName: currentUserDisplayName }));
        return;
      }
    }

    if (!formData.category || !formData.platform || !formData.runType || !formData.time) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (formData.runType === 'co-op' && !formData.player2Name) {
      toast({
        title: "Missing Information",
        description: "Please enter the second player's name for co-op runs.",
        variant: "destructive",
      });
      return;
    }

    // Check if video is required for this category
    const selectedCategory = availableCategories.find(c => c.id === formData.category);
    const categoryName = selectedCategory?.name || "";
    const normalizedCategory = categoryName.toLowerCase().trim();
    const isNocutsNoships = normalizedCategory === "nocuts noships" || normalizedCategory === "nocutsnoships";
    
    // Video is required for all categories except Nocuts Noships
    if (!isNocutsNoships && (!formData.videoUrl || !formData.videoUrl.trim())) {
      toast({
        title: "Missing Information",
        description: "Video proof is required for this category.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Determine playerId based on whether admin is submitting for someone else
      let playerId = currentUser.uid;
      let finalPlayerName = formData.playerName.trim();
      
      // If admin is submitting for a different player, look up that player
      if (currentUser.isAdmin && formData.playerName.trim() !== (currentUser.displayName || currentUser.email?.split('@')[0] || "")) {
        const targetPlayer = await getPlayerByUsername(formData.playerName.trim());
        if (targetPlayer) {
          // Player exists, use their UID
          playerId = targetPlayer.uid;
          // Use the player's actual displayName from the database
          finalPlayerName = targetPlayer.displayName || formData.playerName.trim();
        } else {
          // Player doesn't exist - prevent submission to avoid assigning run to wrong account
          toast({
            title: "Player Not Found",
            description: `Player "${formData.playerName.trim()}" does not have an account. Please create the player account first, or use the Admin panel to add the run manually.`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }
      
      const entry: any = {
        playerId: playerId,
        playerName: finalPlayerName,
        category: formData.category,
        platform: formData.platform,
        runType: formData.runType as 'solo' | 'co-op',
        time: formData.time.trim(),
        date: new Date().toISOString().split('T')[0],
        verified: false,
      };
      
      // Only include player2Name for co-op runs with a valid value
      if (formData.runType === 'co-op' && formData.player2Name && formData.player2Name.trim()) {
        entry.player2Name = formData.player2Name.trim();
      }
      
      // Only include optional fields if they have values
      if (formData.videoUrl && formData.videoUrl.trim()) {
        entry.videoUrl = formData.videoUrl.trim();
      }
      
      if (formData.comment && formData.comment.trim()) {
        entry.comment = formData.comment.trim();
      }
      
      const result = await addLeaderboardEntry(entry);
      
      if (result) {
        toast({
          title: "Run Submitted",
          description: "Your run has been submitted successfully and is awaiting verification.",
        });
        navigate("/leaderboards");
      } else {
        throw new Error("Failed to submit run");
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Error",
        description: error.message || error.code || "Failed to submit run. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(240,21%,15%)] to-[hsl(235,19%,13%)] text-[hsl(220,17%,92%)] py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
            <Upload className="h-8 w-8 text-[#cba6f7]" />
            Submit Your Run
          </h1>
          <p className="text-[hsl(222,15%,60%)] max-w-2xl mx-auto">
            Share your LEGO Star Wars speedrun time with the community. Make sure to follow our submission guidelines!
          </p>
        </div>

        {!currentUser ? (
          <Card className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
              <p className="text-[hsl(222,15%,60%)] mb-6">
                Please log in to submit your run to the leaderboard.
              </p>
              <Button className="bg-[#cba6f7] hover:bg-[#b4a0e2] text-[hsl(240,21%,15%)] font-bold">
                Log In to Submit
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]">
            <CardHeader>
              <CardTitle>Run Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="playerName">Player 1 Name *</Label>
                    <Input
                      id="playerName"
                      name="playerName"
                      value={formData.playerName}
                      onChange={handleChange}
                      placeholder="Enter your username"
                      required
                      disabled={!currentUser?.isAdmin}
                      className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]"
                    />
                    {!currentUser?.isAdmin && (
                      <p className="text-xs text-[hsl(222,15%,60%)] mt-1">
                        You can only submit runs for yourself
                      </p>
                    )}
                  </div>
                  {formData.runType === 'co-op' && ( // Conditionally render player2Name
                    <div>
                      <Label htmlFor="player2Name">Player 2 Name *</Label>
                      <Input
                        id="player2Name"
                        name="player2Name"
                        value={formData.player2Name}
                        onChange={handleChange}
                        placeholder="Enter second player's username"
                        required
                        className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="time">Completion Time *</Label>
                    <div className="relative">
                      <Timer className="absolute left-3 top-3 h-4 w-4 text-[hsl(222,15%,60%)]" />
                      <Input
                        id="time"
                        name="time"
                        value={formData.time}
                        onChange={handleChange}
                        placeholder="HH:MM:SS"
                        required
                        className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)] pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => handleSelectChange("category", value)}>
                      <SelectTrigger className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="platform">Platform *</Label>
                    <Select value={formData.platform} onValueChange={(value) => handleSelectChange("platform", value)}>
                      <SelectTrigger className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                    <SelectContent>
                      {availablePlatforms.map((platform) => (
                        <SelectItem key={platform.id} value={platform.id}>
                          <div className="flex items-center gap-2">
                            <Gamepad2 className="h-4 w-4" />
                            {platform.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="runType">Run Type *</Label>
                  <Select value={formData.runType} onValueChange={(value) => handleSelectChange("runType", value)}>
                    <SelectTrigger className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]">
                      <SelectValue placeholder="Select run type" />
                    </SelectTrigger>
                    <SelectContent>
                      {runTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            {type.id === 'solo' ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  {(() => {
                    const selectedCategory = availableCategories.find(c => c.id === formData.category);
                    const categoryName = selectedCategory?.name || "";
                    const normalizedCategory = categoryName.toLowerCase().trim();
                    const isNocutsNoships = normalizedCategory === "nocuts noships" || normalizedCategory === "nocutsnoships";
                    const isVideoRequired = !isNocutsNoships;
                    
                    return (
                      <>
                        <Label htmlFor="videoUrl">Video Proof {isVideoRequired ? "*" : ""}</Label>
                        <Input
                          id="videoUrl"
                          name="videoUrl"
                          value={formData.videoUrl}
                          onChange={handleChange}
                          placeholder="https://youtube.com/watch?v=..."
                          required={isVideoRequired}
                          className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]"
                        />
                        <p className="text-sm text-[hsl(222,15%,60%)] mt-1">
                          {isNocutsNoships 
                            ? "Video proof is optional for Nocuts Noships runs, but recommended."
                            : "Upload your run to YouTube or Twitch and provide the link for verification"
                          }
                        </p>
                      </>
                    );
                  })()}
                </div>

                <div>
                  <Label htmlFor="comment">Run Comment</Label>
                  <Textarea
                    id="comment"
                    name="comment"
                    value={formData.comment}
                    onChange={handleChange}
                    placeholder="Add a comment about your run (optional)..."
                    className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]"
                    rows={4}
                  />
                  <p className="text-sm text-[hsl(222,15%,60%)] mt-1">
                    Share any details about your run, strategies, or highlights
                  </p>
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-[#cba6f7] hover:bg-[#b4a0e2] text-[hsl(240,21%,15%)] font-bold py-6"
                  >
                    {loading ? "Submitting..." : "Submit Run for Review"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)] mt-8">
          <CardHeader>
            <CardTitle>Submission Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 text-[hsl(222,15%,60%)]">
              <div>
                <h3 className="text-lg font-semibold text-[hsl(220,17%,92%)] mb-2">1. Game Rules</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Time starts when you select "New Game".</li>
                  <li>Time ends when you lose control of your character in the last completed episode.</li>
                  <li>Using codes in the diner is not allowed.</li>
                  <li>Runs must be single segment.</li>
                  <li>Runs done with a USB loader are prohibited.</li>
                  <li>Runs using Swiss to launch the game are allowed.</li>
                  <li>Runs using the debug menu to manipulate gameplay are prohibited.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[hsl(220,17%,92%)] mb-2">2. Video Rules</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Runs must have video proof with game audio.</li>
                  <li><strong>Nocuts Noships</strong> runs do not require video proof (video is optional but recommended).</li>
                  <li>Twitch VODs or highlights will not be accepted as video proof.</li>
                  <li>All runs must be done RTA; the timer may not be paused during the run.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[hsl(220,17%,92%)] mb-2">3. Emulator Rules</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Runs on Dolphin emulator must use version 5.0 or later.</li>
                  <li>"Speed Up Disc Transfer Rate" must be turned off.</li>
                  <li>"CPU Clock Override" must be set to 100%.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[hsl(220,17%,92%)] mb-2">4. PC Rules</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>FPS must be capped at 60.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[hsl(220,17%,92%)] mb-2">5. Solo Rules</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>One player, the number of controllers used does not matter.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubmitRun;