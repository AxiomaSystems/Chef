import { redactUrlLikeContent, runBackupWorker } from "./backup.mjs";

runBackupWorker().then(
  () => process.exit(0),
  (error) => {
    console.error(redactUrlLikeContent(error instanceof Error ? error.message : "Backup failed."));
    process.exit(1);
  },
);
