/**
 * Email Prompt Component
 * Shows an email input form when user first opens the widget
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader } from "@/components/ui/loader";

interface EmailPromptProps {
  onSubmit: (email: string) => Promise<void>;
  onSkip?: () => void;
}

export function EmailPrompt({ onSubmit, onSkip }: EmailPromptProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit(trimmedEmail);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full p-4 bg-background/50">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">Welcome! 👋</CardTitle>
          <CardDescription className="text-sm">
            Enter your email to save your conversation history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                className="h-10"
                autoFocus
                autoComplete="email"
              />
              {error && (
                <p className="text-xs text-destructive mt-1">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10"
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? (
                <>
                  <Loader size="sm" className="mr-2" />
                  Connecting...
                </>
              ) : (
                "Continue"
              )}
            </Button>

            {onSkip && (
              <Button
                type="button"
                variant="ghost"
                className="w-full h-9 text-sm text-muted-foreground"
                onClick={onSkip}
                disabled={isLoading}
              >
                Skip for now
              </Button>
            )}
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Your email helps us save your chat history for future visits
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
