"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getProfile,
  updateProfile,
  createProfile,
} from "@/lib/profile-service";
import { getPayments, addPayment, deletePayment } from "@/lib/payment-service";
import type { UserProfile, SavedPayment } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { authService } from "@/lib/auth";
import { useToast, toast } from "@/hooks/use-toast";

export default function ProfileSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [payments, setPayments] = useState<SavedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPayment, setNewPayment] = useState({
    cardNumber: "",
    expiry: "",
    cardName: "",
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    // Check if user still exists in Supabase
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        await authService.signOut();
        router.push("/auth/login");
        return;
      }
    })();
    setLoading(true);
    Promise.all([getProfile(user.id), getPayments(user.id)])
      .then(([profileData, paymentData]) => {
        setProfile(profileData ? { ...profileData, email: user.email } : null);
        setPayments(paymentData || []);
      })
      .catch(() => setError("Failed to load profile or payments"))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  // Save profile field locally on change
  const handleProfileFieldChange = (
    field: keyof UserProfile,
    value: string
  ) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  // Save profile to server when Save button is clicked
  const handleProfileSave = async () => {
    if (!user || !profile) return;
    setLoading(true);
    try {
      await updateProfile(user.id, profile);
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch {
      setError("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // Cancel changes and revert to last saved profile
  const handleProfileCancel = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profileData = await getProfile(user.id);
      setProfile(profileData ? { ...profileData, email: user.email } : null);
    } catch {
      setError("Failed to reload profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!user) return;
    setPaymentError(null);
    // Card number: only digits, 13-19 digits
    const cardNumber = newPayment.cardNumber.replace(/\s+/g, "");
    if (!/^\d{13,19}$/.test(cardNumber)) {
      setPaymentError(
        "Card number must be 13-19 digits and contain only numbers."
      );
      return;
    }
    // Expiry: MM/YY, not in the past
    if (!/^\d{2}\/\d{2}$/.test(newPayment.expiry)) {
      setPaymentError("Expiry must be in MM/YY format.");
      return;
    }
    const [expMonth, expYear] = newPayment.expiry.split("/").map(Number);
    if (expMonth < 1 || expMonth > 12) {
      setPaymentError("Expiry month must be between 01 and 12.");
      return;
    }
    // Check expiry is not in the past
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    if (
      expYear < currentYear ||
      (expYear === currentYear && expMonth < currentMonth)
    ) {
      setPaymentError("Card expiry cannot be in the past.");
      return;
    }
    // Name on card: not empty
    if (!newPayment.cardName.trim()) {
      setPaymentError("Name on card is required.");
      return;
    }
    setLoading(true);
    try {
      const card_last4 = cardNumber.slice(-4);
      const card_expiry = newPayment.expiry;
      const card_name = newPayment.cardName;
      await addPayment(user.id, { card_last4, card_expiry, card_name });
      const updated = await getPayments(user.id);
      setPayments(updated);
      setNewPayment({ cardNumber: "", expiry: "", cardName: "" });
    } catch {
      setError("Failed to add payment");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await deletePayment(id, user.id);
      setPayments(payments.filter((p) => p.id !== id));
    } catch {
      setError("Failed to delete payment");
    } finally {
      setLoading(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for max attribute
  const today = new Date().toISOString().split("T")[0];

  if (authLoading || loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }
  if (!user || !profile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>
        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProfileSave();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">First Name</label>
                  <Input
                    value={profile.first_name || ""}
                    onChange={(e) =>
                      handleProfileFieldChange("first_name", e.target.value)
                    }
                    disabled={false}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Last Name</label>
                  <Input
                    value={profile.last_name || ""}
                    onChange={(e) =>
                      handleProfileFieldChange("last_name", e.target.value)
                    }
                    disabled={false}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">Phone</label>
                  <Input
                    value={profile.phone || ""}
                    onChange={(e) =>
                      handleProfileFieldChange("phone", e.target.value)
                    }
                    disabled={false}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">
                    Date of Birth
                  </label>
                  <Input
                    type="date"
                    value={profile.date_of_birth || ""}
                    onChange={(e) =>
                      handleProfileFieldChange("date_of_birth", e.target.value)
                    }
                    disabled={false}
                    max={today}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">
                    Passport Number
                  </label>
                  <Input
                    value={profile.passport_number || ""}
                    onChange={(e) =>
                      handleProfileFieldChange(
                        "passport_number",
                        e.target.value
                      )
                    }
                    disabled={false}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Nationality</label>
                  <Input
                    value={profile.nationality || ""}
                    onChange={(e) =>
                      handleProfileFieldChange("nationality", e.target.value)
                    }
                    disabled={false}
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Email</label>
                <Input value={profile.email || user.email} disabled />
              </div>
              <div className="flex space-x-2">
                <Button type="submit">Save</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleProfileCancel}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saved Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="mb-4">
              {payments.length === 0 && (
                <li className="text-muted-foreground">No saved payments.</li>
              )}
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between mb-2"
                >
                  <span>
                    Card: **** **** **** {p.card_last4} (Exp: {p.card_expiry})
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeletePayment(p.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddPayment();
              }}
              className="flex space-x-2"
              autoComplete="off"
            >
              <Input
                placeholder="Card Number"
                value={newPayment.cardNumber}
                onChange={(e) => {
                  let onlyNums = e.target.value.replace(/[^\d]/g, "");
                  if (onlyNums.length > 19) {
                    onlyNums = onlyNums.slice(0, 19);
                  }
                  setNewPayment({ ...newPayment, cardNumber: onlyNums });
                }}
                required
                inputMode="numeric"
                pattern="\d{13,19}"
                maxLength={19}
                autoComplete="off"
              />
              <Input
                placeholder="MM/YY"
                value={newPayment.expiry}
                onChange={(e) =>
                  setNewPayment({ ...newPayment, expiry: e.target.value })
                }
                required
                pattern="\d{2}/\d{2}"
                autoComplete="off"
              />
              <Input
                placeholder="Name on Card"
                value={newPayment.cardName}
                onChange={(e) =>
                  setNewPayment({ ...newPayment, cardName: e.target.value })
                }
                required
                autoComplete="off"
              />
              <Button type="submit">Add</Button>
            </form>
            {paymentError && (
              <div className="text-red-500 text-sm mt-2">{paymentError}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
