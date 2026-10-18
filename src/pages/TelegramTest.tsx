import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type TestResult =
  | { ok: true; bot: string; chatId: string | number; messageId: number }
  | { ok: false; step: string; error: string };

const TelegramTest = () => {
  const [message, setMessage] = useState("✅ Test message from Lovable Cloud");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    setIsSending(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-verify", {
        body: { text: message },
      });
      if (error) throw error;
      if (data?.ok) {
        setResult({
          ok: true,
          bot: data.bot?.username || "unknown",
          chatId: data.chatId,
          messageId: data.send?.result?.message_id,
        });
      } else {
        setResult({
          ok: false,
          step: data?.step || "unknown",
          error: data?.error?.description || JSON.stringify(data?.error || data),
        });
      }
    } catch (err: any) {
      setResult({ ok: false, step: "network", error: err?.message || "Failed to reach edge function" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">Telegram Connection Test</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sends a test message to the configured Telegram chat to verify the bot token and chat ID.
        </p>

        <label className="text-xs text-muted-foreground font-medium mb-1 block">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={500}
          className="w-full bg-secondary text-foreground rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none resize-none mb-4"
        />

        <button
          onClick={handleTest}
          disabled={isSending || !message.trim()}
          className="w-full bg-primary text-primary-foreground font-semibold rounded-lg py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Test Message
            </>
          )}
        </button>

        {result?.ok === true && (
          <div className="mt-5 rounded-lg border border-green-500/40 bg-green-500/10 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-green-600 dark:text-green-400">Message sent!</p>
                <p className="text-muted-foreground mt-1">Bot: @{result.bot}</p>
                <p className="text-muted-foreground">Chat ID: {result.chatId}</p>
                <p className="text-muted-foreground">Message ID: {result.messageId}</p>
              </div>
            </div>
          </div>
        )}

        {result?.ok === false && (
          <div className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            <div className="flex items-start gap-2">
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">Failed at: {result.step}</p>
                <p className="text-muted-foreground mt-1 break-words">{result.error}</p>
                {result.step === "sendMessage" && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    Tip: Open the bot in Telegram and send it any message first, then update TELEGRAM_CHAT_ID with the correct value from{" "}
                    <code className="bg-muted px-1 py-0.5 rounded">getUpdates</code>.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelegramTest;
