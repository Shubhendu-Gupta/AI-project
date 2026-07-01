module.exports = {
  createChart: () => ({
    addLineSeries: () => ({ setData: jest.fn(), setMarkers: jest.fn(), applyOptions: jest.fn() }),
    addCandlestickSeries: () => ({ setData: jest.fn(), setMarkers: jest.fn(), applyOptions: jest.fn() }),
    addHistogramSeries: () => ({ setData: jest.fn(), applyOptions: jest.fn() }),
    timeScale: () => ({ fitContent: jest.fn() }),
    applyOptions: jest.fn(),
    remove: jest.fn(),
    resize: jest.fn(),
  }),
  CrosshairMode: { Normal: 1, Magnet: 2 },
  LineStyle: { Solid: 0, Dotted: 1, Dashed: 2 },
  ColorType: { Solid: 0 },
};
