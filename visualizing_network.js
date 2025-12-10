{
const YEAR = 2015;
const TRADE_FLOW = "Export";
const FLOWS_URL = "data/oil_country_flows_exports.geojson";
const WORLD_GEO_URL = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";


const FLOW_COLOR = "#3366cc"; 

const width = 900;
const height = 800;

const container = d3.select("#oil_flows_map");
container.selectAll("*").remove();

const svg = container
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const projection = d3.geoMercator()
  .center([15, 55]) 
  .scale(650)
  .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

const tooltip = container
  .append("div")
  .style("position", "absolute")
  .style("background", "white")
  .style("padding", "8px 12px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "4px")
  .style("pointer-events", "none")
  .style("opacity", 0)
  .style("font-family", "sans-serif")
  .style("font-size", "12px")
  .style("z-index", 10);

const gMap = svg.append("g").attr("class", "base-map");
const gFlows = svg.append("g").attr("class", "flows");
const gNodes = svg.append("g").attr("class", "nodes");

const EURO_ISO3 = new Set([
  "ALB","AND","AUT","BEL","BGR","BIH","BLR","CHE","CYP","CZE",
  "DEU","DNK","ESP","EST","FIN","FRA","GBR","GRC","HRV","HUN",
  "IRL","ISL","ITA","KOS","LIE","LTU","LUX","LVA","MDA","MKD",
  "MLT","MNE","NLD","NOR","POL","PRT","ROU","RUS","SMR","SRB",
  "SVK","SVN","SWE","TUR","UKR","VAT"
]);

const MANUAL_LOCATIONS = {
  "RUS": [37.6, 55.7], 
  "FRA": [2.5, 46.5],  
  "NOR": [8.4, 60.5],  
  "MLT": [14.4, 35.9]  
};

Promise.all([
  d3.json(FLOWS_URL),
  d3.json(WORLD_GEO_URL)
]).then(([flowsGeojson, worldGeo]) => {

  const allFeatures = worldGeo.features || [];
  const euroFeatures = allFeatures.filter(d => EURO_ISO3.has(d.id));

  gMap.selectAll("path.country")
    .data(euroFeatures)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", "#f0f0f0")
    .attr("stroke", "#747474ff")
    .attr("stroke-width", 1);

  const centroids = {};
  const countryNames = {}; 

  euroFeatures.forEach(d => {
    const iso = d.id;
    countryNames[iso] = d.properties.name;
    
    if (MANUAL_LOCATIONS[iso]) {
      const projected = projection(MANUAL_LOCATIONS[iso]);
      if (projected) centroids[iso] = projected;
    } else {
      const c = path.centroid(d);
      if (c && !isNaN(c[0]) && !isNaN(c[1])) {
        centroids[iso] = c;
      }
    }
  });

  Object.keys(MANUAL_LOCATIONS).forEach(iso => {
    if (!centroids[iso] && EURO_ISO3.has(iso)) {
      const coords = projection(MANUAL_LOCATIONS[iso]);
      if (coords) {
        centroids[iso] = coords;
        if (iso === "MLT") countryNames[iso] = "Malta"; 
        else countryNames[iso] = iso; 
      }
    }
  });

  const flowFeatures = flowsGeojson.features || [];
  const links = [];
  
  const nodeTotals = {}; 

  flowFeatures.forEach(f => {
    const p = f.properties || {};
    const year = +p["Year"];
    const tradeFlow = p["Trade Flow"];
    const reporter = p["Reporter ISO"];
    const partner = p["Partner ISO"];
    const value = +p["Trade Value (US$)"];

    if (tradeFlow === TRADE_FLOW && year === YEAR) {
      if (centroids[reporter] && centroids[partner]) {
        links.push({
          source: centroids[reporter], 
          target: centroids[partner],  
          reporter: reporter,
          partner: partner,
          value: value
        });

        nodeTotals[reporter] = (nodeTotals[reporter] || 0) + value;
        nodeTotals[partner]  = (nodeTotals[partner] || 0) + value;
      }
    }
  });

  console.log(`Drawing ${links.length} point-to-point flows`);

  const linkValues = links.map(d => d.value).filter(v => v > 0);
  const maxLinkValue = d3.max(linkValues) || 1;
  const widthScale = d3.scaleSqrt().domain([0, maxLinkValue]).range([1, 8]);

  const totalValues = Object.values(nodeTotals);
  const maxTotalValue = d3.max(totalValues) || 1;

  const nodeRadiusScale = d3.scaleSqrt()
    .domain([0, maxTotalValue])
    .range([3, 15]);

  gFlows.selectAll("path.flow-line")
    .data(links)
    .enter()
    .append("path")
    .attr("class", "flow-line")
    .attr("d", d => `M${d.source[0]},${d.source[1]} L${d.target[0]},${d.target[1]}`)
    .attr("fill", "none")
    .attr("stroke", FLOW_COLOR)
    .attr("stroke-width", d => widthScale(d.value))
    .attr("stroke-opacity", 0.7)
    .attr("stroke-linecap", "round")
    .style("mix-blend-mode", "multiply")
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("stroke", "#ff5722")
        .attr("stroke-opacity", 1)
        .raise();

      tooltip.style("opacity", 1)
        .html(`
          <strong>${d.reporter} &rarr; ${d.partner}</strong><br>
          $${d.value.toLocaleString()}
        `);
    })
    .on("mousemove", event => {
      tooltip
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(event, d) {
      d3.select(this)
        .attr("stroke", FLOW_COLOR)
        .attr("stroke-opacity", 0.7);
      tooltip.style("opacity", 0);
    });

  const nodesData = Object.keys(centroids).map(k => ({
    id: k,
    name: countryNames[k] || k,
    x: centroids[k][0],
    y: centroids[k][1],
    totalTrade: nodeTotals[k] || 0
  }));

  nodesData.sort((a, b) => b.totalTrade - a.totalTrade);

  gNodes.selectAll("circle.node")
    .data(nodesData)
    .enter()
    .append("circle")
    .attr("class", "node")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", d => nodeRadiusScale(d.totalTrade))
    .attr("fill", "#d73027")
    .attr("stroke", "white")
    .attr("opacity", 0.9)
    .attr("stroke-width", 1)
    .attr("cursor", "pointer")
    .on("mouseover", function(event, d) {
      const currentR = nodeRadiusScale(d.totalTrade);
      d3.select(this)
        .attr("fill", "#ef4c43ff")
        .attr("r", currentR + 3);

      tooltip.style("opacity", 1)
        .html(`
          <strong>${d.name}</strong> <span style="color:#666; font-size:11px">(${d.id})</span><br>
          Total Trade Vol: <strong>$${d.totalTrade.toLocaleString()}</strong>
        `);
    })
    .on("mousemove", event => {
      tooltip
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(event, d) {
      d3.select(this)
        .attr("fill", "#d73027")
        .attr("r", nodeRadiusScale(d.totalTrade));
      tooltip.style("opacity", 0);
    });
    
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .style("font-size", "22px")
    .style("font-family", "sans-serif")
    .style("fill", "#333")
    .text(`Oil Export Flows (${YEAR})`);

}).catch(err => {
  console.error("Error loading data:", err);
});
}