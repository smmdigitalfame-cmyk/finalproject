type IconProps = { className?: string; fill?: string; strokeWidth?: number };

const isOn = (fill?: string) => !!fill && fill !== "none";

export const TTHomeIcon = ({ className, fill }: IconProps) =>
  isOn(fill) ? (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M10.6 2.7a2.2 2.2 0 0 1 2.8 0l7.2 6a2.6 2.6 0 0 1 .9 2v8.4A2.4 2.4 0 0 1 19.1 21.5H4.9a2.4 2.4 0 0 1-2.4-2.4v-8.4a2.6 2.6 0 0 1 .9-2zM12 13.2a1.2 1.2 0 0 0-1.2 1.2v3.4a1.2 1.2 0 0 0 2.4 0v-3.4a1.2 1.2 0 0 0-1.2-1.2z"
      />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      <path d="M11.2 3.6a1.3 1.3 0 0 1 1.6 0l7 5.8a1.8 1.8 0 0 1 .7 1.4v8.3a1.4 1.4 0 0 1-1.4 1.4H4.9a1.4 1.4 0 0 1-1.4-1.4v-8.3a1.8 1.8 0 0 1 .7-1.4z" />
      <path d="M12 14.4v3.4" />
    </svg>
  );

export const TTFriendsIcon = ({ className, fill }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill={isOn(fill) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="9" cy="7.5" r="3.6" />
    <path d="M2.5 20.5v-1.2a5.3 5.3 0 0 1 5.3-5.3h2.4a5.3 5.3 0 0 1 5.3 5.3v1.2z" />
    <circle cx="17.2" cy="9.2" r="2.6" fill="none" />
    <path d="M18 14.3a4.3 4.3 0 0 1 4 4.3v1.9h-3.6" fill="none" />
  </svg>
);

export const TTInboxIcon = ({ className, fill }: IconProps) => {
  const on = isOn(fill);
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path
        d="M5.2 3.5h13.6a2.7 2.7 0 0 1 2.7 2.7v8.6a2.7 2.7 0 0 1-2.7 2.7h-7.6l-4.3 3.3v-3.3H5.2a2.7 2.7 0 0 1-2.7-2.7V6.2a2.7 2.7 0 0 1 2.7-2.7z"
        fill={on ? "currentColor" : "none"}
      />
      <path d="M8.5 10.5h4.5" stroke={on ? "hsl(var(--background))" : "currentColor"} strokeWidth={2.2} />
    </svg>
  );
};

export const TTProfileIcon = ({ className, fill }: IconProps) => {
  const on = isOn(fill);
  return (
    <svg className={className} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="7.6" r="4.3" />
      <path d="M3.8 21v-.6a6.4 6.4 0 0 1 6.4-6.4h3.6a6.4 6.4 0 0 1 6.4 6.4v.6z" />
    </svg>
  );
};

export const TTAddFriendIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="9.5" cy="7.5" r="3.8" />
    <path d="M2.5 21v-.8a6.5 6.5 0 0 1 9.4-5.8" />
    <path d="M17.5 13.5v7M14 17h7" />
  </svg>
);

export const TTFootprintsIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7.3 3.2c-2 0-3.3 2.2-3.3 5 0 2 .7 3.4 1.2 4.5.4.8 1.2 1 2 1h.6c.9 0 1.6-.5 1.8-1.3.4-1.3 1-2.6 1-4.4 0-2.8-1.3-4.8-3.3-4.8z" />
    <path d="M5.6 16.2h3.6v1.5a1.8 1.8 0 0 1-3.6 0z" />
    <path d="M16.7 6.2c2 0 3.3 2.2 3.3 5 0 2-.7 3.4-1.2 4.5-.4.8-1.2 1-2 1h-.6c-.9 0-1.6-.5-1.8-1.3-.4-1.3-1-2.6-1-4.4 0-2.8 1.3-4.8 3.3-4.8z" />
    <path d="M14.8 19.2h3.6v1.2a1.8 1.8 0 0 1-3.6 0z" />
  </svg>
);

export const TTShareArrowIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
    <path d="M13.5 4.5 21.5 12l-8 7.5v-4.2C8.6 15.1 5.3 16.6 2.5 20c.6-5.6 3.7-10.2 11-11z" />
  </svg>
);

export const TTMenuIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
    <path d="M3.5 5.5h17M3.5 12h17M3.5 18.5h17" />
  </svg>
);

export const CountBadge = ({ count, className = "" }: { count: number; className?: string }) => (
  <span
    className={`absolute min-w-[20px] h-[20px] px-1 rounded-full bg-[hsl(var(--tiktok-red))] text-white text-[12px] font-bold leading-none flex items-center justify-center ${className}`}
  >
    {count}
  </span>
);
