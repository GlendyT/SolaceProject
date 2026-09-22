import "dotenv/config";
import { runMigrations } from "../src/server/db/migrate";

runMigrations()
  .then(() => console.log("PostgreSQL migrations applied successfully."))
  .catch((error: unknown) => {
    console.error("PostgreSQL migrations failed.", error);
    process.exitCode = 1;
  });
