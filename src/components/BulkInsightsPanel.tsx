import { useDeferredValue, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { applyBulkInsights, BULK_SETTINGS_KEY, loadBulkSettings, validateBulkSettings, type BulkInsightSettings } from "@/lib/bulkInsights";
import type { ReelData } from "@/lib/mockData";
import { formatDuration } from "@/lib/utils";
import { formatCountryPercentage } from "@/lib/audienceEstimates";

const sourceLabels: Record<keyof BulkInsightSettings["trafficSources"], string> = {
  forYouPage: "For You", following: "Following", profile: "Personal profile", search: "Search", sounds: "Sounds", hashtags: "Other",
};

function PercentControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm" htmlFor={`bulk-${label}`}>{label}</label>
      <div className="flex items-center gap-2"><Input id={`bulk-${label}`} aria-label={label} className="w-20 text-right" type="number" min={0} max={100} step={0.01} value={value} onChange={event => onChange(Number(event.target.value))} /><span className="text-muted-foreground text-sm">%</span></div>
    </div>
    <Slider aria-label={`${label} percentage`} min={0} max={100} step={0.1} value={[Math.min(100, Math.max(0, value))]} onValueChange={values => onChange(values[0] ?? 0)} />
  </div>;
}

export default function BulkInsightsPanel({ reels, onClose, onPush }: {
  reels: ReelData[]; onClose: () => void; onPush: (settings: BulkInsightSettings) => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => {
    const saved = loadBulkSettings();
    return localStorage.getItem(BULK_SETTINGS_KEY) ? saved : { ...saved, enabled: true };
  });
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const error = validateBulkSettings(draft);
  const deferredDraft = useDeferredValue(draft);
  const pageCount = Math.max(1, Math.ceil(reels.length / 20));
  const currentPage = Math.min(page, pageCount - 1);
  const previews = useMemo(() => {
    if (validateBulkSettings(deferredDraft)) return [];
    try { return applyBulkInsights(reels.slice(currentPage * 20, currentPage * 20 + 20), { ...deferredDraft, enabled: true }); }
    catch { return []; }
  }, [reels, deferredDraft, currentPage]);
  const hours = Math.floor(draft.secondsPer1000Views / 3600);
  const minutes = Math.floor(draft.secondsPer1000Views % 3600 / 60);
  const seconds = draft.secondsPer1000Views % 60;
  const update = (patch: Partial<BulkInsightSettings>) => { setDraft(previous => ({ ...previous, ...patch })); setStatus(""); };
  const trafficTotal = Object.values(draft.trafficSources).reduce((sum, value) => sum + value, 0);
  const countryTotal = draft.audienceRegions.reduce((sum, region) => sum + region.percentage, 0);

  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-lg p-0">
      <header className="border-b border-border p-5 pr-12">
        <DialogTitle>Video settings</DialogTitle>
        <DialogDescription className="mt-2">Custom estimates · {reels.length} videos</DialogDescription>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
        <fieldset disabled={saving} className="min-w-0">
        <section className="space-y-5 border-b border-border py-5">
          <h3 className="font-semibold">Watch metrics</h3>
          <div className="flex items-center justify-between gap-3"><label htmlFor="bulk-play-auto" className="text-sm">Total play time · Auto (0h:50m:10s – 1h:50m:30s)</label><Switch id="bulk-play-auto" checked={!draft.customTotalPlayTime} onCheckedChange={auto => update({ customTotalPlayTime: !auto })} /></div>
          {draft.customTotalPlayTime && <div>
            <p className="mb-3 text-sm">Total play time per 1,000 views</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { label: "Hours", value: hours, max: undefined, multiplier: 3600 },
                { label: "Minutes", value: minutes, max: 59, multiplier: 60 },
                { label: "Seconds", value: seconds, max: 59, multiplier: 1 },
              ]).map(part => <label key={part.label} className="text-xs text-muted-foreground">{part.label}<Input aria-label={`Play time ${part.label.toLowerCase()}`} className="mt-1 text-foreground" type="number" min={0} max={part.max} step={1} value={part.value} onChange={event => {
                const next = Math.max(0, Math.min(part.max ?? 999999, Math.floor(Number(event.target.value))));
                update({ secondsPer1000Views: draft.secondsPer1000Views + (next - part.value) * part.multiplier });
              }} /></label>)}
            </div>
          </div>}
        </section>
        <section className="space-y-4 border-b border-border py-5">
          <h3 className="font-semibold">Average watch time</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3"><label htmlFor="bulk-average-auto" className="text-sm">Auto (5.1s – 15.1s)</label><Switch id="bulk-average-auto" checked={draft.averageWatchSeconds === undefined} onCheckedChange={auto => update({ averageWatchSeconds: auto ? undefined : 12 })} /></div>
            <label className="flex items-center justify-between gap-3 text-sm">Average watch time per video<div className="flex items-center gap-2"><Input aria-label="Average watch time seconds" className="w-24 text-right" type="number" min={0} step={0.1} disabled={draft.averageWatchSeconds === undefined} placeholder="Auto" value={draft.averageWatchSeconds ?? ""} onChange={event => update({ averageWatchSeconds: Number(event.target.value) })} /><span className="text-sm text-muted-foreground">s</span></div></label>
          </div>
        </section>
        <section className="space-y-4 border-b border-border py-5">
          <h3 className="font-semibold">Watched full video</h3>
          <div className="flex items-center justify-between gap-3"><label htmlFor="bulk-full-auto" className="text-sm">Auto (5.10% – 15.10%)</label><Switch id="bulk-full-auto" checked={draft.watchedFullOverridePercent === undefined} onCheckedChange={auto => update({ watchedFullOverridePercent: auto ? undefined : draft.watchedFullPercent })} /></div>
          {draft.watchedFullOverridePercent !== undefined && <PercentControl label="Watched full video percentage" value={draft.watchedFullOverridePercent} onChange={value => update({ watchedFullOverridePercent: value })} />}
          {draft.watchedFullOverridePercent === undefined && <label className="flex items-center justify-between gap-3 text-sm">Watched full video percentage<div className="flex items-center gap-2"><Input aria-label="Watched full video percentage" className="w-20 text-right" type="number" disabled placeholder="Auto" value="" /><span className="text-muted-foreground text-sm">%</span></div></label>}
        </section>
        <section className="space-y-4 border-b border-border py-5">
          <div className="flex justify-between gap-3"><h3 className="font-semibold">Traffic sources</h3><span className={`text-sm ${Math.abs(trafficTotal - 100) < 0.01 ? "text-tiktok-success" : "text-destructive"}`}>{Number(trafficTotal.toFixed(2))} / 100%</span></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {(Object.keys(sourceLabels) as Array<keyof typeof sourceLabels>).map(key => <PercentControl key={key} label={sourceLabels[key]} value={draft.trafficSources[key]} onChange={value => update({ trafficSources: { ...draft.trafficSources, [key]: value } })} />)}
          </div>
        </section>
        <section className="space-y-3 border-b border-border py-5">
          <div className="flex justify-between gap-3"><h3 className="font-semibold">Audience locations</h3>{draft.customCountries && <span className={`text-sm ${Math.abs(countryTotal - 100) < 0.01 ? "text-tiktok-success" : "text-destructive"}`}>{formatCountryPercentage(countryTotal)} / 100%</span>}</div>
<div className="flex items-center justify-between gap-3"><label htmlFor="bulk-country-auto" className="text-sm">Auto (US / UK top, random countries)</label><Switch id="bulk-country-auto" checked={!draft.customCountries} onCheckedChange={auto => update({ customCountries: !auto })} /></div>
          {!draft.customCountries && <label className="flex items-center justify-between gap-3 text-sm">Top country minimum<div className="flex items-center gap-2"><Input aria-label="Top country minimum percentage" className="w-20 text-right" type="number" min={30} max={90} step={0.1} value={draft.topCountryMinPercent ?? 30} onChange={event => update({ topCountryMinPercent: Number(event.target.value) })} /><span className="text-sm text-muted-foreground">%</span></div></label>}
          {draft.customCountries && <>
                    <label className="flex items-center justify-between gap-3 text-sm">Country variation (± points)<Input aria-label="Country variation" className="w-20" type="number" min={0} max={4} step={0.1} value={draft.countryVariation ?? 4} onChange={event => update({ countryVariation: Number(event.target.value) })} /></label>
          {draft.audienceRegions.map((region, index) => <div key={index} className="flex items-center gap-2">
            <Input aria-label={`Country ${index + 1}`} className="min-w-0 flex-1" value={region.name} placeholder="Country" onChange={event => update({ audienceRegions: draft.audienceRegions.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} />
            <Input aria-label={`Country ${index + 1} percentage`} className="w-20" type="number" min={0} max={100} step={0.1} value={formatCountryPercentage(region.percentage)} onChange={event => update({ audienceRegions: draft.audienceRegions.map((item, i) => i === index ? { ...item, percentage: Number(event.target.value) } : item) })} />
            <span className="text-sm text-muted-foreground">%</span>
            <Button variant="ghost" size="icon" aria-label={`Remove country ${index + 1}`} title="Remove country" onClick={() => update({ audienceRegions: draft.audienceRegions.filter((_, i) => i !== index) })}><Trash2 /></Button>
          </div>)}
          <Button variant="outline" size="sm" onClick={() => update({ audienceRegions: [...draft.audienceRegions, { name: "", percentage: 0 }] })}><Plus />Add country</Button>
          </>}
        </section>
        <section className="py-5">
          <h3 className="mb-3 font-semibold">All videos · estimated values</h3>
          {reels.length === 0 ? <p className="text-sm text-muted-foreground">No fetched videos yet.</p> : error ? <p className="text-sm text-muted-foreground">Preview unavailable until percentages are valid.</p> : <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-xs">
              <thead className="text-muted-foreground"><tr><th className="pb-3 font-medium">Video</th><th className="pb-3 font-medium">Views</th><th className="pb-3 font-medium">Total play</th><th className="pb-3 font-medium">Average</th><th className="pb-3 font-medium">Full</th><th className="pb-3 font-medium">Countries</th></tr></thead>
              <tbody>{previews.map(reel => <tr key={reel.id} className="border-t border-border"><td className="max-w-40 py-3 pr-2"><div className="flex items-center gap-2">{reel.thumbnail && <img loading="lazy" decoding="async" src={reel.thumbnail} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />}<div className="min-w-0"><p className="max-w-28 truncate" title={reel.title}>{reel.title}</p><p className="mt-1 text-muted-foreground">{reel.duration}</p></div></div></td><td className="pr-2">{reel.insights.views.toLocaleString()}</td><td className="pr-2 whitespace-nowrap">{formatDuration(reel.insights.totalPlayTime)}</td><td className="pr-2">{reel.insights.avgWatchTime}s</td><td className="pr-3">{reel.insights.watchedFull}%</td><td className="min-w-36 py-2">{reel.insights.audienceRegions.map(region => <p key={region.name}>{region.name} {formatCountryPercentage(region.percentage)}%</p>)}</td></tr>)}</tbody>
            </table>
          </div>}
          {pageCount > 1 && <div className="mt-3 flex items-center justify-end gap-3"><Button variant="ghost" size="icon" title="Previous videos" aria-label="Previous videos" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></Button><span className="text-xs text-muted-foreground">{currentPage + 1} / {pageCount}</span><Button variant="ghost" size="icon" title="Next videos" aria-label="Next videos" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight /></Button></div>}
        </section>
        </fieldset>
      </div>
      <footer className="space-y-3 border-t border-border bg-background p-4">
        <div className="flex items-center justify-between gap-3"><label htmlFor="bulk-future" className="text-sm">Auto-apply to future clones</label><Switch id="bulk-future" disabled={saving} checked={draft.enabled} onCheckedChange={enabled => update({ enabled })} /></div>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        {status && <p role="status" className="text-sm text-tiktok-success">{status}</p>}
        <Button className="w-full" disabled={Boolean(error) || saving} onClick={async () => {
          setSaving(true);
          try { await onPush(draft); setStatus(`Saved · applied to ${reels.length} videos`); }
          catch (error) { setStatus(error instanceof Error ? error.message : "Not saved. Please retry."); }
          finally { setSaving(false); }
        }}><Send />{saving ? "Applying…" : "Push to all videos"}</Button>
      </footer>
    </DialogContent>
  </Dialog>;
}