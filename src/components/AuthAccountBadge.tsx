import type { User } from 'firebase/auth';
import { Cloud, LogOut } from 'lucide-react';

export function GoogleLogoIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

interface AuthAccountBadgeProps {
  user: User | null;
  authLoading: boolean;
  signingIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function AuthAccountBadge({
  user,
  authLoading,
  signingIn,
  onSignIn,
  onSignOut,
}: AuthAccountBadgeProps) {
  if (authLoading) {
    return (
      <div className="h-9 w-28 rounded-control bg-surface-alt border border-border/60" aria-hidden="true" />
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={onSignIn}
        disabled={signingIn}
        className="inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-control border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-surface hover:bg-surface-alt transition-colors cursor-pointer disabled:opacity-50"
      >
        <GoogleLogoIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{signingIn ? 'Signing in…' : 'Sign in with Google'}</span>
      </button>
    );
  }

  const label = user.displayName || user.email?.split('@')[0] || 'Account';
  const initials = label.slice(0, 1).toUpperCase();

  return (
    <div className="inline-flex items-center gap-2 rounded-control border border-border/80 bg-surface-alt px-2.5 py-1">
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt={label}
          referrerPolicy="no-referrer"
          className="h-6 w-6 rounded-full object-cover border border-border/60 shrink-0"
        />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shrink-0">
          {initials}
        </span>
      )}
      <div className="hidden sm:flex flex-col leading-none">
        <span className="text-xs font-medium text-foreground max-w-[110px] truncate">{label}</span>
        <span className="inline-flex items-center gap-1 text-[10px] text-success font-medium mt-0.5">
          <Cloud className="h-2.5 w-2.5" />
          Synced
        </span>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        title="Sign out"
        aria-label="Sign out"
        className="inline-flex h-7 w-7 items-center justify-center rounded-control text-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
