const width = 1000;
const height = 600;

d3.select("#cartogram_map")
    .style("display", "flex")
    .style("justify-content", "center")
    .style("align-items", "center")
    .style("width", "100%")
    .style("margin", "0 auto");

const svg = d3.select("#cartogram_map")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

const projection = d3.geoNaturalEarth1()
    .scale(width / 6.5)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("padding", "10px")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font-size", "14px");

let worldData, energyData;

Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.csv("data/per-capita-energy-use.csv")
]).then(function([world, energy]) {
    worldData = world;
    
    console.log("Dati CSV caricati:", energy);
    
    const years = [...new Set(energy.map(d => +d.Year))].sort((a, b) => b - a);
    const latestYear = years[0];
    const latestData = energy.filter(d => +d.Year === latestYear);
    
    latestData.forEach(d => {
        d.energy = +d["Primary energy consumption per capita (kWh/person)"];
        d.year = +d.Year;
    });
    
    console.log(`Anno più recente: ${latestYear}`);
    console.log(`Paesi con dati: ${latestData.length}`);
    
    energyData = latestData;
    
    createImprovedCartogram(world, latestData);
    
}).catch(function(error) {
    console.error("Errore nel caricamento dei dati:", error);
    createEmptyMap();
});

function createImprovedCartogram(world, energy) {
    svg.selectAll("*").remove();
    
    const countries = topojson.feature(world, world.objects.countries);
    
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#e6f3ff");
    
    const energyByCountry = {};

    const nameMapping = {
        "United States": "United States of America",
        "United States of America": "United States of America",
        "USA": "United States of America",
        "Russia": "Russian Federation",
        "Russian Federation": "Russian Federation",
        "RUS": "Russian Federation",
        "South Korea": "Republic of Korea",
        "Korea, Rep.": "Republic of Korea",
        "KOR": "Republic of Korea",
        "Iran": "Iran (Islamic Republic of)",
        "Iran, Islamic Rep.": "Iran (Islamic Republic of)",
        "IRN": "Iran (Islamic Republic of)",
        "Venezuela": "Venezuela (Bolivarian Republic of)",
        "VEN": "Venezuela (Bolivarian Republic of)",
        "Syria": "Syrian Arab Republic",
        "SYR": "Syrian Arab Republic",
        "Moldova": "Republic of Moldova",
        "MDA": "Republic of Moldova",
        "Laos": "Lao People's Democratic Republic",
        "LAO": "Lao People's Democratic Republic",
        "North Korea": "Democratic People's Republic of Korea",
        "PRK": "Democratic People's Republic of Korea",
        "Congo, Dem. Rep.": "Democratic Republic of the Congo",
        "COD": "Democratic Republic of the Congo",
        "Congo, Rep.": "Republic of the Congo",
        "COG": "Republic of the Congo",
        "Egypt": "Egypt, Arab Rep.",
        "EGY": "Egypt, Arab Rep.",
        "Tanzania": "United Republic of Tanzania",
        "TZA": "United Republic of Tanzania"
    };
    
    energy.forEach(d => {
        const mappedName = nameMapping[d.Entity] || d.Entity;
        energyByCountry[mappedName] = d.energy;
        energyByCountry[d.Code] = d.energy;
    });
    
    console.log("Energia per USA:", energyByCountry["United States of America"]);
    console.log("Energia per Cina:", energyByCountry["China"]);
    console.log("Energia per India:", energyByCountry["India"]);
    
    const energyValues = energy.map(d => d.energy).filter(d => d > 0);
    const sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(energyValues)])
        .range([0.7, 2.5]);
    
    svg.selectAll("path.country-base")
        .data(countries.features)
        .enter()
        .append("path")
        .attr("class", "country-base")
        .attr("d", path)
        .attr("fill", "#f0f0f0")
        .attr("stroke", "#ddd")
        .attr("stroke-width", 0.3)
        .attr("opacity", 0.4);

    const countryPaths = svg.selectAll("path.country-scaled")
        .data(countries.features)
        .enter()
        .append("path")
        .attr("class", "country-scaled")
        .attr("d", path)
        .attr("fill", d => {
            const countryEnergy = energyByCountry[d.properties.name];
            if (!countryEnergy) return "#d9d9d9";
            
            if (countryEnergy > 50000) return "#5D4037";
            if (countryEnergy > 20000) return "#795548";
            if (countryEnergy > 10000) return "#8D6E63";
            if (countryEnergy > 5000) return "#A1887F"; 
            return "#BCAAA4";
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.7)
        .attr("transform", function(d) {
            const countryEnergy = energyByCountry[d.properties.name] || 1000;
            const scale = sizeScale(countryEnergy);

            const centroid = path.centroid(d);
            if (!centroid || !centroid[0] || !centroid[1]) return "translate(0,0)";
            
            return `translate(${centroid[0]},${centroid[1]}) scale(${scale}) translate(${-centroid[0]},${-centroid[1]})`;
        })
        .on("mouseover", function(event, d) {
            const countryEnergy = energyByCountry[d.properties.name];
            const scale = countryEnergy ? sizeScale(countryEnergy) : 1;
            
            tooltip
                .style("opacity", 1)
                .html(`<strong>${d.properties.name}</strong><br>
                       Consumo energia: ${countryEnergy ? formatNumber(countryEnergy) + ' kWh/persona' : 'Dati non disponibili'}<br>
                       Fattore scala: ${scale.toFixed(2)}x`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
        });

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .text("Cartogramma - Consumo di Energia Pro Capite");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 55)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#666")
        .text("Aree proporzionali al consumo energetico (kWh/persona)");

    svg.append("text")
        .attr("x", width * 0.8)
        .attr("y", height * 0.5)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#4169E1")
        .attr("font-weight", "bold")
        .text("PACIFICO");

    svg.append("text")
        .attr("x", width * 0.3)
        .attr("y", height * 0.6)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#4169E1")
        .attr("font-weight", "bold")
        .text("ATLANTICO");

    svg.append("text")
        .attr("x", width * 0.8)
        .attr("y", height * 0.8)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#4169E1")
        .text("INDIANO");

    const legend = svg.append("g")
        .attr("transform", `translate(${width - 220}, ${height - 200})`);

    legend.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .text("Consumo energia (kWh/persona)");

    const legendData = [
        { color: "#BCAAA4", label: "< 5.000" },
        { color: "#A1887F", label: "5.000 - 10.000" },
        { color: "#8D6E63", label: "10.000 - 20.000" },
        { color: "#795548", label: "20.000 - 50.000" },
        { color: "#5D4037", label: "> 50.000" }
    ];

    legend.selectAll("rect.legend-color")
        .data(legendData)
        .enter()
        .append("rect")
        .attr("class", "legend-color")
        .attr("x", 0)
        .attr("y", (d, i) => i * 25)
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d => d.color)
        .attr("stroke", "#999");

    legend.selectAll("text.legend-label")
        .data(legendData)
        .enter()
        .append("text")
        .attr("class", "legend-label")
        .attr("x", 30)
        .attr("y", (d, i) => i * 25 + 15)
        .attr("font-size", "11px")
        .text(d => d.label);

    const latestYear = d3.max(energy.map(d => d.year));
    svg.append("text")
        .attr("x", width - 10)
        .attr("y", height - 10)
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .attr("fill", "#666")
        .text(`Dati: ${latestYear} | Scala aree: 0.7x - 2.5x`);
}

function createEmptyMap() {
    svg.selectAll("*").remove();
    
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Errore nel caricamento dei dati. Controlla la console.");
}

function formatNumber(num) {
    if (!num) return "N/A";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}