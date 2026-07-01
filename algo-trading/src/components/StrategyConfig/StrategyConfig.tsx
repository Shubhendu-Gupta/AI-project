import type { StrategyConfig, StrategyId, MACrossoverParams, RSIParams, MACDParams } from '../../types/strategy';
import './StrategyConfig.css';

interface Props {
  config: StrategyConfig;
  onChange: (patch: Partial<StrategyConfig>) => void;
  onRun: () => void;
}

export const StrategyConfigPanel = ({ config, onChange, onRun }: Props) => {
  const updateParams = (patch: object) =>
    onChange({ params: { ...config.params, ...patch } });

  return (
    <div className="strategy-config">
      <h2 className="strategy-config__title">Strategy</h2>

      <label className="strategy-config__field">
        <span>Strategy</span>
        <select
          value={config.id}
          onChange={(e) => onChange({ id: e.target.value as StrategyId })}
        >
          <option value="ma-crossover">MA Crossover</option>
          <option value="rsi-mean-reversion">RSI Mean Reversion</option>
          <option value="macd-signal">MACD Signal</option>
        </select>
      </label>

      {config.id === 'ma-crossover' && (
        <>
          <NumField
            label="Fast Period"
            value={(config.params as MACrossoverParams).fastPeriod}
            min={2} max={200}
            onChange={(v) => updateParams({ fastPeriod: v })}
          />
          <NumField
            label="Slow Period"
            value={(config.params as MACrossoverParams).slowPeriod}
            min={2} max={200}
            onChange={(v) => updateParams({ slowPeriod: v })}
          />
        </>
      )}

      {config.id === 'rsi-mean-reversion' && (
        <>
          <NumField
            label="RSI Period"
            value={(config.params as RSIParams).period}
            min={2} max={50}
            onChange={(v) => updateParams({ period: v })}
          />
          <NumField
            label="Oversold"
            value={(config.params as RSIParams).oversold}
            min={5} max={45}
            onChange={(v) => updateParams({ oversold: v })}
          />
          <NumField
            label="Overbought"
            value={(config.params as RSIParams).overbought}
            min={55} max={95}
            onChange={(v) => updateParams({ overbought: v })}
          />
        </>
      )}

      {config.id === 'macd-signal' && (
        <>
          <NumField
            label="Fast Period"
            value={(config.params as MACDParams).fastPeriod}
            min={2} max={50}
            onChange={(v) => updateParams({ fastPeriod: v })}
          />
          <NumField
            label="Slow Period"
            value={(config.params as MACDParams).slowPeriod}
            min={5} max={100}
            onChange={(v) => updateParams({ slowPeriod: v })}
          />
          <NumField
            label="Signal Period"
            value={(config.params as MACDParams).signalPeriod}
            min={2} max={30}
            onChange={(v) => updateParams({ signalPeriod: v })}
          />
        </>
      )}

      <h3 className="strategy-config__section">Risk Management</h3>
      <NumField
        label="Stop Loss %"
        value={+(config.stopLoss * 100).toFixed(2)}
        min={0.1} max={20} step={0.1}
        onChange={(v) => onChange({ stopLoss: v / 100 })}
      />
      <NumField
        label="Take Profit %"
        value={+(config.takeProfit * 100).toFixed(2)}
        min={0.1} max={50} step={0.1}
        onChange={(v) => onChange({ takeProfit: v / 100 })}
      />
      <NumField
        label="Position Size %"
        value={+(config.positionSize * 100).toFixed(2)}
        min={1} max={100} step={1}
        onChange={(v) => onChange({ positionSize: v / 100 })}
      />

      <button className="strategy-config__run" onClick={onRun}>
        Run Backtest
      </button>
    </div>
  );
};

interface NumFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

const NumField = ({ label, value, min, max, step = 1, onChange }: NumFieldProps) => (
  <label className="strategy-config__field">
    <span>{label}</span>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v >= min && v <= max) onChange(v);
      }}
    />
  </label>
);
