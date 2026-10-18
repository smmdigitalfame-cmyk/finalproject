import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Save, Send, RefreshCw, Trash2 } from "lucide-react";

type FieldKey = "TELEGRAM_BOT_TOKEN" | "TELEGRAM_CHAT_ID" | "RAPIDAPI_KEY" | "RAPIDAPI_HOST";

const FIELDS: { key: FieldKey; label: string; placeholder: string; hint: string; multiline?: boolean }[] = [
  { key: "RAPIDAPI_KEY", label: "RapidAPI Keys", placeholder: "key1\nkey2\nkey3", hint: "Add multiple keys (one per line or comma-separated). App auto-rotates when one runs out.", multiline: true },
  { key: "RAPIDAPI_HOST", label: "RapidAPI Host", placeholder: "tiktok-scraper7.p.rapidapi.com", hint: "Defaults to tiktok-scraper7.p.rapidapi.com" },
  { key: "TELEGRAM_BOT_TOKEN", label: "Telegram Bot Token", placeholder: "123456:ABC-...", hint: "From @BotFather" },
  { key: "TELEGRAM_CHAT_ID", label: "Telegram Chat IDs", placeholder: "123456789,987654321", hint: "Comma-separated admin chat IDs" },
];

interface ConfigInfo {
  masked: string;
  source: "db" | "env" | "none";
  updated_at: string | null;
  configured: boolean;
}

const AdminSettings = () => {
  const navigate = useNavigate();
  const [auth, setAuth] = useState<{ key_id: string; device_id: string } | null>(null);
  const [config, setConfig] = useState<Record<string, ConfigInfo>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("access_key");
    const device_id = localStorage.getItem("device_id") || "";
    if (!saved) { navigate({ to: "/key-login" }); return; }
    const parsed = JSON.parse(saved);
    if (!parsed.is_admin) {
      toast.error("Admin access required");
      navigate({ to: "/" });
      return;
    }
    setAuth({ key_id: parsed.key_id, device_id });
  }, [navigate]);

  const load = async (a = auth) => {
    if (!a) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("app-config", {
      body: { ...a, action: "get" },
    });
    if (error || data?.error) {
      toast.error(data?.error || "Failed to load");
    } else {
      setConfig(data.config);
    }
    setLoading(false);
  };

  useEffect(() => { if (auth) load(auth); }, [auth]);

  const save = async () => {
    if (!auth) return;
    const toSave: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) if (v.trim()) toSave[k] = v.trim();
    if (Object.keys(toSave).length === 0) { toast.error("Nothing to save"); return; }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("app-config", {
      body: { ...auth, action: "save", values: toSave },
    });
    setSaving(false);
    if (error || data?.error) { toast.error(data?.error || "Save failed"); return; }
    toast.success(`Saved: ${data.saved.join(", ")}`);
    setValues({});
    load();
  };

  const clearOne = async (key: FieldKey) => {
    if (!auth) return;
    const { data, error } = await supabase.functions.invoke("app-config", {
      body: { ...auth, action: "clear", key },
    });
    if (error || data?.error) { toast.error(data?.error || "Failed"); return; }
    toast.success(`Cleared ${key}`);
    load();
  };

  const testTelegram = async () => {
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("telegram-verify", {
      body: { text: "✅ Test from Admin Settings" },
    });
    setTesting(false);
    if (error || !data?.ok) toast.error(data?.error?.description || "Telegram test failed");
    else toast.success("Telegram message sent!");
  };

  if (!auth) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/" })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Admin Settings</h1>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Update API keys without redeploying. Saved values override the default secrets and take effect immediately.
        </p>

        {FIELDS.map((f) => {
          const info = config[f.key];
          return (
            <Card key={f.key} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">{f.label}</Label>
                {info && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    info.source === "db" ? "bg-primary/20 text-primary"
                    : info.source === "env" ? "bg-muted text-muted-foreground"
                    : "bg-destructive/20 text-destructive"
                  }`}>
                    {info.source === "db" ? "Custom" : info.source === "env" ? "Default" : "Not set"}
                  </span>
                )}
              </div>
              {info?.configured && (
                <p className="text-xs text-muted-foreground font-mono">Current: {info.masked}</p>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {f.multiline ? (
                    <textarea
                      placeholder={f.placeholder}
                      value={values[f.key] || ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      maxLength={5000}
                      rows={4}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      style={{ WebkitTextSecurity: show[f.key] ? "none" : "disc" } as any}
                    />
                  ) : (
                    <Input
                      type={show[f.key] ? "text" : "password"}
                      placeholder={f.placeholder}
                      value={values[f.key] || ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      maxLength={1000}
                      className="pr-10"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setShow({ ...show, [f.key]: !show[f.key] })}
                    className="absolute right-2 top-2 text-muted-foreground"
                    aria-label="toggle visibility"
                  >
                    {show[f.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {info?.source === "db" && (
                  <Button variant="outline" size="icon" onClick={() => clearOne(f.key)} title="Reset to default">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{f.hint}</p>
            </Card>
          );
        })}

        <div className="flex gap-2 sticky bottom-4">
          <Button onClick={save} disabled={saving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button onClick={testTelegram} disabled={testing} variant="outline">
            <Send className="h-4 w-4 mr-2" />
            Test Telegram
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
