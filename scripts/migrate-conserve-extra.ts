import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  await client`
    ALTER TABLE saisies_soir
      ALTER COLUMN conserve_extra TYPE integer USING conserve_extra::integer,
      ALTER COLUMN conserve_extra DROP NOT NULL,
      ALTER COLUMN conserve_extra DROP DEFAULT
  `;
  await client`UPDATE saisies_soir SET conserve_extra = NULL WHERE conserve_extra = 0`;
  console.log("Migration conserve_extra boolean → integer OK");
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
