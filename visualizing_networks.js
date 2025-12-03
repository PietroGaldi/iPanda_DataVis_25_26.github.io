// --------------------------------------------------------
// CONFIGURATION
// --------------------------------------------------------
const width = 1100;
const height = 600;

const svg = d3.select("#sankey_diagram")
    .attr("width", width)
    .attr("height", height);

const sankey = d3.sankey()
    .nodeWidth(20)
    .nodePadding(20)
    .extent([[20, 20], [width - 20, height - 20]]);

// Color scale for nodes
const color = d3.scaleOrdinal(d3.schemeTableau10);

// Valid years
const YEARS = d3.range(1980, 2025);

// --------------------------------------------------------
// LOAD DATA
// --------------------------------------------------------
Promise.all([
    d3.csv("co-emissions-per-capita.csv"),
    d3.csv("per-capita-energy-use.csv"),
    d3.csv("electricity-prod-source-stacked.csv")
]).then(([co2, energy, elec]) => {

    // --------------------------------------------
    // 1. Preprocess CO2 per capita
    // --------------------------------------------
    const co2Global = d3.rollup(
        co2,
        v => d3.sum(v, d => +d["Annual CO₂ emissions (per capita)"] || 0),
        d => +d.Year
    );

    // --------------------------------------------
    // 2. Preprocess energy use per capita
    // --------------------------------------------
    const energyGlobal = d3.rollup(
        energy,
        v => d3.sum(v, d => +d["Primary energy consumption per capita"] || 0),
        d => +d.Year
    );

    // --------------------------------------------
    // 3. Preprocess electricity production
    //    SUM all countries → global values per source
    // --------------------------------------------
    const elecGlobal = d3.rollup(
        elec,
        v => ({
            other: d3.sum(v, d => +d["Other renewables excluding bioenergy - TWh (adapted for visualization of chart electricity-prod-source-stacked)"] || 0),
            bio:   d3.sum(v, d => +d["Electricity from bioenergy - TWh (adapted for visualization of chart electricity-prod-source-stacked)"] || 0),
            solar: d3.sum(v, d => +d["Electricity from solar - TWh (adapted for visualization of chart electricity-prod-source-stacked)"] || 0),
            wind:  d3.sum(v, d => +d["Electricity from wind - TWh (adapted for visualization of chart electricity-prod-source-stacked)"] || 0),
            hydro: d3.sum(v, d => +d["Electricity from hydro - TWh (adapted for visualization of chart electricity-prod-source-stacked)"] || 0),
            nuclear: d3.sum(v, d => +d["Electricity from nuclear - TWh (adapted for visualization of chart electricity-prod-source-stacked)"] || 0),
            oil:   d3.sum(v, d => +d["Electricity from oil - TWh (adapted for visualization of chart electricity-prod-source-stacked)"] || 0),
            gas:   d3.sum(v, d => +d["Electricity from gas - TWh (adapted for visualization of chart electricity-prod-source-stacked)"] || 0),
            coal:  d3.sum(v, d => +d["Electricity from coal - TWh (adapted for visualization of chart electricity-prod-source-stacked)"] || 0)
        }),
        d => +d.Year
    );

    // --------------------------------------------------------
    // BUILD SANKEY FOR SPECIFIC YEAR
    // --------------------------------------------------------
    function buildSankey(year) {

        svg.selectAll("*").remove(); // Clear previous frame

        // --- energy + co2 for that year ---
        const energyVal = energyGlobal.get(year) || 0;
        const co2Val = co2Global.get(year) || 0;

        // --- electricity mix for that year ---
        const e = elecGlobal.get(year);
        if (!e) return;

        // ----------------------------------------
        // NODES
        // ----------------------------------------
        const nodes = [
            { name: "Other renewables" },
            { name: "Bioenergy" },
            { name: "Solar" },
            { name: "Wind" },
            { name: "Hydro" },
            { name: "Nuclear" },
            { name: "Oil" },
            { name: "Gas" },
            { name: "Coal" },
            { name: "Total Energy Use" },
            { name: "CO₂ Emissions" }
        ];

        // Node index helper
        const idx = Object.fromEntries(nodes.map((d, i) => [d.name, i]));

        // ----------------------------------------
        // LINKS
        // ----------------------------------------
        const links = [
            { source: idx["Other renewables"], target: idx["Total Energy Use"], value: e.other },
            { source: idx["Bioenergy"],        target: idx["Total Energy Use"], value: e.bio },
            { source: idx["Solar"],            target: idx["Total Energy Use"], value: e.solar },
            { source: idx["Wind"],             target: idx["Total Energy Use"], value: e.wind },
            { source: idx["Hydro"],            target: idx["Total Energy Use"], value: e.hydro },
            { source: idx["Nuclear"],          target: idx["Total Energy Use"], value: e.nuclear },
            { source: idx["Oil"],              target: idx["Total Energy Use"], value: e.oil },
            { source: idx["Gas"],              target: idx["Total Energy Use"], value: e.gas },
            { source: idx["Coal"],             target: idx["Total Energy Use"], value: e.coal },

            // Total energy flows to CO2
            { source: idx["Total Energy Use"], target: idx["CO₂ Emissions"], value: energyVal }
        ];

        const graph = sankey({
            nodes: nodes.map(d => Object.assign({}, d)),
            links: links.map(d => Object.assign({}, d))
        });

        // ----------------------------------------
        // DRAW LINKS
        // ----------------------------------------
        svg.append("g")
            .selectAll("path")
            .data(graph.links)
            .join("path")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke", d => color(d.source.name))
            .attr("stroke-width", d => Math.max(1, d.width))
            .attr("fill", "none")
            .attr("opacity", 0.4);

        // ----------------------------------------
        // DRAW NODES
        // ----------------------------------------
        const nodeGroup = svg.append("g")
            .selectAll("g")
            .data(graph.nodes)
            .join("g");

        nodeGroup.append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", d => color(d.name))
            .attr("stroke", "#000");

        nodeGroup.append("text")
            .attr("x", d => d.x0 - 6)
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("text-anchor", "end")
            .attr("dy", "0.35em")
            .text(d => d.name)
            .filter(d => d.x0 < width / 2)
            .attr("x", d => d.x1 + 6)
            .attr("text-anchor", "start");

        // Title
        svg.append("text")
            .attr("x", 30)
            .attr("y", 20)
            .attr("font-size", "20px")
            .attr("font-weight", "bold")
            .text("Global Energy Flow, Year " + year);
    }

    // --------------------------------------------------------
    // SLIDER
    // --------------------------------------------------------
    const slider = d3.select("#yearSlider")
        .attr("min", 1980)
        .attr("max", 2024)
        .attr("value", 1980)
        .on("input", function () {
            const year = +this.value;
            buildSankey(year);
            d3.select("#yearLabel").text(year);
        });

    // Initial draw
    buildSankey(1980);
    d3.select("#yearLabel").text("1980");
});
