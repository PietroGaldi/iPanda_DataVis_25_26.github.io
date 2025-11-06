document.addEventListener("DOMContentLoaded", () => {

    d3.csv("data/electricity-prod-source-stacked.csv").then(rows => {
        const COUNTRIES = [
            "Italy", "France", "Germany", "Spain", "United Kingdom",
            "Sweden", "Norway", "Netherlands", "Greece", "Switzerland"
        ];

        const RENEW = [
            "Other renewables excluding bioenergy - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
            "Electricity from bioenergy - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
            "Electricity from solar - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
            "Electricity from wind - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
            "Electricity from hydro - TWh (adapted for visualization of chart electricity-prod-source-stacked)"
        ];

        const NONRENEW = [
            "Electricity from nuclear - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
            "Electricity from gas - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
            "Electricity from oil - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
            "Electricity from coal - TWh (adapted for visualization of chart electricity-prod-source-stacked)"
        ];

        const v = (r, k) => (r && r[k] != null && r[k] !== "" ? +r[k] : 0);

        const BINS = [
            [2000, 2004], [2005, 2009], [2010, 2014], [2015, 2019], [2020, 2024]
        ];
        const binLabel = ([a, b]) => `${a}-${b}`;

        const rowsSel = rows.filter(d =>
            COUNTRIES.includes(d.Entity) && +d.Year >= 2000 && +d.Year <= 2024
        );

        const byCY = new Map();
        rowsSel.forEach(r => byCY.set(`${r.Entity}|${r.Year}`, r));

        const panelData = COUNTRIES.map(country => {
            return BINS.map(([a, b]) => {
                let rsum = 0, nsum = 0;
                for (let y = a; y <= b; y++) {
                    const row = byCY.get(`${country}|${y}`);
                    if (!row) continue;
                    rsum += d3.sum(RENEW, k => v(row, k));
                    nsum += d3.sum(NONRENEW, k => v(row, k));
                }
                const tot = rsum + nsum;
                return {
                    country,
                    label: binLabel([a, b]),
                    renew: tot > 0 ? -(rsum / tot) : 0,
                    nonren: tot > 0 ? (nsum / tot) : 0
                };
            });
        });

        const cols = 5, rowsGrid = 2;
        const wEach = 230, hEach = 250;
        const margin = { top: 70, right: 28, bottom: 36, left: 72 };
        const cellW = wEach - margin.left - margin.right;
        const cellH = hEach - margin.top - margin.bottom;
        const width = cols * wEach + 40;
        const height = rowsGrid * hEach + 50;

        const svg = d3.select("#pyramid_europe_5y")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("background", "#f9f9f9");

        const fmt = d3.format(".0%");
        const x = d3.scaleLinear().domain([-1, 1]).range([0, cellW]);
        const y = d3.scaleBand().domain(BINS.map(binLabel)).range([0, cellH]).padding(0.18);

        panelData.forEach((arr, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const g = svg.append("g")
                .attr("transform", `translate(${col * wEach + margin.left}, ${row * hEach + margin.top})`);

            g.append("text")
                .attr("x", cellW / 2)
                .attr("y", -10)
                .attr("text-anchor", "middle")
                .style("font-weight", 700)
                .text(arr[0].country);

            g.append("g")
                .call(d3.axisLeft(y).tickSize(0))
                .call(s => s.select(".domain").remove())
                .selectAll("text")
                .style("font-size", "10px")
                .style("font-weight", 500);

            g.append("g")
                .attr("transform", `translate(0,${cellH})`)
                .call(d3.axisBottom(x)
                    .tickValues([-1, -0.5, 0, 0.5, 1])
                    .tickFormat(t => t === 0 ? "0%" : fmt(Math.abs(t))))
                .selectAll("text")
                .style("font-size", "9px");

            g.append("line")
                .attr("x1", x(0)).attr("x2", x(0))
                .attr("y1", 0).attr("y2", cellH)
                .attr("stroke", "#c7c9d3");

            g.selectAll("rect.renew")
                .data(arr)
                .enter().append("rect")
                .attr("class", "renew")
                .attr("y", d => y(d.label))
                .attr("x", d => x(Math.min(0, d.renew)))
                .attr("width", d => Math.abs(x(d.renew) - x(0)))
                .attr("height", y.bandwidth())
                .attr("fill", "green");

            g.selectAll("rect.nonren")
                .data(arr)
                .enter().append("rect")
                .attr("class", "nonren")
                .attr("y", d => y(d.label))
                .attr("x", x(0))
                .attr("width", d => Math.abs(x(d.nonren) - x(0)))
                .attr("height", y.bandwidth())
                .attr("fill", "#232B49");
        });

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 24)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .text("Renewable vs Non-Renewable electricity production (2000-2024)");
    });



});