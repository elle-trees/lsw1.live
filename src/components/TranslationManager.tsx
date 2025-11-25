import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { 
  getAllAdminTranslations, 
  setAdminTranslation, 
  deleteAdminTranslation 
} from "@/lib/data/firestore/translations";
import { mergeTranslations } from "@/lib/i18n/translation-service";
import { useAuth } from "@/components/AuthProvider";
import { Search, Save, Trash2, Edit2, X, Languages, Wand2 } from "lucide-react";
import i18n from "@/lib/i18n";
import { translateText as translateTextUtil } from "@/lib/i18n/auto-translate";
import { env } from "@/lib/env";

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "pt-BR", name: "Português (BR)" },
] as const;

/**
 * Flattens nested translation objects into dot-notation keys
 */
const flattenTranslations = (obj: Record<string, any>, prefix = ""): Record<string, string> => {
  const flattened: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenTranslations(value, newKey));
    } else {
      flattened[newKey] = String(value);
    }
  }
  
  return flattened;
};

/**
 * Gets all translation keys from static translations
 */
const getAllTranslationKeys = async (): Promise<string[]> => {
  const keys = new Set<string>();
  
  for (const lang of SUPPORTED_LANGUAGES) {
    try {
      let translations: Record<string, any> = {};
      switch (lang.code) {
        case "en":
          translations = (await import("@/locales/en")).default;
          break;
        case "es":
          translations = (await import("@/locales/es")).default;
          break;
        case "pt-BR":
          translations = (await import("@/locales/pt-BR")).default;
          break;
      }
      const flattened = flattenTranslations(translations);
      Object.keys(flattened).forEach(key => keys.add(key));
    } catch (error) {
      console.error(`Error loading translations for ${lang.code}:`, error);
    }
  }
  
  return Array.from(keys).sort();
};

export function TranslationManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [adminTranslations, setAdminTranslations] = useState<Record<string, Record<string, string>>>({});
  const [allKeys, setAllKeys] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoTranslating, setAutoTranslating] = useState<string | null>(null);
  const [autoTranslatingAll, setAutoTranslatingAll] = useState(false);

  // Load all translation keys and admin translations
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [staticKeys, translations] = await Promise.all([
          getAllTranslationKeys(),
          getAllAdminTranslations(),
        ]);
        
        // Combine static keys with admin translation keys
        // Admin translations might have keys that don't exist in static files
        const allKeysSet = new Set(staticKeys);
        Object.values(translations).forEach(langTranslations => {
          Object.keys(langTranslations).forEach(key => allKeysSet.add(key));
        });
        
        setAllKeys(Array.from(allKeysSet).sort());
        setAdminTranslations(translations);
      } catch (error) {
        console.error("Error loading translation data:", error);
        toast({
          title: t("common.error"),
          description: t("translationManager.failedToLoadTranslations"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [toast]);

  // Filter keys based on search query
  const filteredKeys = useMemo(() => {
    if (!searchQuery.trim()) return allKeys;
    const query = searchQuery.toLowerCase();
    return allKeys.filter(key => 
      key.toLowerCase().includes(query) ||
      (adminTranslations[selectedLanguage]?.[key]?.toLowerCase().includes(query)) ||
      (i18n.t(key, { lng: selectedLanguage })?.toLowerCase().includes(query))
    );
  }, [allKeys, searchQuery, selectedLanguage, adminTranslations]);

  // Get current value for a key (admin override or static)
  const getCurrentValue = (key: string): string => {
    // Check admin override first
    if (adminTranslations[selectedLanguage]?.[key]) {
      return adminTranslations[selectedLanguage][key];
    }
    // Try to get from i18n (might be in static translations or already merged)
    const translated = i18n.t(key, { lng: selectedLanguage });
    // If translation equals the key, it means it doesn't exist
    if (translated === key) {
      // For admin-only keys (like entity translations), return empty string
      return '';
    }
    return translated;
  };

  // Check if a key has an admin override
  const hasAdminOverride = (key: string): boolean => {
    return !!adminTranslations[selectedLanguage]?.[key];
  };

  // Handle save translation
  const handleSave = async () => {
    if (!editingKey || !editingKey.trim() || !editingValue.trim()) {
      toast({
        title: t("common.error"),
        description: t("translationManager.translationKeyAndValueRequired"),
        variant: "destructive",
      });
      return;
    }
    
    const trimmedKey = editingKey.trim();

    setSaving(true);
    try {
      await setAdminTranslation(
        trimmedKey,
        selectedLanguage,
        editingValue.trim(),
        currentUser?.uid
      );
      
      // Update local state
      setAdminTranslations(prev => ({
        ...prev,
        [selectedLanguage]: {
          ...prev[selectedLanguage],
          [trimmedKey]: editingValue.trim(),
        },
      }));
      
      // Add to allKeys if it's a new key
      if (!allKeys.includes(trimmedKey)) {
        setAllKeys(prev => [...prev, trimmedKey].sort());
      }
      
      // Update i18n resources immediately
      // Use mergeTranslations to properly handle nested keys
      const existingResources = i18n.getResourceBundle(selectedLanguage, 'translation') || {};
      const newTranslation = { [trimmedKey]: editingValue.trim() };
      const merged = mergeTranslations(existingResources, newTranslation);
      
      i18n.addResourceBundle(selectedLanguage, 'translation', merged, true, true);
      
      toast({
        title: t("common.success"),
        description: `${t("translationManager.translationSaved")} ${selectedLanguage}`,
      });
      
      setEditingKey(null);
      setEditingValue("");
    } catch (error) {
      console.error("Error saving translation:", error);
      toast({
        title: t("common.error"),
        description: t("translationManager.failedToSaveTranslation"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle delete translation (revert to static)
  const handleDelete = async (key: string) => {
    if (!confirm(`${t("translationManager.deleteAdminOverride")} "${key}"${t("translationManager.willRevertToStatic")}`)) {
      return;
    }

    try {
      await deleteAdminTranslation(key, selectedLanguage);
      
      // Update local state
      setAdminTranslations(prev => {
        const newTranslations = { ...prev };
        if (newTranslations[selectedLanguage]) {
          delete newTranslations[selectedLanguage][key];
        }
        return newTranslations;
      });
      
      // Reload the language to get static translation back
      const { loadLanguageTranslations, updateI18nResources } = await import("@/lib/i18n/translation-service");
      const resource = await loadLanguageTranslations(selectedLanguage);
      if (resource.translation) {
        updateI18nResources(selectedLanguage, resource.translation);
      }
      
      toast({
        title: t("common.success"),
        description: t("translationManager.translationReverted"),
      });
    } catch (error) {
      console.error("Error deleting translation:", error);
      toast({
        title: t("common.error"),
        description: t("translationManager.failedToDeleteTranslation"),
        variant: "destructive",
      });
    }
  };

  // Handle edit
  const handleEdit = (key: string) => {
    setEditingKey(key);
    setEditingValue(getCurrentValue(key));
  };

  // Use the shared translateText utility from auto-translate (react-auto-translate style)
  const translateText = translateTextUtil;

  // Handle auto-translate for a single key
  const handleAutoTranslate = async (key: string) => {
    if (selectedLanguage === 'en') {
      toast({
        title: t("common.error"),
        description: "Cannot auto-translate English to English.",
        variant: "destructive",
      });
      return;
    }

    setAutoTranslating(key);
    try {
      // Get English translation
      const englishText = i18n.t(key, { lng: 'en' });
      
      if (englishText === key) {
        toast({
          title: t("common.error"),
          description: "English translation not found for this key.",
          variant: "destructive",
        });
        setAutoTranslating(null);
        return;
      }

      // Translate
      const translated = await translateText(englishText, selectedLanguage);
      
      if (translated) {
        // If editing this key, update the form
        if (editingKey === key) {
          setEditingValue(translated);
        } else {
          // Save directly
          await setAdminTranslation(
            key,
            selectedLanguage,
            translated,
            currentUser?.uid
          );
          
          // Update local state
          setAdminTranslations(prev => ({
            ...prev,
            [selectedLanguage]: {
              ...prev[selectedLanguage],
              [key]: translated,
            },
          }));
          
          // Update i18n resources immediately
          i18n.addResourceBundle(selectedLanguage, 'translation', {
            [key]: translated,
          }, true, true);
        }
        
        toast({
          title: t("common.success"),
          description: t("translationManager.autoTranslateSuccess"),
        });
      } else {
        toast({
          title: t("common.error"),
          description: t("translationManager.autoTranslateError"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error auto-translating:", error);
      toast({
        title: t("common.error"),
        description: t("translationManager.autoTranslateError"),
        variant: "destructive",
      });
    } finally {
      setAutoTranslating(null);
    }
  };

  // Handle auto-translate all missing translations
  const handleAutoTranslateAll = async () => {
    if (selectedLanguage === 'en') {
      toast({
        title: t("common.error"),
        description: "Cannot auto-translate English to English.",
        variant: "destructive",
      });
      return;
    }

    if (!env.VITE_GOOGLE_TRANSLATE_API_KEY) {
      toast({
        title: t("common.error"),
        description: t("translationManager.missingApiKey"),
        variant: "destructive",
      });
      return;
    }

    setAutoTranslatingAll(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Find all keys that are missing translations
      const missingKeys = allKeys.filter(key => {
        const currentValue = getCurrentValue(key);
        const englishValue = i18n.t(key, { lng: 'en' });
        // Missing if current value is the key itself or same as English (meaning no translation exists)
        return currentValue === key || (currentValue === englishValue && englishValue !== key);
      });

      if (missingKeys.length === 0) {
        toast({
          title: t("common.success"),
          description: t("translationManager.noMissingTranslations"),
        });
        setAutoTranslatingAll(false);
        return;
      }

      // Translate each missing key
      for (const key of missingKeys) {
        try {
          const englishText = i18n.t(key, { lng: 'en' });
          
          if (englishText === key) continue; // Skip if English translation doesn't exist
          
          const translated = await translateText(englishText, selectedLanguage);
          
          if (translated) {
            await setAdminTranslation(
              key,
              selectedLanguage,
              translated,
              currentUser?.uid
            );
            
            // Update local state
            setAdminTranslations(prev => ({
              ...prev,
              [selectedLanguage]: {
                ...prev[selectedLanguage],
                [key]: translated,
              },
            }));
            
            // Update i18n resources immediately
            i18n.addResourceBundle(selectedLanguage, 'translation', {
              [key]: translated,
            }, true, true);
            
            successCount++;
          } else {
            errorCount++;
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error translating key ${key}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: t("common.success"),
          description: t("translationManager.autoTranslateAllSuccess").replace('{count}', successCount.toString()),
        });
      }
      
      if (errorCount > 0) {
        toast({
          title: t("common.error"),
          description: t("translationManager.autoTranslateAllError"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error auto-translating all:", error);
      toast({
        title: t("common.error"),
        description: t("translationManager.autoTranslateAllError"),
        variant: "destructive",
      });
    } finally {
      setAutoTranslatingAll(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">{t("translationManager.loadingTranslations")}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t("translationManager.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language Selector */}
          <div className="space-y-2">
            <Label>{t("translationManager.language")}</Label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {t("translationManager.changesOnlyAffectSelected")}
            </p>
            {selectedLanguage !== 'en' && (
              <Button
                onClick={handleAutoTranslateAll}
                disabled={autoTranslatingAll}
                variant="outline"
                className="w-full"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {autoTranslatingAll ? t("translationManager.autoTranslatingAll") : t("translationManager.autoTranslateAll")}
              </Button>
            )}
          </div>

          {/* Add New Key Button */}
          <Button
            onClick={() => {
              setEditingKey('');
              setEditingValue('');
            }}
            variant="outline"
            className="w-full"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            {t("translationManager.addNewTranslationKey")}
          </Button>

          {/* Search */}
          <div className="space-y-2">
            <Label>{t("translationManager.searchTranslations")}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("translationManager.searchByKeyOrValue")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Translations Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("translationManager.key")}</TableHead>
                  <TableHead>{t("translationManager.currentValue")}</TableHead>
                  <TableHead className="w-24">{t("translationManager.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      {t("translationManager.noTranslationsFound")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredKeys.map((key) => (
                    <TableRow key={key}>
                      <TableCell className="font-mono text-sm">{key}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-md">
                            {getCurrentValue(key) || <span className="text-muted-foreground italic">(no translation)</span>}
                          </span>
                          {hasAdminOverride(key) && (
                            <Badge variant="secondary" className="text-xs">
                              {t("translationManager.override")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(key)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {selectedLanguage !== 'en' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAutoTranslate(key)}
                              disabled={autoTranslating === key}
                              title={t("translationManager.autoTranslate")}
                            >
                              <Wand2 className={`h-4 w-4 ${autoTranslating === key ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                          {hasAdminOverride(key) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(key)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editingKey !== null} onOpenChange={(open) => {
        if (!open) {
          setEditingKey(null);
          setEditingValue("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingKey === '' ? t("translationManager.addNewTranslationKey") : t("translationManager.editTranslation")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("translationManager.key")}</Label>
              <Input 
                value={editingKey || ""} 
                disabled={editingKey !== ''}
                onChange={(e) => editingKey === '' && setEditingKey(e.target.value)}
                placeholder={t("translationManager.keyPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("translationManager.value")} ({selectedLanguage})</Label>
                {selectedLanguage !== 'en' && editingKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAutoTranslate(editingKey)}
                    disabled={autoTranslating === editingKey}
                  >
                    <Wand2 className={`h-4 w-4 mr-2 ${autoTranslating === editingKey ? 'animate-spin' : ''}`} />
                    {autoTranslating === editingKey ? t("translationManager.autoTranslating") : t("translationManager.autoTranslate")}
                  </Button>
                )}
              </div>
              <Textarea
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                rows={4}
                placeholder={t("translationManager.enterTranslation")}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {t("translationManager.thisChangeWillOnlyAffect")} {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name} {t("translationManager.languageSentence")}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingKey(null);
                setEditingValue("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving || !editingValue.trim()}>
              {saving ? t("translationManager.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

