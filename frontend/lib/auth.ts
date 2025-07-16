import { supabase } from "./supabase";
import { cache } from "./indexdb";

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export class AuthService {
  async signUp({ email, password, firstName, lastName }: SignUpData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    console.log(data);
    console.log(error);

    if (error) throw error;

    return data;
  }

  async signIn({ email, password }: SignInData) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Cache user data
    if (data.user) {
      await cache.set(
        "current-user",
        {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at,
        },
        60
      ); // Cache for 1 hour
    }

    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clear cache
    await cache.clear();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    // Try cache first
    const cachedUser = await cache.get("current-user");
    if (cachedUser) {
      return cachedUser;
    }

    // Fallback to Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email!,
      created_at: user.created_at!,
    };

    // Cache the result
    await cache.set("current-user", authUser, 60);

    return authUser;
  }
}

export const authService = new AuthService();
