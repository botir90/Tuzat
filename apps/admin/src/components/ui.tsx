import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AdminApiError } from '../api';

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return <button className={`btn btn-${variant} ${className ?? ''}`} {...props} />;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/** Badge color for a status value. */
export function statusTone(status: string): string {
  if (['VERIFIED', 'RESOLVED', 'DONE'].includes(status)) return 'good';
  if (['REJECTED', 'CANCELLED', 'EXPIRED'].includes(status)) return 'bad';
  if (['PENDING', 'OPEN'].includes(status)) return 'warn';
  return 'neutral';
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const message =
    error instanceof AdminApiError ? error.message : 'Kutilmagan xatolik. Sahifani yangilang.';
  return (
    <div className="error" role="alert">
      {message}
    </div>
  );
}

export function Loading() {
  return <div className="muted">Yuklanmoqda…</div>;
}

export function Empty({ text }: { text: string }) {
  return <div className="muted empty">{text}</div>;
}

/** Choose one value from a list (status filters). */
export function Filter<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | '';
  options: { value: T | ''; label: string }[];
  onChange: (value: T | '') => void;
}) {
  return (
    <div className="filter">
      {options.map((o) => (
        <button
          key={o.value}
          className={`chip ${o.value === value ? 'chip-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      <div className="actions">{children}</div>
    </div>
  );
}
