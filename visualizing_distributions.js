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
                .attr("fill", "#2ca02c");

            g.selectAll("rect.nonren")
                .data(arr)
                .enter().append("rect")
                .attr("class", "nonren")
                .attr("y", d => y(d.label))
                .attr("x", x(0))
                .attr("width", d => Math.abs(x(d.nonren) - x(0)))
                .attr("height", y.bandwidth())
                .attr("fill", "#14476cff");
        });

        const title = svg.append("text")
            .attr("x", width / 2)
            .attr("y", 24)
            .attr("text-anchor", "middle")
            .style("font-size", "18px");

        title.append("tspan")
            .text("Renewable ")
            .attr("fill", "#2ca02c")
            .style("font-weight", "600");

        title.append("tspan")
            .text("vs ")
            .attr("fill", "#333");

        title.append("tspan")
            .text("Non-Renewable ")
            .attr("fill", "#14476cff")
            .style("font-weight", "600");

        title.append("tspan")
            .text("electricity production (2000-2024)")
            .attr("fill", "#333");

    });

    d3.csv("data/per-capita-energy-use-europe.csv").then(rows => {
        const COUNTRIES = ["Norway", "Switzerland", "Sweden"];
        const COL = "Primary energy consumption per capita (kWh/person)";

        const data = rows
            .filter(d => COUNTRIES.includes(d.Entity))
            .map(d => ({ country: d.Entity, year: +d.Year, value: +d[COL] }))
            .filter(d => Number.isFinite(d.year) && Number.isFinite(d.value));

        if (!data.length) {
            console.error("Data not found for Norway/Switzerland/Sweden");
            return;
        }

        const decadeOf = y => Math.floor(y / 10) * 10;
        const decades = Array.from(new Set(data.map(d => decadeOf(d.year)))).sort((a, b) => a - b);

        const vmin = d3.min(data, d => d.value);
        const vmax = d3.max(data, d => d.value);
        const pad = (vmax - vmin) * 0.05 || 1;
        const xDomain = [vmin - pad, vmax + pad];

        const mean = arr => d3.mean(arr);
        const std = arr => {
            const m = mean(arr);
            const v = d3.mean(arr.map(x => (x - m) * (x - m)));
            return Math.sqrt(v || 0);
        };
        const gaussian = (x, mu, sigma) => Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));

        const byDecadeCountry = d3.rollup(
            data,
            v => v.map(d => d.value),
            d => decadeOf(d.year),
            d => d.country
        );

        const width = 860, height = 400;
        const margin = { top: 52, right: 56, bottom: 62, left: 100 };
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select("#nch_se_percap_ridge")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("background", "#f9f9f9");

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const colors = { "Norway": "#c78a08ff", "Switzerland": "#329cdaff", "Sweden": "#009E73" };
        const x = d3.scaleLinear().domain(xDomain).range([0, innerW]);

        const offsetStep = 42;
        const ridgeHeight = 28;
        const xVals = d3.range(xDomain[0], xDomain[1], (xDomain[1] - xDomain[0]) / 400);

        decades.forEach((dec, i) => {
            const valsNO = byDecadeCountry.get(dec)?.get("Norway") || [];
            const valsCH = byDecadeCountry.get(dec)?.get("Switzerland") || [];
            const valsSE = byDecadeCountry.get(dec)?.get("Sweden") || [];
            if (!valsNO.length && !valsCH.length && !valsSE.length) return;

            const stats = [
                { key: "Norway", vals: valsNO },
                { key: "Switzerland", vals: valsCH },
                { key: "Sweden", vals: valsSE }
            ].map(({ key, vals }) => {
                if (!vals.length) return { key, m: null, s: null, y: null };
                const m = mean(vals);
                const s = std(vals) || Math.max(0.05 * m, 1);
                const y = xVals.map(v => gaussian(v, m, s));
                return { key, m, s, y };
            });

            const yMax = d3.max(stats.map(s => s.y ? d3.max(s.y) : 0)) || 1;
            const yScale = d3.scaleLinear().domain([0, yMax]).range([0, ridgeHeight]);
            const baseline = innerH - i * offsetStep;

            stats.forEach(s => {
                if (!s.y) return;
                g.append("path")
                    .datum(xVals)
                    .attr("fill", colors[s.key])
                    .attr("opacity", 0.6)
                    .attr("d", d3.area()
                        .x(v => x(v))
                        .y0(baseline)
                        .y1((v, j) => baseline - yScale(s.y[j]))
                    );
            });

            g.append("text")
                .attr("x", - 35)
                .attr("y", baseline - 5)
                .text(`${dec}s`)
                .style("font-size", "10px")
                .style("fill", "#333");
        });

        g.append("g")
            .attr("transform", `translate(0, ${innerH})`)
            .call(d3.axisBottom(x).ticks(8))
            .append("text")
            .attr("x", innerW / 2)
            .attr("y", 40)
            .attr("fill", "#000")
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("kWh per person");

        const title = svg.append("text")
            .attr("x", width / 2)
            .attr("y", 26)
            .attr("text-anchor", "middle")
            .style("font-size", "18px");

        title.append("tspan")
            .text("Variation in energy use per capita by decade in ")
            .attr("fill", "#333");

        title.append("tspan")
            .text("Switzerland")
            .attr("fill", "#329cdaff")
            .style("font-weight", "600");

        title.append("tspan")
            .text(", ")
            .attr("fill", "#333");

        title.append("tspan")
          .text("Sweden ")
          .attr("fill", "#009E73")
          .style("font-weight", "600");

        title.append("tspan")
            .text("and ")
            .attr("fill", "#333");

        title.append("tspan")
            .text("Norway")
            .attr("fill", "#c78a08ff")
            .style("font-weight", "600");

    });

    d3.csv("data/co-emissions-per-capita-europe.csv").then(rows => {
        const COUNTRIES = [
            "Italy", "France", "Germany", "Spain", "United Kingdom",
            "Sweden", "Norway", "Netherlands", "Greece", "Switzerland"
        ];

        const candidates = [
            "Annual CO₂ emissions (per capita)",
            "Annual CO2 emissions (per capita)",
            "Annual_CO2_emissions",
            "Annual CO₂ emissions",
            "Annual CO2 emissions"
        ];
        const cols = Object.keys(rows[0] || {});
        const COL = candidates.find(c => cols.includes(c));
        if (!COL) {
            console.error("Column not found", cols);
            return;
        }

        const toNum = v => {
            if (v == null) return NaN;
            const s = String(v).replace(/[^\d.+\-eE]/g, "");
            return parseFloat(s);
        };

        const data = rows
            .filter(d => COUNTRIES.includes(d.Entity) && +d.Year >= 2000)
            .map(d => ({
                country: d.Entity,
                year: +d.Year,
                value: toNum(d[COL])
            }))
            .filter(d => Number.isFinite(d.value));

        const grouped = d3.groups(data, d => d.country)
            .map(([country, arr]) => {
                const vals = arr.map(d => d.value).sort(d3.ascending);
                const q1 = d3.quantile(vals, 0.25);
                const med = d3.quantile(vals, 0.5);
                const q3 = d3.quantile(vals, 0.75);
                const iqr = q3 - q1;
                const lowFence = q1 - 1.5 * iqr;
                const upFence = q3 + 1.5 * iqr;
                const min = d3.min(vals.filter(v => v >= lowFence)) ?? d3.min(vals);
                const max = d3.max(vals.filter(v => v <= upFence)) ?? d3.max(vals);
                const outliers = arr.filter(d => d.value < min || d.value > max);
                return { country, vals, stats: { q1, med, q3, min, max }, outliers };
            })
            .sort((a, b) => d3.ascending(a.stats.med, b.stats.med));

        const width = 950, height = 520;
        const margin = { top: 48, right: 28, bottom: 100, left: 80 };
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select("#co2_boxplot").append("svg")
            .attr("width", width).attr("height", height)
            .style("background", "#f9f9f9");

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(grouped.map(d => d.country))
            .range([0, innerW])
            .padding(0.35);

        const ymax = d3.max(grouped.flatMap(gd => gd.vals)) || 1;
        const y = d3.scaleLinear().domain([0, ymax * 1.05]).nice().range([innerH, 0]);

        const color = d3.scaleSequential()
            .domain(d3.extent(grouped, d => d.stats.med))
            .interpolator(d3.interpolateReds);

        const boxW = Math.max(14, x.bandwidth());

        const gCountry = g.selectAll(".bp").data(grouped).enter()
            .append("g").attr("class", "bp")
            .attr("transform", d => `translate(${x(d.country)},0)`);

        gCountry.append("line")
            .attr("x1", boxW / 2).attr("x2", boxW / 2)
            .attr("y1", d => y(d.stats.min)).attr("y2", d => y(d.stats.max))
            .attr("stroke", "#444");

        gCountry.append("rect")
            .attr("x", 0).attr("width", boxW)
            .attr("y", d => y(d.stats.q3))
            .attr("height", d => Math.max(1, y(d.stats.q1) - y(d.stats.q3)))

            .attr("fill", d => color(d.stats.med))
            .attr("stroke", "#333");

        gCountry.append("line")
            .attr("x1", 0).attr("x2", boxW)
            .attr("y1", d => y(d.stats.med)).attr("y2", d => y(d.stats.med))
            .attr("stroke", "#000").attr("stroke-width", 1.6);

        gCountry.append("line")
            .attr("x1", boxW * 0.25).attr("x2", boxW * 0.75)
            .attr("y1", d => y(d.stats.max)).attr("y2", d => y(d.stats.max))
            .attr("stroke", "#444");

        gCountry.append("line")
            .attr("x1", boxW * 0.25).attr("x2", boxW * 0.75)
            .attr("y1", d => y(d.stats.min)).attr("y2", d => y(d.stats.min))
            .attr("stroke", "#444");

        const jitter = d3.randomNormal.source(d3.randomLcg(42))(0, boxW * 0.08);
        gCountry.selectAll("circle.out")
            .data(d => d.outliers)
            .enter().append("circle")
            .attr("class", "out")
            .attr("cx", () => boxW / 2 + jitter())
            .attr("cy", d => y(d.value))
            .attr("r", 2)
            .attr("fill", "#c0392b")
            .attr("opacity", 0.8);

        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-28)")
            .style("text-anchor", "end")
            .style("font-size", "11px");

        g.append("g")
            .call(d3.axisLeft(y))
            .append("text")
            .attr("x", -innerH / 2).attr("y", -55)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .style("font-size", "13px").style("fill", "#333")
            .text("CO2 per capita (tons)");

        svg.append("text")
            .attr("x", width / 2).attr("y", 26)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .text("CO2 Emissions per Capita - Distribution by Country from 2000");

        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", "colorLegend")
            .attr("x1", "0%").attr("x2", "100%");

        gradient.selectAll("stop")
            .data(d3.ticks(0, 1, 10))
            .enter().append("stop")
            .attr("offset", d => `${d * 100}%`)
            .attr("stop-color", d => d3.interpolateReds(d));

        svg.append("rect")
            .attr("x", width / 2 - 100)
            .attr("y", height - 15)
            .attr("width", 200)
            .attr("height", 10)
            .style("fill", "url(#colorLegend)");

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height - 20)
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .text("Median CO2 per capita");

    });

});
