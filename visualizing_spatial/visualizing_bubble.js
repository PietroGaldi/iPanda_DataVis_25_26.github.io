const YEAR = 2020;

const width = 850;
const height = 800;

const svg = d3.select("#bubble_map")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("font-family", "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif");

svg.append("rect")
  .attr("x", 20)
  .attr("y", 20)
  .attr("width", width - 40)
  .attr("height", height - 40)
  .attr("fill", "#ffffff")
  .attr("rx", 16)
  .attr("ry", 16)
  .attr("stroke", "#e2e5ec")
  .attr("stroke-width", 1);

const defs = svg.append("defs");
const filter = defs.append("filter")
  .attr("id", "bubble-shadow")
  .attr("x", "-50%")
  .attr("y", "-50%")
  .attr("width", "200%")
  .attr("height", "200%");

filter.append("feDropShadow")
  .attr("dx", 0)
  .attr("dy", 1)
  .attr("stdDeviation", 2)
  .attr("flood-color", "#000000")
  .attr("flood-opacity", 0.18);

const tooltip = d3.select("#bubble_map")
  .append("div")
  .style("position", "absolute")
  .style("background", "white")
  .style("padding", "8px 12px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "6px")
  .style("box-shadow", "0 4px 12px rgba(0,0,0,0.1)")
  .style("pointer-events", "none")
  .style("font-size", "12px")
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

const toNum = v => {
  if (v == null) return NaN;
  return +String(v).replace(/[^\d.+\-eE]/g, "");
};

Promise.all([
  d3.csv("data/electricity-prod-source-stacked.csv"),
  d3.json("https://raw.githubusercontent.com/leakyMirror/map-of-europe/master/TopoJSON/europe.topojson")
]).then(([rows, topo]) => {

  const geojson = topojson.feature(topo, topo.objects.europe);

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

  const allClean = data.map(d => Number.isFinite(d.clean) ? d.clean : 0);
  const maxVal = d3.max(allClean);

  const maxRadius = 50;
  const radiusScale = d3.scaleSqrt()
    .domain([0, maxVal])
    .range([6, maxRadius]);

  const projection = d3.geoMercator()
    .center([20, 55])
    .scale(500)
    .translate([width / 2 + 80, height / 2]);

  const path = d3.geoPath().projection(projection);

  function showCountryTooltip(event, countryName) {
    const vals = valueByCountry.get(countryName);
    const clean  = vals ? vals.clean  : NaN;

    svg.selectAll("path.country")
      .filter(d => d.properties.NAME === countryName)
      .attr("fill", "#c2c7cf");

    tooltip
      .style("opacity", 1)
      .html(
        `<strong>${countryName}</strong><br>` +
        `Clean sources (renewables + nuclear): ` +
        (Number.isFinite(clean) ? `${clean.toFixed(2)} TWh` : "No data")
      )
      .style("left", (event.pageX + 14) + "px")
      .style("top", (event.pageY - 30) + "px");
  }

  function hideCountryTooltip(countryName) {
    svg.selectAll("path.country")
      .filter(d => d.properties.NAME === countryName)
      .attr("fill", "#e0e4ec");

    tooltip.style("opacity", 0);
  }

  svg.append("g")
    .attr("transform", "translate(0,10)")
    .selectAll("path.country")
    .data(geojson.features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", "#e0e4ec")
    .attr("stroke", "#9aa1b3")
    .attr("stroke-width", 0.6)
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
    .attr("transform", "translate(0,10)")
    .selectAll("g.country-group")
    .data(geojson.features)
    .enter()
    .append("g")
    .attr("class", "country-group")
    .attr("transform", d => {
      const c = path.centroid(d);
      return `translate(${c[0]}, ${c[1]})`;
    });

  groups.append("circle")
    .attr("class", "bubble")
    .attr("r", d => {
      const name = d.properties.NAME;
      const vals = valueByCountry.get(name);
      const cleanVal = vals ? vals.clean : NaN;
      return Number.isFinite(cleanVal) ? radiusScale(cleanVal) : 0;
    })
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("fill", "rgb(44, 160, 44)")
    .attr("fill-opacity", 0.9)
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .attr("filter", "url(#bubble-shadow)")
    .style("cursor", "pointer")
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

  // title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 60)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("fill", "#1f2933")
    .text(`Electricity from clean sources in Europe, ${YEAR}`);
});
