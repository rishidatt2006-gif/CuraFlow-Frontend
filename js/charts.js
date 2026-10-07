// No charting library — these build plain SVG strings. Keeps the project
// dependency-free and avoids any CDN reliance for a handful of simple charts.

const COLORS = ["#1F7A6C", "#C1652B", "#B8801E", "#2F8F5B"];

function scale(value, min, max, outMin, outMax) {
  if (max === min) return (outMin + outMax) / 2;
  return outMin + ((value - min) / (max - min)) * (outMax - outMin);
}

/**
 * renderLineChart({ series, width, height, emptyLabel, bands })
 * series: [{ name, points: [{x: string, y: number|null}] }]
 * bands (optional): [{ from, to, color, label }] — shaded horizontal
 * reference zones (e.g. a clinically-normal range) drawn behind the lines.
 * The y-scale is widened to include band bounds, so a band stays visible
 * and meaningful even when the patient's actual readings sit outside it —
 * that gap is exactly the thing worth seeing.
 */
export function renderLineChart({ series, width = 520, height = 180, emptyLabel = "No data in this range", bands = [] }) {
  const padding = { top: 16, right: 16, bottom: 28, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allPoints = series.flatMap((s) => s.points.filter((p) => p.y !== null && p.y !== undefined));
  if (!allPoints.length) {
    return `<div class="chart-empty" style="height:${height}px;">${emptyLabel}</div>`;
  }

  const values = allPoints.map((p) => p.y).concat(bands.flatMap((b) => [b.from, b.to]));
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.1;
  min -= pad;
  max += pad;

  const xCount = Math.max(...series.map((s) => s.points.length));
  const xFor = (i) => padding.left + scale(i, 0, Math.max(xCount - 1, 1), 0, innerW);
  const yFor = (v) => padding.top + scale(v, min, max, innerH, 0);

  const bandRects = bands
    .map((b) => {
      const y1 = yFor(Math.min(b.to, max));
      const y2 = yFor(Math.max(b.from, min));
      return `<rect x="${padding.left}" y="${y1}" width="${innerW}" height="${Math.max(y2 - y1, 0)}" fill="${b.color || "#2F8F5B"}" opacity="0.12" />`;
    })
    .join("");
  const bandLabels = bands
    .map((b) => `<span><i style="background:${b.color || "#2F8F5B"}; opacity:0.5;"></i>${b.label}</span>`)
    .join("");

  const gridLines = [0, 0.5, 1]
    .map((t) => {
      const y = padding.top + t * innerH;
      const val = max - t * (max - min);
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--line)" stroke-width="1" />
        <text x="${padding.left - 8}" y="${y}" font-size="10" fill="var(--muted)" text-anchor="end" dominant-baseline="middle">${Math.round(val)}</text>
      `;
    })
    .join("");

  const xLabels = [0, Math.floor((xCount - 1) / 2), xCount - 1]
    .filter((v, i, arr) => arr.indexOf(v) === i && series[0]?.points[v])
    .map(
      (i) => `<text x="${xFor(i)}" y="${height - 8}" font-size="10" fill="var(--muted)" text-anchor="middle">${series[0].points[i].x}</text>`
    )
    .join("");

  const lines = series
    .map((s, si) => {
      const color = s.color || COLORS[si % COLORS.length];
      const pts = s.points
        .map((p, i) => (p.y === null || p.y === undefined ? null : `${xFor(i)},${yFor(p.y)}`))
        .filter(Boolean)
        .join(" ");
      const dots = s.points
        .map((p, i) => (p.y === null || p.y === undefined ? "" : `<circle cx="${xFor(i)}" cy="${yFor(p.y)}" r="2.5" fill="${color}" />`))
        .join("");
      return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />${dots}`;
    })
    .join("");

  const legend = series.length > 1 || bands.length
    ? `<div class="chart-legend">${series
        .map((s, si) => `<span><i style="background:${s.color || COLORS[si % COLORS.length]}"></i>${s.name}</span>`)
        .join("")}${bandLabels}</div>`
    : "";

  return `
    ${legend}
    <svg viewBox="0 0 ${width} ${height}" width="100%" style="display:block;">
      ${bandRects}
      ${gridLines}
      ${lines}
      ${xLabels}
    </svg>`;
}

/** renderBarChart({ labels, values, color, height, emptyLabel }) */
export function renderBarChart({ labels, values, color = "#1F7A6C", width = 520, height = 180, emptyLabel = "No data in this range" }) {
  const padding = { top: 16, right: 10, bottom: 28, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const valid = values.filter((v) => v !== null && v !== undefined);
  if (!valid.length) {
    return `<div class="chart-empty" style="height:${height}px;">${emptyLabel}</div>`;
  }

  const max = Math.max(...valid, 1);
  const barW = innerW / values.length;

  const bars = values
    .map((v, i) => {
      if (v === null || v === undefined) return "";
      const barH = scale(v, 0, max, 0, innerH);
      const x = padding.left + i * barW + barW * 0.15;
      const y = padding.top + (innerH - barH);
      return `<rect x="${x}" y="${y}" width="${barW * 0.7}" height="${barH}" rx="3" fill="${color}" />`;
    })
    .join("");

  const xLabels = labels
    .map((l, i) => `<text x="${padding.left + i * barW + barW / 2}" y="${height - 8}" font-size="10" fill="var(--muted)" text-anchor="middle">${l}</text>`)
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" style="display:block;">
      <line x1="${padding.left}" y1="${padding.top + innerH}" x2="${width - padding.right}" y2="${padding.top + innerH}" stroke="var(--line)" />
      ${bars}
      ${xLabels}
    </svg>`;
}
