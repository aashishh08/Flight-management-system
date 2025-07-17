"use client";
import { useAuth } from "@/components/auth-provider";
import { getProfile } from "@/lib/profile-service";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserProfile } from "@/lib/types";

export default function AdminRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      setProfileLoading(true);
      getProfile(user.id)
        .then(setProfile)
        .catch((e) => setProfileError(e.message))
        .finally(() => setProfileLoading(false));
    } else if (!loading && !user) {
      setProfileLoading(false);
    }
  }, [user, loading]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
    } else if (!profileLoading && profile && profile.role !== "admin") {
      router.replace("/"); // or a custom unauthorized page
    }
  }, [user, loading, profile, profileLoading, router]);

  if (loading || profileLoading) return <div>Loading...</div>;
  if (profileError) return <div className="text-red-500">{profileError}</div>;
  if (!user || !profile || profile.role !== "admin") return null;

  return <>{children}</>;
}
