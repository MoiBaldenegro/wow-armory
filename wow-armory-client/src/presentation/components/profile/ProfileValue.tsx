interface ProfileValueProps {
  label: string;
  children: string;
}

export function ProfileValue({ label, children }: ProfileValueProps) {
  return (
    <div className="mx-fact">
      <p className="mx-fact__label">{label}</p>
      <p className="mx-fact__value">{children}</p>
    </div>
  );
}
