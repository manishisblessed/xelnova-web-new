'use client';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors ${props.className || ''}`}
    />
  );
}

export function FormSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors ${props.className || ''}`}
    >
      {children}
    </select>
  );
}

export function FormTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors min-h-[80px] ${props.className || ''}`}
    />
  );
}

export function FormToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-surface-muted border border-border'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
      </button>
      <span className="text-sm text-text-primary">{label}</span>
    </label>
  );
}
