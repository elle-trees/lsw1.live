import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GameDetails, GameLink } from "@/types/database";
import { getGameDetails, updateGameDetails } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export function GameDetailsEditor() {
  const [details, setDetails] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDetails();
  }, []);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const data = await getGameDetails();
      setDetails(data);
    } catch (error) {
      console.error("Failed to fetch game details", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!details) return;
    setSaving(true);
    try {
      const success = await updateGameDetails(details);
      if (success) {
        toast({ title: "Success", description: "Game details updated successfully." });
      } else {
        toast({ title: "Error", description: "Failed to update game details.", variant: "destructive" });
      }
    } catch (error) {
        toast({ title: "Error", description: "Failed to update game details.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof GameDetails, value: any) => {
    if (!details) return;
    setDetails({ ...details, [field]: value });
  };

  const updateButton = (index: number, field: keyof GameLink, value: any) => {
    if (!details) return;
    const newButtons = [...details.buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setDetails({ ...details, buttons: newButtons });
  };

  const addButton = () => {
    if (!details) return;
    const newButton: GameLink = {
      id: crypto.randomUUID(),
      label: "New Button",
      url: "/",
      order: details.buttons.length
    };
    setDetails({ ...details, buttons: [...details.buttons, newButton] });
  };

  const removeButton = (index: number) => {
    if (!details) return;
    const newButtons = details.buttons.filter((_, i) => i !== index);
    setDetails({ ...details, buttons: newButtons });
  };

    const moveButton = (index: number, direction: 'up' | 'down') => {
        if (!details) return;
        const newButtons = [...details.buttons];
        if (direction === 'up' && index > 0) {
            [newButtons[index], newButtons[index - 1]] = [newButtons[index - 1], newButtons[index]];
        } else if (direction === 'down' && index < newButtons.length - 1) {
            [newButtons[index], newButtons[index + 1]] = [newButtons[index + 1], newButtons[index]];
        }
        // Update orders
        newButtons.forEach((btn, i) => btn.order = i);
        setDetails({ ...details, buttons: newButtons });
    };

  if (loading) return <div>Loading...</div>;
  if (!details) return <div>Error loading game details</div>;

  return (
    <div className="space-y-6">
      <Card className="border-ctp-surface1 bg-ctp-base/50">
        <CardHeader>
          <CardTitle className="text-ctp-text">General Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-ctp-text">Title</Label>
            <Input 
                value={details.title} 
                onChange={(e) => updateField('title', e.target.value)}
                className="bg-ctp-surface0 border-ctp-surface1 text-ctp-text"
            />
          </div>
          <div>
            <Label className="text-ctp-text">Description</Label>
            <Textarea 
                value={details.description} 
                onChange={(e) => updateField('description', e.target.value)} 
                rows={4}
                className="bg-ctp-surface0 border-ctp-surface1 text-ctp-text"
            />
          </div>
          <div>
            <Label className="text-ctp-text">Cover Image URL</Label>
            <Input 
                value={details.coverImage} 
                onChange={(e) => updateField('coverImage', e.target.value)} 
                className="bg-ctp-surface0 border-ctp-surface1 text-ctp-text"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-ctp-surface1 bg-ctp-base/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-ctp-text">Buttons</CardTitle>
          <Button onClick={addButton} size="sm" variant="outline" className="border-ctp-surface1 text-ctp-text hover:bg-ctp-surface1">
            <Plus className="h-4 w-4 mr-2" /> Add Button
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {details.buttons
            .sort((a, b) => a.order - b.order)
            .map((button, index) => (
            <div key={button.id} className="flex items-start gap-4 p-4 border border-ctp-surface1 rounded-lg bg-ctp-surface0/30">
                <div className="grid gap-2 flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-ctp-text">Label</Label>
                            <Input 
                                value={button.label} 
                                onChange={(e) => updateButton(index, 'label', e.target.value)} 
                                className="bg-ctp-base border-ctp-surface1 text-ctp-text"
                            />
                        </div>
                        <div>
                            <Label className="text-ctp-text">URL</Label>
                            <Input 
                                value={button.url} 
                                onChange={(e) => updateButton(index, 'url', e.target.value)} 
                                className="bg-ctp-base border-ctp-surface1 text-ctp-text"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-1 mt-6 sm:mt-0 sm:pt-6">
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => moveButton(index, 'up')} disabled={index === 0} className="h-8 w-8 text-ctp-text hover:bg-ctp-surface1">
                            <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => moveButton(index, 'down')} disabled={index === details.buttons.length - 1} className="h-8 w-8 text-ctp-text hover:bg-ctp-surface1">
                            <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeButton(index)} className="h-8 w-8 text-ctp-red hover:bg-ctp-red/10 hover:text-ctp-red">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
          ))}
          {details.buttons.length === 0 && (
            <div className="text-center py-4 text-ctp-subtext1">
                No buttons added yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full bg-ctp-green hover:bg-ctp-green/90 text-ctp-base font-bold">
        {saving ? "Saving..." : "Save Changes"}
        <Save className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

