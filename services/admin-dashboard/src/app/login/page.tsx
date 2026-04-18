"use client";

import { useActionState, useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cities } from "@/lib/cities";
import { login, signup, type AuthState } from "./actions";
import { toast } from "sonner";

export default function LoginPage() {
  const [loginState, loginAction, isLoginPending] = useActionState<
    AuthState,
    FormData
  >(login, {});
  const [signupState, signupAction, isSignupPending] = useActionState<
    AuthState,
    FormData
  >(signup, {});

  useEffect(() => {
    if (signupState.success) {
      toast.success("Account created!", {
        description: "Please check your email to verify your account.",
      });
    }
    if (signupState.error) {
      toast.error("Registration failed", { description: signupState.error });
    }
  }, [signupState]);

  useEffect(() => {
    if (loginState.error) {
      toast.error("Login failed", { description: loginState.error });
    }
  }, [loginState]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-md space-y-8 bg-card p-10 rounded-xl border border-border shadow-md">
        
        <div className="flex flex-col space-y-2 text-center">
          <div className="flex items-center justify-center gap-2 mb-2 font-bold text-2xl font-serif text-primary">
            <ShieldAlert className="size-8 text-accent" />
            CivicPulse
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-serif text-primary">
            Authority Portal
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage civic complaints and city intelligence
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary text-secondary-foreground mb-6">
            <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sign In</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Register</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <form action={loginAction}>
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-primary font-medium">Officer Email</Label>
                  <Input
                    id="email"
                    name="email"
                    placeholder="officer@pmc.gov.in"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    className="border-border focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-primary font-medium">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    className="border-border focus-visible:ring-primary"
                    required
                  />
                </div>
                <Button disabled={isLoginPending} className="w-full mt-2 bg-primary hover:bg-accent text-white font-medium">
                  {isLoginPending && (
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                  Sign In to Command Center
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <form action={signupAction}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-primary font-medium">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Officer Name"
                    type="text"
                    autoCapitalize="words"
                    autoComplete="name"
                    className="border-border focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="register-email" className="text-primary font-medium">Official Email</Label>
                  <Input
                    id="register-email"
                    name="email"
                    placeholder="officer@mcgm.gov.in"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    className="border-border focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="register-password" className="text-primary font-medium">Password</Label>
                  <Input
                    id="register-password"
                    name="password"
                    type="password"
                    className="border-border focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="city" className="text-primary font-medium">Municipality / City</Label>
                  <Select name="city" required>
                    <SelectTrigger className="border-border focus-visible:ring-primary">
                      <SelectValue placeholder="Select your city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.slug} value={city.slug}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role" className="text-primary font-medium">Role</Label>
                  <Select name="role" required>
                    <SelectTrigger className="border-border focus-visible:ring-primary">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="officer">Field Officer</SelectItem>
                      <SelectItem value="admin">Department Admin</SelectItem>
                      <SelectItem value="commissioner">Commissioner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button disabled={isSignupPending} className="w-full mt-2 bg-primary hover:bg-accent text-white font-medium">
                  {isSignupPending && (
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                  Register as Government Officer
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to the{" "}
          <a href="/terms" className="underline underline-offset-4 hover:text-accent">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline underline-offset-4 hover:text-accent">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
