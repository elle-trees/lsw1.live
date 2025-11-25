"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isDisplayNameAvailable, createPlayer } from "@/lib/db";
import { getErrorMessage } from "@/lib/errorUtils";
import { useTranslation } from "react-i18next";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [srcUsername, setSrcUsername] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate password strength
  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: t("auth.passwordTooShort") };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: t("auth.passwordNoUppercase") };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: t("auth.passwordNoLowercase") };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: t("auth.passwordNoNumber") };
    }
    return { valid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email format
    if (!validateEmail(email.trim())) {
      toast({
        title: t("auth.invalidEmail"),
        description: t("auth.invalidEmailMessage"),
        variant: "destructive",
      });
      return;
    }

    // Validate password on signup
    if (!isLogin) {
      // Validate display name
      const trimmedDisplayName = displayName.trim();
      if (!trimmedDisplayName) {
        toast({
          title: t("auth.displayNameRequired"),
          description: t("auth.displayNameRequired"),
          variant: "destructive",
        });
        return;
      }

      if (trimmedDisplayName.length < 2) {
        toast({
          title: t("auth.displayNameTooShort"),
          description: t("auth.displayNameTooShort"),
          variant: "destructive",
        });
        return;
      }

      if (trimmedDisplayName.length > 50) {
        toast({
          title: t("auth.displayNameTooLong"),
          description: t("auth.displayNameTooLong"),
          variant: "destructive",
        });
        return;
      }

      // Check if display name is available
      setLoading(true);
      try {
        const isAvailable = await isDisplayNameAvailable(trimmedDisplayName);
        if (!isAvailable) {
          toast({
            title: t("auth.displayNameTaken"),
            description: t("auth.displayNameTakenMessage"),
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      } catch (error) {
        toast({
          title: t("common.error"),
          description: t("auth.failedToCheckDisplayName"),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      setLoading(false);

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        toast({
          title: t("auth.passwordRequirementsNotMet"),
          description: passwordValidation.message,
          variant: "destructive",
        });
        return;
      }

      // Check password confirmation on signup
      if (password !== confirmPassword) {
        toast({
          title: t("auth.passwordMismatch"),
          description: t("auth.passwordMismatchMessage"),
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Add timeout to prevent hanging
      const authOperation = isLogin 
        ? signInWithEmailAndPassword(auth, email.trim(), password)
        : createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // Race the auth operation against a timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(t("auth.authenticationTimeout")));
        }, 10000);
      });

      const userCredential = await Promise.race([authOperation, timeoutPromise]);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // If signup, create player document in Firestore immediately
      // This ensures all user data is stored securely in Firestore, not in localStorage
      if (!isLogin && userCredential && 'user' in userCredential) {
        const user = userCredential.user;
        
        // Update Firebase Auth profile with display name
        if (displayName.trim()) {
          await updateProfile(user, { displayName: displayName.trim() });
        }
        
        // Create player document in Firestore immediately
        // This is the secure, dynamic way to store user data
        const today = new Date().toISOString().split('T')[0];
        try {
          await createPlayer({
            id: user.uid,
            uid: user.uid,
            displayName: displayName.trim(),
            email: user.email || "",
            joinDate: today,
            totalRuns: 0,
            bestRank: null,
            favoriteCategory: null,
            favoritePlatform: null,
            nameColor: "#cba6f7",
            isAdmin: false,
            srcUsername: srcUsername.trim() || undefined,
          });
        } catch (error) {
          // Silent fail - AuthProvider will handle creation if this fails
        }
      }
      
      toast({
        title: t("common.success"),
        description: isLogin ? t("auth.youHaveBeenLoggedIn") : t("auth.accountCreatedSuccessfully"),
      });
      // Reset form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setDisplayName("");
      setSrcUsername("");
      onOpenChange(false);
    } catch (error) {
      const errorMessage = getErrorMessage(error, t("errors.generic"));
      
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        title: t("common.error"),
        description: t("auth.pleaseEnterEmail"),
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email.trim())) {
      toast({
        title: t("auth.invalidEmail"),
        description: t("auth.invalidEmailMessage"),
        variant: "destructive",
      });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      // Always show success message to prevent user enumeration
      toast({
        title: t("auth.passwordResetEmailSent"),
        description: t("auth.passwordResetEmailSentMessage"),
      });
    } catch (error) {
      // Always show success message to prevent user enumeration
      toast({
        title: t("auth.passwordResetEmailSent"),
        description: t("auth.passwordResetEmailSentMessage"),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]">
        <DialogHeader>
          <DialogTitle className="text-[hsl(220,17%,92%)]">
            {isLogin ? t("auth.login") : t("auth.signup")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-[hsl(220,17%,92%)]">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)] text-[hsl(220,17%,92%)]"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-[hsl(220,17%,92%)]">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)] text-[hsl(220,17%,92%)]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-[#cba6f7] hover:bg-[#b4a0e2] text-[hsl(240,21%,15%)] font-bold"
            >
              {loading ? t("auth.processing") : (isLogin ? t("auth.login") : t("auth.signup"))}
            </Button>
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="displayName" className="text-[hsl(220,17%,92%)]">
                    {t("auth.displayName")} <span className="text-[#fab387]">*</span>
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder={t("auth.displayName")}
                    maxLength={50}
                    className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)] text-[hsl(220,17%,92%)]"
                  />
                  <p className="text-xs text-[hsl(222,15%,60%)] mt-1">
                    {t("auth.displayNameDescription")}
                  </p>
                </div>
                <div>
                  <Label htmlFor="srcUsername" className="text-[hsl(220,17%,92%)]">
                    {t("auth.srcUsername")} <span className="text-[#fab387] text-xs">{t("auth.recommended")}</span>
                  </Label>
                  <Input
                    id="srcUsername"
                    type="text"
                    value={srcUsername}
                    onChange={(e) => setSrcUsername(e.target.value)}
                    placeholder={t("auth.srcUsername")}
                    maxLength={50}
                    className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)] text-[hsl(220,17%,92%)]"
                  />
                  <p className="text-xs text-[#fab387] mt-1 font-medium">
                    💡 {t("auth.srcUsernameOptional")}
                  </p>
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-[hsl(220,17%,92%)]">{t("auth.confirmPassword")}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!isLogin}
                    className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)] text-[hsl(220,17%,92%)]"
                  />
                  <p className="text-xs text-[hsl(222,15%,60%)] mt-1">
                    {t("auth.passwordTooShort")}
                  </p>
                </div>
              </>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsLogin(!isLogin);
                setPassword("");
                setConfirmPassword("");
                setDisplayName("");
                setSrcUsername("");
              }}
              className="text-[hsl(220,17%,92%)] border-[hsl(235,13%,30%)] hover:bg-[hsl(234,14%,29%)]"
            >
              {isLogin ? `${t("auth.dontHaveAccount")} ${t("auth.switchToSignup")}` : `${t("auth.alreadyHaveAccount")} ${t("auth.switchToLogin")}`}
            </Button>
            {isLogin && (
              <Button
                type="button"
                variant="ghost"
                onClick={handlePasswordReset}
                className="text-[hsl(222,15%,60%)] hover:text-[hsl(220,17%,92%)]"
              >
                {t("auth.forgotPassword")}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}