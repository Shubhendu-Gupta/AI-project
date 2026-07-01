interface Props {
  label: string;
  value: string;
  subtitle?: string;
  positive?: boolean | null;
}

export const MetricCard = ({ label, value, subtitle, positive }: Props) => {
  const valueClass = positive === true ? 'metric-card__value--positive'
    : positive === false ? 'metric-card__value--negative'
    : '';

  return (
    <div className="metric-card">
      <span className="metric-card__label">{label}</span>
      <span className={`metric-card__value ${valueClass}`}>{value}</span>
      {subtitle && <span className="metric-card__subtitle">{subtitle}</span>}
    </div>
  );
};
