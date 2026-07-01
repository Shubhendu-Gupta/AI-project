import { useRef, useEffect } from 'react';
import {
  createChart, CrosshairMode, ColorType, LineStyle,
  CandlestickSeries, LineSeries, HistogramSeries,
  createSeriesMarkers,
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, ISeriesMarkersPluginApi, Time } from 'lightweight-charts';
import type { ChartSeries } from '../../hooks/useChartData';
import './PriceChart.css';

interface Props {
  series: ChartSeries;
  height?: number;
}

type LWTime = { time: Time };

const toTime = <T extends { time: number }>(arr: T[]): (Omit<T, 'time'> & LWTime)[] =>
  arr.map(({ time, ...rest }) => ({ time: time as unknown as Time, ...rest }));

export const PriceChart = ({ series, height = 420 }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const candleRef    = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const smaRef       = useRef<ISeriesApi<'Line'> | null>(null);
  const emaRef       = useRef<ISeriesApi<'Line'> | null>(null);
  const bollUpRef    = useRef<ISeriesApi<'Line'> | null>(null);
  const bollMidRef   = useRef<ISeriesApi<'Line'> | null>(null);
  const bollLoRef    = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeRef    = useRef<ISeriesApi<'Histogram'> | null>(null);
  const markersRef   = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0f1117' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e2330' },
        horzLines: { color: '#1e2330' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;

    candleRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
      borderVisible: false,
    });

    smaRef.current = chart.addSeries(LineSeries, {
      color: '#6366f1', lineWidth: 1, title: 'SMA',
      priceLineVisible: false, lastValueVisible: false,
    });

    emaRef.current = chart.addSeries(LineSeries, {
      color: '#f59e0b', lineWidth: 1, title: 'EMA',
      priceLineVisible: false, lastValueVisible: false,
    });

    bollUpRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(148,163,184,0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed,
      priceLineVisible: false, lastValueVisible: false,
    });
    bollMidRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(148,163,184,0.6)', lineWidth: 1,
      priceLineVisible: false, lastValueVisible: false,
    });
    bollLoRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(148,163,184,0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed,
      priceLineVisible: false, lastValueVisible: false,
    });

    volumeRef.current = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.resize(containerRef.current.clientWidth, height);
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    candleRef.current?.setData(toTime(series.candles) as Parameters<typeof candleRef.current.setData>[0]);
    smaRef.current?.setData(toTime(series.sma));
    emaRef.current?.setData(toTime(series.ema));
    bollUpRef.current?.setData(toTime(series.bollUpper));
    bollMidRef.current?.setData(toTime(series.bollMiddle));
    bollLoRef.current?.setData(toTime(series.bollLower));
    volumeRef.current?.setData(toTime(series.volumeSeries) as Parameters<typeof volumeRef.current.setData>[0]);

    if (candleRef.current) {
      const markers = [...toTime(series.buyMarkers), ...toTime(series.sellMarkers)]
        .sort((a, b) => (a.time as number) - (b.time as number));
      if (markersRef.current) {
        markersRef.current.detach();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      markersRef.current = createSeriesMarkers(candleRef.current as any, markers as any);
    }
  }, [series]);

  return <div ref={containerRef} className="price-chart" />;
};
