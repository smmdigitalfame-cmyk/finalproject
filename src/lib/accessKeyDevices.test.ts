import { describe, expect, test } from "vitest";
import { randomBytes } from "node:crypto";

const token = process.env.EXTERNAL_SUPABASE_ACCESS_TOKEN;
describe.skipIf(!token)("database device registration", () => {
  test("two devices allowed, third blocked, and registered devices can recheck", async () => {
    const key = `TT-${randomBytes(10).toString("hex").toUpperCase()}`;
    const devices = Array.from({ length: 3 }, () => crypto.randomUUID());
    const query = `BEGIN;
      INSERT INTO public.access_keys(key_code,max_devices) VALUES ('${key}',2);
      SELECT public.check_access_key_device('${key}','${devices[0]}',true) AS first,
        public.check_access_key_device('${key}','${devices[1]}',true) AS second,
        public.check_access_key_device('${key}','${devices[2]}',true) AS third,
        public.check_access_key_device('${key}','${devices[0]}',false) AS recheck,
        public.check_access_key_device('${key}','',true) AS missing,
        public.check_access_key_device('${key}','${devices[2]}',false) AS unregistered;
      ROLLBACK;`;
    const response = await fetch("https://api.supabase.com/v1/projects/peqhdvjbsdadqilaaljh/database/query", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual([{ first: true, second: true, third: false, recheck: true, missing: false, unregistered: false }]);
  });
});