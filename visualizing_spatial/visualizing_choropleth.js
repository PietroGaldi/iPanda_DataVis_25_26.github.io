Promise.all([
    d3.csv("data/per-capita-energy-use-europe.csv"),
    d3.json("https://raw.githubusercontent.com/leakyMirror/map-of-europe/master/TopoJSON/europe.topojson")
]).then(([rows, topo]) => {
    const geojson = topojson.feature(topo, topo.objects.europe);

    const COL = "Primary energy consumption per capita (kWh/person)";
    const YEAR = 2020;

    const ISO3_TO_ISO2 = {
      "ALB": "AL", "AND": "AD", "AUT": "AT", "BEL": "BE", "BGR": "BG",
      "BIH": "BA", "BLR": "BY", "CHE": "CH", "CYP": "CY", "CZE": "CZ",
      "DEU": "DE", "DNK": "DK", "ESP": "ES", "EST": "EE", "FIN": "FI",
      "FRA": "FR", "GBR": "GB", "GRC": "GR", "HRV": "HR", "HUN": "HU",
      "IRL": "IE", "ISL": "IS", "ITA": "IT", "KOS": "XK", "LIE": "LI",
      "LTU": "LT", "LUX": "LU", "LVA": "LV", "MDA": "MD", "MKD": "MK",
      "MLT": "MT", "MNE": "ME", "NLD": "NL", "NOR": "NO", "POL": "PL",
      "PRT": "PT", "ROU": "RO", "RUS": "RU", "SMR": "SM", "SRB": "RS",
      "SVK": "SK", "SVN": "SI", "SWE": "SE", "TUR": "TR", "UKR": "UA",
      "VAT": "VA"
    };

    const toNum = v => {
        if (v == null) return NaN;
        return +String(v).replace(/[^\d.+\-eE]/g, "");
    };

    const data = rows
        .filter(d => +d.Year === YEAR)
        .map(d => ({
            country: d.Entity,
            iso3: d.Code.trim(),
            iso2: ISO3_TO_ISO2[d.Code.trim()],
            value: toNum(d[COL])
        }))
        .filter(d => Number.isFinite(d.value));

    const valueByCountry = new Map(data.map(d => [d.country, d.value]));

    const width = 850;
    const height = 800;

    const svg = d3.select("#choropleth_map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const projection = d3.geoMercator()
        .center([20, 55])
        .scale(500)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // --- Continuous color scale ---
    const color = d3.scaleSequential(d3.interpolateReds)
        .domain(d3.extent(data, d => d.value));

    const tooltip = d3.select("#choropleth_map")
        .append("div")
        .style("position", "absolute")
        .style("background", "white")
        .style("padding", "8px 12px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    svg.selectAll("path.country")
        .data(geojson.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", d => {
            const name = d.properties.NAME;
            const v = valueByCountry.get(name);
            return Number.isFinite(v) ? color(v) : "#eee";
        })
        .attr("stroke", "#555")
        .attr("stroke-width", 0.7)
        .on("mouseover", (event, d) => {
            const name = d.properties.NAME;
            const v = valueByCountry.get(name);
            tooltip
                .style("opacity", 1)
                .html(
                    `<strong>${name}</strong><br>` +
                    (Number.isFinite(v) ? `${v.toLocaleString()} kWh/person` : "No data")
                );
        })
        .on("mousemove", event => {
            tooltip
                .style("left", event.pageX + 12 + "px")
                .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 35)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .text(`Primary energy consumption per capita in Europe in ${YEAR}`);

    // --- LEGEND ---
    const legendWidth = 500;
    const legendHeight = 22;
    const legendGroup = svg.append("g")
        .attr("transform", `translate(${width - 660}, ${height - 60})`);

    // Divide into n bins matching the number of colors (e.g., 8)
    const nColors = 8;
    const extent = d3.extent(data, d => d.value);
    const binStep = (extent[1] - extent[0]) / nColors;
    const bins = d3.range(extent[0], extent[1] + binStep, binStep);
    const binCenters = bins.slice(0, -1).map((d, i) => (bins[i] + bins[i+1]) / 2);

    const colorBins = d3.range(nColors).map(i => color(extent[0] + i * binStep));

    legendGroup.selectAll("rect")
        .data(colorBins)
        .enter()
        .append("rect")
        .attr("x", (d, i) => i * (legendWidth / nColors))
        .attr("y", 0)
        .attr("width", legendWidth / nColors)
        .attr("height", legendHeight)
        .attr("fill", d => d)
        .attr("stroke", "#555");

    const axisScale = d3.scaleLinear()
        .domain(extent)
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(axisScale)
        .tickValues(binCenters)
        .tickFormat(d3.format(".2s"))
        .tickSize(0)
        .tickPadding(8);

    legendGroup.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis)
        .select(".domain").remove();

    legendGroup.append("text")
        .attr("y", -8)
        .attr("x", 0)
        .style("font-size", "14px")
        .text("kWh per person (2020)");
});
