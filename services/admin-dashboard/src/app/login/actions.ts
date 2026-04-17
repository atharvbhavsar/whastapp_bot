"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cities } from "@/lib/cities";

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function login(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/civic-dashboard");
}

export async function signup(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("name") as string;
  const citySlug = formData.get("city") as string;
  const role = formData.get("role") as string;

  if (!email || !password || !fullName || !citySlug || !role) {
    return { error: "All fields are required" };
  }

  // Validate city slug exists in the registry
  const city = cities.find((c) => c.slug === citySlug);
  if (!city) {
    return { error: "Invalid city selected" };
  }

  // Register the government officer with metadata
  // The database trigger handle_new_officer() will create the officer_profiles record
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        city_slug: citySlug,      // Maps to tenant slug in DB
        role,                     // officer | admin | commissioner
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
