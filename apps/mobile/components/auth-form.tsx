import { Image } from "expo-image";
import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ChefColors, ChefRadius } from "@/constants/chef-theme";

const appLogo = require("@/assets/images/chef-logo.png");

export function AuthForm({
  mode,
  name,
  email,
  password,
  error,
  loading,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  mode: "login" | "signup";
  name?: string;
  email: string;
  password: string;
  error?: string | null;
  loading: boolean;
  onNameChange?: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const isSignup = mode === "signup";
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.wrap}>
      <View>
        <View style={styles.brandRow}>
          <Image contentFit="cover" source={appLogo} style={styles.logo} />
          <Text style={styles.brand}>Butter me</Text>
        </View>
        <Text style={styles.title}>{isSignup ? "Create your account" : "Welcome back"}</Text>
        <Text style={styles.subtitle}>
          {isSignup
            ? "Save your taste memory and start planning meals."
            : "Sign in to continue cooking with your Butter me dashboard."}
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.form}>
        {isSignup ? (
          <TextInput
            autoCapitalize="words"
            onChangeText={onNameChange}
            placeholder="Name"
            placeholderTextColor={ChefColors.muted}
            style={styles.input}
            value={name}
          />
        ) : null}
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={onEmailChange}
          placeholder="Email"
          placeholderTextColor={ChefColors.muted}
          style={styles.input}
          value={email}
        />
        <View style={styles.passwordField}>
          <TextInput
            autoCapitalize="none"
            onChangeText={onPasswordChange}
            placeholder="Password"
            placeholderTextColor={ChefColors.muted}
            secureTextEntry={!showPassword}
            style={[styles.input, styles.passwordInput]}
            value={password}
          />
          <Pressable
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setShowPassword((value) => !value)}
            style={styles.passwordToggle}
          >
            <Text style={styles.passwordToggleText}>{showPassword ? "Hide" : "Show"}</Text>
          </Pressable>
        </View>
      </View>

      <Pressable disabled={loading} onPress={onSubmit} style={styles.primaryButton}>
        {loading ? <ActivityIndicator color="#fff" /> : null}
        <Text style={styles.primaryText}>{isSignup ? "Sign up" : "Sign in"}</Text>
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isSignup ? "Already have an account?" : "New to Butter me?"}
        </Text>
        <Link href={isSignup ? "/login" : "/signup"} asChild>
          <Pressable>
            <Text style={styles.footerLink}>{isSignup ? "Sign in" : "Create account"}</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: 24,
    justifyContent: "center",
    padding: 24,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  logo: {
    borderRadius: 12,
    height: 36,
    width: 36,
  },
  brand: {
    color: ChefColors.accent,
    fontSize: 24,
    fontWeight: "900",
  },
  title: {
    color: ChefColors.ink,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 0,
  },
  subtitle: {
    color: ChefColors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  error: {
    backgroundColor: "#ffe8e4",
    borderRadius: ChefRadius.sm,
    color: ChefColors.danger,
    padding: 12,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.md,
    borderWidth: 1,
    color: ChefColors.ink,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  passwordField: {
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 74,
  },
  passwordToggle: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 10,
    width: 54,
  },
  passwordToggleText: {
    color: ChefColors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: ChefColors.primary,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 16,
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
  },
  footerText: {
    color: ChefColors.muted,
  },
  footerLink: {
    color: ChefColors.primary,
    fontWeight: "900",
  },
});
