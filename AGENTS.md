<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Viewer types percentages belong on each reel's `insights` object and flow through the existing reel save path, because tab-local state resets when changing tabs or reopening analysis.
Keep editable Likes and Retention text and time values in each reel's insights; callback-backed editors use those values rather than local text overrides so Done saves and reloads consistently.

Keep scraped music artwork on each reel's `musicCover` field through the post converter and both reel players, because sound artwork differs per video and must not fall back to the video thumbnail when available.

Play each reel's own video audio through its video element; attempt audible playback first, fall back to muted autoplay only when browser policy blocks it. No visible mute/speaker icon anywhere — the user had it removed; a tap on the video is the gesture that turns sound on.

Derive each scraped reel's posted date from its TikTok video ID and persist it as an Asia/Kolkata `YYYY-MM-DD` value; display videos from the last seven days as “N day(s) ago” and older videos as `YYYY-MM-DD`.

Treat RapidAPI TikTok response fields as version-tolerant and always try the Apify fallback after a RapidAPI false negative, because active accounts can temporarily return alternate response shapes or empty post lists.

Accept a resolved Zyla profile with an explicit zero total video count and an empty feed as a successful empty clone; replace the previous reel list with an empty list so another account's videos are never retained.

Receive Telegram key-generator commands through `/api/public/telegram/webhook`, authenticate Telegram's secret header, and authorize every command against all IDs in `TELEGRAM_CHAT_ID`, because the bot is an externally called admin tool.
Throttle access-key checks per IP (5 fails / 15 min in login_attempts) and issue 80-bit TT- keys, because the login is a brute-force target.
Enforce optional per-key device limits through the service-role-only, row-locking check_access_key_device RPC; only explicit login registers installations and guards/uploads must recheck them, preventing parallel registrations or sibling-path bypasses. Browser storage identifies an installation, not physical hardware, so clearing storage or switching browsers counts as another device.

Keep bulk estimator formulas in a client-safe pure module, open its panel from the profile menu, and persist through the existing reel save path; this preserves the individual editor and keeps future clones consistent without changing API source stats.
Represent custom bulk average watch time as optional base seconds in saved bulk settings with deterministic reel-seeded variation; absence preserves automatic duration-based estimates and old saved settings remain compatible.
Represent custom bulk full-watch percentages as an optional override separate from legacy defaults; absence preserves automatic estimates and saved settings remain compatible.
Share country generation in a client-safe audience estimator across scraped posts and bulk Push; use deterministic decimal transfers involving every country, bounded relative to the saved base. Migrate only exact obsolete defaults on reopening, preserving edits; chunk Push work, paginate deferred previews, and guard stale/repeated writes so updates remain reproducible and responsive.
Share deterministic reel-seeded country ordering between bulk output and video Locations, preserving source indexes for editing so ordering never changes percentage ownership.
Preserve nonempty saved audience location arrays regardless of their length, because bulk country settings must survive reopening and reload.
All media upload surfaces share a bounded upload queue and retry only transient failures with backoff; release image resources and load failed-thumbnail video fallbacks only near the viewport to limit memory and connection pressure.
Independent builds target Vercel while managed previews retain their runtime; provider-specific trusted IP headers preserve per-client key throttling.
Scraper fallback and media proxy call Apify directly using a server-only provider key, so independent hosting does not depend on the Lovable connector gateway.
Media uploads require server-validated active project keys and scoped signed upload URLs, then transfer directly to storage to avoid public writes and hosting payload limits.
Keep the educational identity, non-affiliation and estimated-analytics disclosure in README.md only; the running app shows no student/demo labeling in its shell, login screen, route metadata or install manifest.
