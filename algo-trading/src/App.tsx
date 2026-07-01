import { useStrategyConfig } from './hooks/useStrategyConfig';
import { useBacktest } from './hooks/useBacktest';
import { useChartData } from './hooks/useChartData';
import { PriceChart } from './components/PriceChart/PriceChart';
import { BacktestPanel } from './components/BacktestPanel/BacktestPanel';
import { TradeLog } from './components/TradeLog/TradeLog';
import { StrategyConfigPanel } from './components/StrategyConfig/StrategyConfig';
import type { StrategyConfig } from './types/strategy';
import './App.css';

const App = () => {
  const { config, setStrategyId, updateParams, updateRisk } = useStrategyConfig();
  const { result, isRunning, run } = useBacktest(config);
  const chartSeries = useChartData(result, config);

  const handleChange = (patch: Partial<StrategyConfig>) => {
    if (patch.id) setStrategyId(patch.id);
    if (patch.params) updateParams(patch.params);
    if (patch.stopLoss !== undefined || patch.takeProfit !== undefined || patch.positionSize !== undefined) {
      updateRisk({
        stopLoss: patch.stopLoss,
        takeProfit: patch.takeProfit,
        positionSize: patch.positionSize,
      });
    }
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1>Algo Trading Dashboard</h1>
        <p>Backtest technical strategies on 500-bar synthetic OHLCV data · $100k initial equity</p>
      </header>

      <div className="app__layout">
        <aside className="app__sidebar">
          <StrategyConfigPanel config={config} onChange={handleChange} onRun={run} />
        </aside>

        <main className="app__main">
          <PriceChart series={chartSeries} height={420} />
          <BacktestPanel result={result} isRunning={isRunning} />
          <TradeLog trades={result?.trades ?? []} />
        </main>
      </div>
    </div>
  );
};

export default App;
