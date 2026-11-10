import { connect } from "./_db";
import { runMigrations } from "../lib/migrate";

const { q, end } = connect();
runMigrations(q, console.log)
  .then(() => console.log("migrations: done"))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(end);
