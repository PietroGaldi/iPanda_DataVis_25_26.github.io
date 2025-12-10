{
  const YEAR = 2015;
  const TRADE_FLOW = "Export";
  const FLOWS_URL = "data/oil_country_flows_exports.geojson";
  const WORLD_GEO_URL = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

  const COLOR_BLUE_RGB = "51, 102, 204";
  const COLOR_RED_RGB = "255, 87, 34";

  const width = 900;
  const height = 800;

  const container = d3.select("#oil_flows_map");
  container.selectAll("*").remove();

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const defs = svg.append("defs");

  defs.append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -3 6 6")
    .attr("refX", 0)             
    .attr("refY", 0)
    .attr("markerWidth", 5)
    .attr("markerHeight", 5)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-2 L5,0 L0,2 L1,0") 
    .attr("fill", "context-stroke")
    .attr("stroke", "none"); 

  const projection = d3.geoMercator()
    .center([5, 57])
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

  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .on("click", resetSelection); 

  const gMap = svg.append("g").attr("class", "base-map");
  const gFlows = svg.append("g").attr("class", "flows");
  const gNodes = svg.append("g").attr("class", "nodes");

  let selectedNodeId = null;

  const EURO_ISO3 = new Set([
    "ALB", "AND", "AUT", "BEL", "BGR", "BIH", "BLR", "CHE", "CYP", "CZE",
    "DEU", "DNK", "ESP", "EST", "FIN", "FRA", "GBR", "GRC", "HRV", "HUN",
    "IRL", "ISL", "ITA", "KOS", "LIE", "LTU", "LUX", "LVA", "MDA", "MKD",
    "MLT", "MNE", "NLD", "NOR", "POL", "PRT", "ROU", "RUS", "SMR", "SRB",
    "SVK", "SVN", "SWE", "TUR", "UKR", "VAT"
  ]);

  const MANUAL_LOCATIONS = {
    "RUS": [37.6, 55.7],
    "FRA": [2.5, 46.5],
    "NOR": [8.4, 60.5],
    "MLT": [14.4, 35.9]
  };

  function resetSelection() {
    selectedNodeId = null;
    updateVisualization();
  }

  function getStrokeColor(d, isHovered) {
    const isSelected = selectedNodeId !== null;
    const isSource = d.reporter === selectedNodeId;
    
    if (!isSelected) {
        return isHovered 
            ? `rgba(${COLOR_RED_RGB}, 1)` 
            : `rgba(${COLOR_BLUE_RGB}, 0.6)`;
    }

    if (isSource) {
        return `rgba(${COLOR_RED_RGB}, 1)`;
    } else {
        return `rgba(${COLOR_BLUE_RGB}, 0.1)`;
    }
  }

  function updateVisualization() {
    gFlows.selectAll("path.flow-line")
      .transition().duration(200)
      .attr("stroke", d => getStrokeColor(d, false)) 
      .selection()
      .each(function(d) {
        if (selectedNodeId && d.reporter === selectedNodeId) {
          d3.select(this).raise();
        }
      });

    gNodes.selectAll("circle.node")
      .transition().duration(200)
      .attr("fill", d => d.id === selectedNodeId ? `rgb(${COLOR_RED_RGB})` : "#d73027")
      .attr("stroke", d => d.id === selectedNodeId ? "#333" : "white")
      .attr("stroke-width", d => d.id === selectedNodeId ? 2 : 1);
  }

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
      .attr("stroke-width", 1)
      .on("click", resetSelection);

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
        if (c && !isNaN(c[0]) && !isNaN(c[1])) centroids[iso] = c;
      }
    });

    Object.keys(MANUAL_LOCATIONS).forEach(iso => {
      if (!centroids[iso] && EURO_ISO3.has(iso)) {
        const coords = projection(MANUAL_LOCATIONS[iso]);
        if (coords) centroids[iso] = coords;
      }
    });

    const flowFeatures = flowsGeojson.features || [];
    const links = [];
    const nodeTotals = {};

    flowFeatures.forEach(f => {
      const p = f.properties || {};
      if (p["Trade Flow"] === TRADE_FLOW && +p["Year"] === YEAR) {
        const reporter = p["Reporter ISO"];
        const partner = p["Partner ISO"];
        const value = +p["Trade Value (US$)"];
        if (centroids[reporter] && centroids[partner]) {
          links.push({ source: centroids[reporter], target: centroids[partner], reporter: reporter, partner: partner, value: value });
          nodeTotals[reporter] = (nodeTotals[reporter] || 0) + value;
          nodeTotals[partner] = (nodeTotals[partner] || 0) + value;
        }
      }
    });

    const linkValues = links.map(d => d.value).filter(v => v > 0);
    const maxLinkValue = d3.max(linkValues) || 1;
    const totalValues = Object.values(nodeTotals);
    const maxTotalValue = d3.max(totalValues) || 1;

    const widthScale = d3.scaleSqrt().domain([0, maxLinkValue]).range([0.5, 3.5]);
    const nodeRadiusScale = d3.scaleSqrt().domain([0, maxTotalValue]).range([2, 10]);

    gFlows.selectAll("path.flow-line")
      .data(links)
      .enter()
      .append("path")
      .attr("class", "flow-line")
      .attr("d", d => {
        const source = d.source;
        const target = d.target;
        
        const currentStroke = widthScale(d.value);
        const arrowLengthPixels = 5 * currentStroke;
        const nodeTotalRadius = nodeRadiusScale(nodeTotals[d.partner] || 0) + 1;
        
        const offset = nodeTotalRadius + arrowLengthPixels;

        const dx = target[0] - source[0];
        const dy = target[1] - source[1];
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) return null;

        const tx = target[0] - (dx * offset / dist);
        const ty = target[1] - (dy * offset / dist);

        return `M${source[0]},${source[1]} L${tx},${ty}`;
      })
      .attr("fill", "none")
      .attr("stroke", d => getStrokeColor(d, false))
      .attr("stroke-width", d => widthScale(d.value))
      .attr("stroke-linecap", "round")
      .attr("marker-end", "url(#arrow)")
      .style("mix-blend-mode", "multiply")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke", getStrokeColor(d, true))
          .raise();
        
        tooltip.style("opacity", 1)
          .html(`<strong>${d.reporter} &rarr; ${d.partner}</strong><br>$${d.value.toLocaleString()}`);
      })
      .on("mousemove", event => tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px"))
      .on("mouseout", function(event, d) {
        d3.select(this)
          .attr("stroke", getStrokeColor(d, false));
        tooltip.style("opacity", 0);
      });

    const nodesData = Object.keys(centroids).map(k => ({
      id: k, name: countryNames[k] || k, x: centroids[k][0], y: centroids[k][1], totalTrade: nodeTotals[k] || 0
    })).sort((a, b) => b.totalTrade - a.totalTrade);

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
      .on("click", function(event, d) {
        event.stopPropagation();
        if (selectedNodeId === d.id) {
            selectedNodeId = null;
        } else {
            selectedNodeId = d.id;
        }
        updateVisualization();
      })
      .on("mouseover", function(event, d) {
        d3.select(this).attr("r", nodeRadiusScale(d.totalTrade) + 3);
        tooltip.style("opacity", 1).html(`<strong>${d.name}</strong><br>Total Trade: $${d.totalTrade.toLocaleString()}`);
      })
      .on("mousemove", event => tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px"))
      .on("mouseout", function(event, d) {
        d3.select(this).attr("r", nodeRadiusScale(d.totalTrade));
        tooltip.style("opacity", 0);
      });

  }).catch(err => console.error("Error loading data:", err));
}