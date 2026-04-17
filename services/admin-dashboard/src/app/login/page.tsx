"use client";

import { useActionState, useEffect } from "react";
import { Building2 } from "lucide-react";
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
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left panel — Branding */}
      <div className="relative hidden bg-zinc-900 lg:flex flex-col p-10 text-white dark:border-r">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center gap-2 font-medium text-lg">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </div>
          SCIRP+ Civic Command Center
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;We are not building a complaint system. We are building a
              real-time civic intelligence network that connects citizens, AI,
              and government into one decision-making loop.&rdquo;
            </p>
            <footer className="text-sm">Smart Civic Intelligence &amp; Resolution Platform</footer>
          </blockquote>
        </div>
      </div>

      {/* Right panel — Login / Register */}
      <div className="flex flex-col gap-4 p-6 md:p-10 justify-center items-center">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Government Officer Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage civic complaints and city intelligence
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form action={loginAction}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Officer Email</Label>
                    <Input
                      id="email"
                      name="email"
                      placeholder="officer@pmc.gov.in"
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                    />
                  </div>
                  <Button disabled={isLoginPending}>
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
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Officer Name"
                      type="text"
                      autoCapitalize="words"
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="register-email">Official Email</Label>
                    <Input
                      id="register-email"
                      name="email"
                      placeholder="officer@mcgm.gov.in"
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city">Municipality / City</Label>
                    <Select name="city" required>
                      <SelectTrigger>
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
                    <Label htmlFor="role">Role</Label>
                    <Select name="role" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="officer">Field Officer</SelectItem>
                        <SelectItem value="admin">Department Admin</SelectItem>
                        <SelectItem value="commissioner">Commissioner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button disabled={isSignupPending}>
                    {isSignupPending && (
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    )}
                    Register as Government Officer
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          <p className="px-8 text-center text-sm text-muted-foreground">
            By signing in, you agree to the{" "}
            <a href="/terms" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </a>
            . This portal is for authorized government officials only.
          </p>
        </div>
      </div>
    </div>
  );
}
