interface ProfileValueProps {
  label: string;
  children: string;
}

export function ProfileValue({ label, children }: ProfileValueProps) {
  return (
    <div className="profile-value">
      <p>{label}</p>
      <p>{children}</p>
    </div>
  );
}
