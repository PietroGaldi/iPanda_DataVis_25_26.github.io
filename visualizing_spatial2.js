// FILE: world_bubbles.js

const width = 1200;
const height = 650;

const svg = d3.select("#map_container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "#eef1f5");

// Proiezione geografica
const projection = d3.geoNaturalEarth1()
    .scale(230)
    .translate([width / 2, height / 2]);

const path = d3.geoPath(projection);

// === 1) LOAD GEOJSON AND CSV IN PARALLEL ===
Promise.all([
    d3.json("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"),
    d3.csv("data/per-capita-energy-use.csv")
]).then(([geo, rows]) => {

    // Convertitore numerico
    const toNum = v => +String(v).replace(/[^\d.+\-eE]/g, "");

    // Estraggo ultimo anno disponibile per ogni paese
    const latest = d3.rollup(
        rows,
        v => {
            const maxYear = d3.max(v, d => +d.Year);
            const entry = v.find(d => +d.Year === maxYear);
            return toNum(entry["Annual CO₂ emissions (per capita)"]);
        },
        d => d.Entity
    );

    // Preparo la scala del raggio
    const values = Array.from(latest.values());
    const radius = d3.scaleSqrt()
        .domain([0, d3.max(values)])
        .range([0, 30]);

    // Disegno mappa
    svg.append("g")
        .selectAll("path")
        .data(geo.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "#d0d5db")
        .attr("stroke", "#888")
        .attr("stroke-width", 0.5);

    // Disegno cerchi
    svg.append("g")
        .selectAll("circle")
        .data(geo.features)
        .enter()
        .append("circle")
        .attr("transform", d => {
            const c = path.centroid(d);
            return `translate(${c[0]}, ${c[1]})`;
        })
        .attr("r", d => {
            const name = d.properties.name;
            const val = latest.get(name);
            return val ? radius(val) : 0;
        })
        .attr("fill", "rgba(255, 70, 50, 0.65)")
        .attr("stroke", "#992222")
        .attr("stroke-width", 1)
        .append("title")
        .text(d => {
            const name = d.properties.name;
            const val = latest.get(name);
            return val ? `${name}: ${val.toFixed(3)}` : `${name}: no data`;
        });

        console.log("CSV: ", latest);
        console.log("GeoJSON: ", geo);
});
