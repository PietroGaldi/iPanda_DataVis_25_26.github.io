const YEAR = 2020;

const width = 850;
const height = 800;

const svg = d3.select("#symbolic_map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const tooltip = d3.select("#symbolic_map")
  .append("div")
  .style("position", "absolute")
  .style("background", "white")
  .style("padding", "8px 12px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "4px")
  .style("pointer-events", "none")
  .style("opacity", 0);

const COLS = {
  other:  "Other renewables excluding bioenergy - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
  bio:    "Electricity from bioenergy - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
  solar:  "Electricity from solar - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
  wind:   "Electricity from wind - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
  hydro:  "Electricity from hydro - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
  nuclear:"Electricity from nuclear - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
  oil:    "Electricity from oil - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
  gas:    "Electricity from gas - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
  coal:   "Electricity from coal - TWh (adapted for visualization of chart electricity-prod-source-stacked)"
};

const SOURCES = [
  { key: "fossil", label: "Coal + oil + gas" },
  { key: "clean",  label: "Other sources" }
];

const color = d3.scaleOrdinal()
  .domain(SOURCES.map(s => s.key))
  .range(["rgb(20, 71, 108)", "rgb(44, 160, 44)"]);

const toNum = v => {
  if (v == null) return NaN;
  return +String(v).replace(/[^\d.+\-eE]/g, "");
};

Promise.all([
  d3.csv("data/electricity-prod-source-stacked.csv"),
  d3.json("https://raw.githubusercontent.com/leakyMirror/map-of-europe/master/TopoJSON/europe.topojson")
]).then(([rows, topo]) => {

  const geojson = topojson.feature(topo, topo.objects.europe);

  // aggrego per anno: fossil = coal+oil+gas, clean = tutto il resto
  const data = rows
    .filter(d => +d.Year === YEAR)
    .map(d => {
      const coal    = toNum(d[COLS.coal]);
      const oil     = toNum(d[COLS.oil]);
      const gas     = toNum(d[COLS.gas]);
      const other   = toNum(d[COLS.other]);
      const bio     = toNum(d[COLS.bio]);
      const solar   = toNum(d[COLS.solar]);
      const wind    = toNum(d[COLS.wind]);
      const hydro   = toNum(d[COLS.hydro]);
      const nuclear = toNum(d[COLS.nuclear]);

      const fossil = [coal, oil, gas]
        .map(v => Number.isFinite(v) ? v : 0)
        .reduce((a, b) => a + b, 0);

      const clean = [other, bio, solar, wind, hydro, nuclear]
        .map(v => Number.isFinite(v) ? v : 0)
        .reduce((a, b) => a + b, 0);

      return {
        country: d.Entity,
        fossil,
        clean
      };
    });

  const valueByCountry = new Map(data.map(d => [d.country, d]));

  const allValues = data.flatMap(d =>
    SOURCES.map(s => Number.isFinite(d[s.key]) ? d[s.key] : 0)
  );
  const maxVal = d3.max(allValues);

  const maxHeight = 3000;
  const heightScale = d3.scaleLinear()
    .domain([0, maxVal])
    .range([0, maxHeight]);

  const triangleBase = 14;
  const gap = -4;
  const groupWidth = SOURCES.length * triangleBase + (SOURCES.length - 1) * gap;

  const projection = d3.geoMercator()
    .center([20, 55])
    .scale(500)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  function showCountryTooltip(event, countryName) {
    const vals = valueByCountry.get(countryName);
    const fossil = vals ? vals.fossil : NaN;
    const clean  = vals ? vals.clean  : NaN;

    svg.selectAll("path.country")
      .filter(d => d.properties.NAME === countryName)
      .attr("fill", "#c2c7cf");

    tooltip
      .style("opacity", 1)
      .html(
        `<strong>${countryName}</strong><br>` +
        `Fossil (coal + oil + gas): ` +
        (Number.isFinite(fossil) ? `${fossil.toFixed(2)} TWh` : "No data") +
        `<br>` +
        `Other sources: ` +
        (Number.isFinite(clean) ? `${clean.toFixed(2)} TWh` : "No data")
      )
      .style("left", event.pageX + 14 + "px")
      .style("top", event.pageY - 30 + "px");
  }

  function hideCountryTooltip(countryName) {
    svg.selectAll("path.country")
      .filter(d => d.properties.NAME === countryName)
      .attr("fill", "#d0d5db");

    tooltip.style("opacity", 0);
  }

  svg.append("g")
    .selectAll("path.country")
    .data(geojson.features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", "#d0d5db")
    .attr("stroke", "#555")
    .attr("stroke-width", 0.7)
    .on("mouseover", (event, d) => {
      const name = d.properties.NAME;
      showCountryTooltip(event, name);
    })
    .on("mousemove", (event, d) => {
      const name = d.properties.NAME;
      showCountryTooltip(event, name);
    })
    .on("mouseout", (event, d) => {
      const name = d.properties.NAME;
      hideCountryTooltip(name);
    });

  const groups = svg.append("g")
    .selectAll("g.country")
    .data(geojson.features)
    .enter()
    .append("g")
    .attr("class", "country-group")
    .attr("transform", d => {
      const c = path.centroid(d);
      return `translate(${c[0]}, ${c[1]})`;
    });

  groups.selectAll("path.triangle")
    .data(d => {
      const name = d.properties.NAME;
      const vals = valueByCountry.get(name);
      return SOURCES.map((s, i) => ({
        country: name,
        source: s,
        value: vals ? vals[s.key] : NaN,
        index: i
      }));
    })
    .enter()
    .append("path")
    .attr("class", "triangle")
    .attr("d", d => {
      if (!Number.isFinite(d.value)) return null;

      const h = heightScale(d.value);
      const x0 = -groupWidth / 2 + d.index * (triangleBase + gap);

      const xLeft = x0;
      const xRight = x0 + triangleBase;
      const xTip = x0 + triangleBase / 2;

      const yBase = 0;
      const yTip = -h;

      return `M ${xLeft},${yBase} L ${xRight},${yBase} L ${xTip},${yTip} Z`;
    })
    .attr("fill", d => color(d.source.key))
    .attr("stroke", "#222")
    .attr("stroke-width", 0.5)
    .on("mouseover", (event, d) => {
      showCountryTooltip(event, d.country);
    })
    .on("mousemove", (event, d) => {
      showCountryTooltip(event, d.country);
    })
    .on("mouseout", (event, d) => {
      hideCountryTooltip(d.country);
    });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .text(`Electricity from fossil fuels vs other sources in Europe, ${YEAR}`);

  const legend = svg.append("g")
    .attr("transform", `translate(${width - 260}, 60)`);

  SOURCES.forEach((s, i) => {
    const g = legend.append("g")
      .attr("transform", `translate(0, ${i * 18})`);

    g.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(s.key));

    g.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .style("font-size", "12px")
      .text(s.label);
  });
});
