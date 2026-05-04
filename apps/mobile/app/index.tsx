import { Redirect } from "expo-router";
import { getAccessToken } from "@/lib/api";

export default function IndexRoute() {
  return <Redirect href={getAccessToken() ? "/(tabs)" : "/login"} />;
}
