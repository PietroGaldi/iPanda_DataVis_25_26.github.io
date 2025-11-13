d3.csv("data/co-emissions-per-capita-europe.csv").then(rows => {
    const COUNTRIES = ["Germany", "United Kingdom",
        "Norway", "Netherlands", "Greece",
    ];

    const COL = "Annual_CO2_emissions";

    const toNum = v => {
        if (v == null) return NaN;
        const s = String(v).replace(/[^\d.+\-eE]/g, "");
        return parseFloat(s);
    };

    const data = rows
        .filter(d => COUNTRIES.includes(d.Entity) && d.Year >= 1900)
        .map(d => ({
            country: d.Entity,
            year: +d.Year,
            value: toNum(d[COL])
        }))
        .filter(d => Number.isFinite(d.year) && Number.isFinite(d.value));

    const byCountry = d3.groups(data, d => d.country)
        .map(([country, arr]) => {
            const values = arr.sort((a, b) => d3.ascending(a.year, b.year));
            const meanValue = d3.mean(values, d => d.value);
            return { country, values, meanValue };
        })
        .sort((a, b) => d3.descending(a.meanValue, b.meanValue));

    const width = 1250, height = 520;
    const margin = { top: 56, right: 155, bottom: 60, left: 85 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select("#co2_area_chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "#f9f9f9");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .nice()
        .range([0, innerW]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value) * 1.05])
        .nice()
        .range([innerH, 0]);

    const color = d3.scaleOrdinal()
        .domain(COUNTRIES)
        .range(d3.schemeTableau10);

    const area = d3.area()
        .x(d => x(d.year))
        .y0(innerH)
        .y1(d => y(d.value))
        .defined(d => Number.isFinite(d.value));

    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")));

    g.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("x", -innerH / 2)
        .attr("y", -55)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("fill", "#333")
        .text("CO2 per capita (tons)");

    const title = svg.append("text")
        .attr("x", width / 2)
        .attr("y", 26)
        .attr("text-anchor", "middle")
        .style("font-size", "18px");

    title.append("tspan")
        .text("CO2 emissions per capita over time ")
        .attr("fill", "#333");

    const selected = new Set();

    const countryGroups = g.selectAll(".country-area")
        .data(byCountry)
        .enter()
        .append("g")
        .attr("class", "country-area");

    const paths = countryGroups.append("path")
        .attr("class", "area")
        .attr("d", d => area(d.values))
        .attr("fill", d => color(d.country))
        .attr("stroke", d => color(d.country))
        .attr("stroke-width", 1.2)
        .attr("opacity", 0.75);


    function updateHighlight() {
        if (selected.size === 0) {
            paths
                .attr("fill", d => color(d.country))
                .attr("stroke", d => color(d.country))
                .attr("opacity", 0.75);

            legendItems.attr("opacity", 1);
        } else {
            paths
                .attr("fill", d => color(d.country))
                .attr("stroke", d => color(d.country))
                .attr("opacity", d => selected.has(d.country) ? 0.9 : 0.05);

            legendItems
                .attr("opacity", d => selected.has(d) ? 1 : 0.3);
        }
        updateLegendVisual();

    }


    const legend = svg.append("g")
        .attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);

    const legendItems = legend.selectAll(".legend-item")
        .data(COUNTRIES)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 24})`)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            if (selected.has(d)) {
                selected.delete(d);
            } else {
                selected.add(d);
            }
            updateHighlight();
            updateLegendVisual();
        })
        .on("mouseover", function () {
            d3.select(this).select("circle").attr("stroke-width", 2);
        })
        .on("mouseout", function () {
            d3.select(this).select("circle").attr("stroke-width", 1);
        });

    legendItems.append("circle")
        .attr("cx", 7)
        .attr("cy", 0)
        .attr("r", 7)
        .attr("fill", d => color(d))
        .attr("stroke", "#333")
        .attr("stroke-width", 1);

    legendItems.append("text")
        .attr("x", 22)
        .attr("y", 1)
        .text(d => d)
        .style("font-size", "12px")
        .style("alignment-baseline", "middle");

    function updateLegendVisual() {
        legendItems.select("circle")
            .attr("opacity", d => selected.size === 0 ? 1 : (selected.has(d) ? 1 : 0.15))
            .attr("fill", d => color(d));
    }

    updateHighlight();
});
