{
    const width = 1200;
    const height = 600;

    const container = d3.select("#sankey_diagram");
    container.selectAll("*").remove();

    const svg = container
        .attr("width", width)
        .attr("height", height);

    const sankey = d3.sankey()
        .nodeWidth(25)
        .nodePadding(15)
        .extent([[10, 10], [width - 10, height - 10]])
        .nodeAlign(d3.sankeyLeft);

    const colorSources = d3.scaleOrdinal(d3.schemeTableau10);
    const colorCountries = d3.scaleOrdinal(d3.schemeObservable10);

    const getColor = (d) => {
        if (d.category === "root") return "#555555";
        if (d.category === "country") return colorCountries(d.name);
        if (d.category === "source") return colorSources(d.name);
        return "#ccc";
    };

    const TARGET_COUNTRIES = new Set([
        "Italy", "France", "Germany", "Spain", "United Kingdom",
        "Sweden", "Norway", "Netherlands", "Greece", "Switzerland"
    ]);

    const SOURCE_KEYS = {
        "Other renewables excluding bioenergy - TWh (adapted for visualization of chart electricity-prod-source-stacked)": "Other Renewables",
        "Electricity from bioenergy - TWh (adapted for visualization of chart electricity-prod-source-stacked)": "Bioenergy",
        "Electricity from solar - TWh (adapted for visualization of chart electricity-prod-source-stacked)": "Solar",
        "Electricity from wind - TWh (adapted for visualization of chart electricity-prod-source-stacked)": "Wind",
        "Electricity from hydro - TWh (adapted for visualization of chart electricity-prod-source-stacked)": "Hydro",
        "Electricity from nuclear - TWh (adapted for visualization of chart electricity-prod-source-stacked)": "Nuclear",
        "Electricity from oil - TWh (adapted for visualization of chart electricity-prod-source-stacked)": "Oil",
        "Electricity from gas - TWh (adapted for visualization of chart electricity-prod-source-stacked)": "Gas",
        "Electricity from coal - TWh (adapted for visualization of chart electricity-prod-source-stacked)": "Coal"
    };

    d3.csv("data/electricity-prod-source-stacked.csv").then(data => {

        data.forEach(d => {
            d.Year = +d.Year;
            Object.keys(SOURCE_KEYS).forEach(key => {
                d[key] = +d[key] || 0;
            });
        });

        function buildSankey(year) {

            svg.selectAll("*").remove();

            let activeNode = null;

            d3.select("#chart-title")
              .text(`Electricity production in European countries (${year})`)
              .style("font-size", "24px")
              .style("text-align", "center")
              .style("font-family", "sans-serif");

            let yearData = data.filter(d => d.Year === year && TARGET_COUNTRIES.has(d.Entity));

            yearData.forEach(d => {
                d.totalProduction = Object.keys(SOURCE_KEYS).reduce((sum, key) => sum + d[key], 0);
            });

            yearData.sort((a, b) => b.totalProduction - a.totalProduction);

            const selectedCountries = yearData;

            if (selectedCountries.length === 0) {
                svg.append("text").attr("x", width / 2).attr("y", height / 2).text("No data for these countries in " + year);
                return;
            }

            // prepare nodes and links
            const nodes = [];
            const links = [];

            const rootNodeName = `Total Production`;
            nodes.push({ name: rootNodeName, category: "root" });
            const rootIndex = 0;

            selectedCountries.forEach(d => {
                nodes.push({ name: d.Entity, category: "country" });
            });

            const countryIndices = new Map(selectedCountries.map((d, i) => [d.Entity, i + 1]));

            const sourceNames = Object.values(SOURCE_KEYS);
            const sourceStartIndex = nodes.length;

            sourceNames.forEach(s => {
                nodes.push({ name: s, category: "source" });
            });

            const sourceIndices = new Map(sourceNames.map((s, i) => [s, sourceStartIndex + i]));

            selectedCountries.forEach(d => {
                links.push({
                    source: rootIndex,
                    target: countryIndices.get(d.Entity),
                    value: d.totalProduction
                });
            });

            selectedCountries.forEach(d => {
                const countryIdx = countryIndices.get(d.Entity);
                Object.entries(SOURCE_KEYS).forEach(([csvKey, shortName]) => {
                    const val = d[csvKey];
                    if (val > 0.1) {
                        links.push({
                            source: countryIdx,
                            target: sourceIndices.get(shortName),
                            value: val
                        });
                    }
                });
            });

            const graph = sankey({
                nodes: nodes.map(d => Object.assign({}, d)),
                links: links.map(d => Object.assign({}, d))
            });

            const linkGroup = svg.append("g")
                .attr("fill", "none")
                .style("mix-blend-mode", "multiply");

            const linkData = linkGroup.selectAll("g")
                .data(graph.links)
                .join("g");

            const gradient = linkData.append("linearGradient")
                .attr("id", d => (d.uid = `link-${Math.random().toString(36).substr(2, 9)}`))
                .attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", d => d.source.x1)
                .attr("x2", d => d.target.x0);

            gradient.append("stop").attr("offset", "0%").attr("stop-color", d => getColor(d.source));
            gradient.append("stop").attr("offset", "100%").attr("stop-color", d => getColor(d.target));

            const linkPath = linkData.append("path")
                .attr("class", "sankey-link")
                .attr("d", d3.sankeyLinkHorizontal())
                .attr("stroke", d => `url(#${d.uid})`)
                .attr("stroke-width", d => Math.max(1, d.width))
                .attr("stroke-opacity", 0.5);

            linkPath.append("title")
                .text(d => `${d.source.name} - ${d.target.name}\n${d.value.toFixed(1)} TWh`);

            const resetView = () => {
                activeNode = null;
                d3.selectAll(".sankey-link")
                    .transition().duration(300)
                    .attr("stroke", d => `url(#${d.uid})`)
                    .style("stroke-opacity", 0.5);         
            };

            const node = svg.append("g")
                .selectAll("rect")
                .data(graph.nodes)
                .join("rect")
                .attr("x", d => d.x0).attr("y", d => d.y0)
                .attr("height", d => d.y1 - d.y0).attr("width", d => d.x1 - d.x0)
                .attr("fill", d => getColor(d))
                .attr("stroke", "#333")
                .style("cursor", "pointer");

            node.append("title")
                .text(d => `${d.name}\n${d.value.toFixed(1)} TWh`);

            node.on("click", function(event, d) {
                event.stopPropagation();

                if (activeNode === d) {
                    resetView();
                    return;
                }
                activeNode = d;

                d3.selectAll(".sankey-link")
                    .transition().duration(300)
                    .attr("stroke", link => {
                        const isConnected = (link.source === d || link.target === d);
                        return isConnected ? `url(#${link.uid})` : "#e0e0e0";
                    })
                    .style("stroke-opacity", link => {
                        const isConnected = (link.source === d || link.target === d);
                        return isConnected ? 0.8 : 0.1;
                    });
            });

            svg.on("click", () => {
                resetView();
            });

            // Labels
            svg.append("g")
                .attr("font-family", "sans-serif")
                .attr("font-size", 11)
                .selectAll("text")
                .data(graph.nodes)
                .join("text")
                .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
                .attr("y", d => (d.y1 + d.y0) / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
                .text(d => d.name)
                .style("font-weight", "bold")
                .style("opacity", d => (d.y1 - d.y0) > 5 ? 1 : 0)
                .style("pointer-events", "none");
        }

        const slider = d3.select("#yearSlider");
        const label = d3.select("#yearLabel");

        const minYear = d3.min(data, d => d.Year);
        const maxYear = d3.max(data, d => d.Year);

        if (!slider.empty()) {
            slider
                .attr("min", minYear)
                .attr("max", maxYear)
                .attr("value", 2020)
                .on("input", function () {
                    const year = +this.value;
                    label.text(year);
                    buildSankey(year);
                });

            label.text("2020");
        }

        buildSankey(2020);

    }).catch(err => {
        console.error("Error CSV:", err);
    });
}