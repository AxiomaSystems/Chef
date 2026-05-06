import { router } from "expo-router";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthForm } from "@/components/auth-form";
import { ChefColors } from "@/constants/chef-theme";
import { signup } from "@/lib/api";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email, and password are required.");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await signup({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace("/onboarding");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ChefColors.background }}>
      <AuthForm
        mode="signup"
        name={name}
        email={email}
        password={password}
        error={error}
        loading={loading}
        onNameChange={setName}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={submit}
      />
    </SafeAreaView>
  );
}
