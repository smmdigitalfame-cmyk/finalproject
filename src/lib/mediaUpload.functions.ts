import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Authorize direct-to-storage uploads; never expose the privileged credential.
export const authorizeMediaUpload = createServerFn({ method: "POST" })
  .inputValidator(input => z.object({
    key: z.string().trim().min(1).max(64),
    path: z.string().regex(/^(image|video)\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif|mp4|webm|mov|m4v)$/),
  }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: key, error } = await supabaseAdmin.from("access_keys")
      .select("id,is_active,expires_at").eq("key_code", data.key.toUpperCase()).maybeSingle();
    if (error || !key?.is_active || (key.expires_at && Date.parse(key.expires_at) <= Date.now())) {
      throw new Error("A valid project access key is required to upload.");
    }
    const { data: signed, error: uploadError } = await supabaseAdmin.storage.from("media")
      .createSignedUploadUrl(data.path, { upsert: false });
    if (uploadError || !signed) throw new Error("Media upload could not be authorized. Please retry.");
    return { path: signed.path, token: signed.token };
  });