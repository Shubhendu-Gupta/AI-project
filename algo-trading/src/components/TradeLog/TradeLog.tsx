import { useState, useMemo } from 'react';
import type { Trade } from '../../types/backtest';
import { fmtDollar, fmtPct, fmtDate } from '../../utils/formatters';
import './TradeLog.css';

interface Props {
  trades: Trade[];
}

type SortKey = keyof Trade;

export const TradeLog = ({ trades }: Props) => {
  const [sort, setSort] = useState<{ col: SortKey; asc: boolean }>({ col: 'entryTime', asc: true });

  const sorted = useMemo(() => {
    return [...trades].sort((a, b) => {
      const av = a[sort.col] as number;
      const bv = b[sort.col] as number;
      return sort.asc ? av - bv : bv - av;
    });
  }, [trades, sort]);

  const toggleSort = (col: SortKey) => {
    setSort((prev) => ({ col, asc: prev.col === col ? !prev.asc : true }));
  };

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);

  if (trades.length === 0) {
    return (
      <div className="trade-log trade-log--empty">
        No trades yet — configure a strategy and run backtest.
      </div>
    );
  }

  const Th = ({ col, label }: { col: SortKey; label: string }) => (
    <th className="trade-log__th" onClick={() => toggleSort(col)}>
      {label}{sort.col === col ? (sort.asc ? ' ▲' : ' ▼') : ''}
    </th>
  );

  return (
    <div className="trade-log">
      <h2 className="trade-log__title">Trade Log</h2>
      <div className="trade-log__scroll">
        <table className="trade-log__table">
          <thead>
            <tr>
              <th>#</th>
              <Th col="entryTime"  label="Entry Date" />
              <Th col="exitTime"   label="Exit Date" />
              <th>Dir</th>
              <Th col="entryPrice" label="Entry" />
              <Th col="exitPrice"  label="Exit" />
              <Th col="shares"     label="Shares" />
              <Th col="pnl"        label="P&L ($)" />
              <Th col="pnlPct"     label="P&L (%)" />
              <th>Exit Reason</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => (
              <tr key={i} className={t.pnl > 0 ? 'trade-log__row--win' : 'trade-log__row--loss'}>
                <td>{i + 1}</td>
                <td>{fmtDate(t.entryTime)}</td>
                <td>{fmtDate(t.exitTime)}</td>
                <td className={t.direction === 'long' ? 'trade-log__long' : 'trade-log__short'}>
                  {t.direction.toUpperCase()}
                </td>
                <td>{fmtDollar(t.entryPrice)}</td>
                <td>{fmtDollar(t.exitPrice)}</td>
                <td>{t.shares}</td>
                <td>{fmtDollar(t.pnl)}</td>
                <td>{fmtPct(t.pnlPct)}</td>
                <td>{t.exitReason}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="trade-log__footer">
              <td colSpan={7}>Total P&L</td>
              <td className={totalPnl >= 0 ? 'trade-log__row--win' : 'trade-log__row--loss'}>
                {fmtDollar(totalPnl)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
