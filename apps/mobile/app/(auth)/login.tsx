import { router } from "expo-router";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthForm } from "@/components/auth-form";
import { ChefColors } from "@/constants/chef-theme";
import { loadCurrentUser, login } from "@/lib/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await login({ email: email.trim().toLowerCase(), password });
    if (result.error) {
      setLoading(false);
      setError(result.error);
      return;
    }

    const me = await loadCurrentUser();
    setLoading(false);
    router.replace(me.data?.onboarding_completed_at ? "/(tabs)" : "/onboarding");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ChefColors.background }}>
      <AuthForm
        mode="login"
        email={email}
        password={password}
        error={error}
        loading={loading}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={submit}
      />
    </SafeAreaView>
  );
}
