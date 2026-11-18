import type { ComponentProps, ReactNode } from 'react';

export const Surface = ({
  inset = false,
  className = '',
  ...props
}: ComponentProps<'div'> & { inset?: boolean }) => (
  <div
    className={`min-w-0 [:where(&)]:rounded-card [:where(&)]:text-foreground ${
      inset
        ? '[:where(&)]:bg-surface-alt [:where(&)]:border [:where(&)]:border-border/70'
        : '[:where(&)]:bg-surface [:where(&)]:border [:where(&)]:border-border/75 [:where(&)]:shadow-surface'
    } ${className}`}
    {...props}
  />
);

const buttonTones = {
  primary:
    '[:where(&)]:bg-primary [:where(&)]:text-primary-foreground [:where(&)]:border [:where(&)]:border-transparent',
  quiet:
    '[:where(&)]:border [:where(&)]:border-border [:where(&)]:bg-surface [:where(&)]:text-foreground',
  ghost:
    '[:where(&)]:border [:where(&)]:border-transparent [:where(&)]:bg-transparent [:where(&)]:text-foreground hover:[:where(&)]:bg-surface-alt',
  accent:
    '[:where(&)]:bg-accent [:where(&)]:text-accent-foreground [:where(&)]:border [:where(&)]:border-transparent',
};

export const Button = ({
  tone = 'primary',
  type = 'button',
  className = '',
  ...props
}: ComponentProps<'button'> & { tone?: keyof typeof buttonTones }) => (
  <button
    type={type}
    className={`[:where(&)]:inline-flex [:where(&)]:min-h-11 [:where(&)]:items-center [:where(&)]:justify-center [:where(&)]:gap-2 whitespace-nowrap [:where(&)]:rounded-control [:where(&)]:px-4 [:where(&)]:text-sm [:where(&)]:font-medium transition-[transform,filter,background-color] duration-150 ease-out hover:brightness-95 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${buttonTones[tone]} ${className}`}
    {...props}
  />
);

export const Field = ({
  label,
  id,
  hint,
  children,
  className = '',
}: {
  label: string;
  id: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={`min-w-0 flex flex-col gap-1.5 ${className}`}>
    <label htmlFor={id} className="text-sm font-medium text-foreground">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-muted">{hint}</p>}
  </div>
);

export const SelectInput = ({
  className = '',
  ...props
}: ComponentProps<'select'>) => (
  <select
    className={`min-h-11 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
    {...props}
  />
);

export const TextInput = ({
  className = '',
  ...props
}: ComponentProps<'input'>) => (
  <input
    className={`min-h-11 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
    {...props}
  />
);

export const ToggleSwitch = ({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <div className="min-w-0">
      <label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer">
        {label}
      </label>
      {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
    </div>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        checked ? 'bg-primary border-primary' : 'bg-surface-alt border-border'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-surface shadow-sm transition-transform duration-150 ease-out ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export const IslamicPatternAccent = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 120 120"
    aria-hidden="true"
    className={`pointer-events-none select-none ${className}`}
    fill="none"
  >
    <g stroke="currentColor" strokeWidth="1.2" opacity="0.22">
      <polygon points="60,8 76,44 112,60 76,76 60,112 44,76 8,60 44,44" />
      <rect x="23" y="23" width="74" height="74" transform="rotate(45 60 60)" />
      <circle cx="60" cy="60" r="22" />
      <circle cx="60" cy="60" r="46" strokeDasharray="3 4" />
    </g>
  </svg>
);
