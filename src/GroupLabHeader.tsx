export function LabHeader({
  label,
  title,
  badge,
  headingId,
}: {
  label: string;
  title: string;
  badge: string;
  headingId: string;
}) {
  return (
    <div className="group-lab__head">
      <div>
        <span className="group-lab__label">{label}</span>
        <h2 id={headingId}>{title}</h2>
      </div>
      <span className="group-lab__badge">{badge}</span>
    </div>
  );
}
