```dataviewjs
// 1) Build a map of tag → count, only for #Category/... tags
const tagCounts = new Map();

for (const page of dv.pages()) {
  // skip templates folder
  if (page.file.path.startsWith("z_Templates/")) continue;

  for (const raw of (page.file.tags ?? [])) {
    // normalize: strip leading '#', lowercase
    const tag = (raw.startsWith("#") ? raw.slice(1) : raw).toLowerCase();
    if (!tag.startsWith("category/")) continue;

    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
}

// 2) Parallel arrays (sorted by count desc)
const entries = Array.from(tagCounts.entries()).sort((a,b) => b[1]-a[1]);
const labels = entries.map(([t]) => t);
const counts = entries.map(([,c]) => c);

// 3) Configure and render the bar chart
const chartData = {
  type: 'bar',
  data: {
    labels,
    datasets: [{
      label: 'Count',
      data: counts,
      backgroundColor: labels.map(() => 'gold'),
    }]
  },
  options: {
    scales: { y: { beginAtZero: true } }
  }
};

if (window.renderChart) {
  window.renderChart(chartData, this.container);
} else {
  const canvas = dv.el("canvas", "", { cls: "chartjs-canvas" });
  // If you load Chart.js yourself, you can do:
  // new Chart(canvas.getContext("2d"), chartData);
  dv.paragraph("⚠️ No renderChart() found. Load your chart renderer or switch to your Chart.js init.");
}
```

