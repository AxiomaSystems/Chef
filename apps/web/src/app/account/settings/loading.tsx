import { LoadingState } from "@/components/ui/loading-state";

export default function AccountSettingsLoading() {
  return (
    <LoadingState
      title="Loading account settings"
      detail="Getting your profile, preferences, checkout details, and security options."
      steps={[
        "Loading profile",
        "Checking preferences",
        "Preparing account forms",
      ]}
      shell={false}
    />
  );
}
