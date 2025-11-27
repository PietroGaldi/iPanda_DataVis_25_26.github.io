Promise.all([
    d3.csv("data/co-emissions-per-capita.csv"),
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
]).then(([rows, world]) => {

    const YEAR = 2020;
    const COL = "Annual CO2 emissions (per capita)";

    const container = d3.select("#choropleth_map3d");
    const width = 850;
    const height = 800;

    container.selectAll("*").remove();

    console.log("CSV rows:", rows.length);
    console.log("World features:", world.features.length);

    const toNum = v => {
        if (v == null || v === "") return NaN;
        return +String(v).replace(/[^\d.+\-eE]/g, "");
    };

    const valueByCountry = new Map();

    rows
        .filter(d => +d.Year === YEAR)
        .forEach(d => {
            const name = (d.Entity || "").trim();
            if (!name) return;

            const v = toNum(d[COL]);
            if (!Number.isFinite(v)) return;

            const prev = valueByCountry.get(name) || 0;
            valueByCountry.set(name, prev + v);
        });

    const values = Array.from(valueByCountry.values());
    console.log("N° paesi con dati:", values.length);

    const extent = d3.extent(values);
    console.log("Extent:", extent);

    const color = d3.scaleSequential()
        .domain(extent)
        .interpolator(d3.interpolateYlOrRd);

    const features = world.features;
    const globeElem = container.node();

    const NAME_FIX = {
      "United States of America": "United States",
      "Democratic Republic of the Congo": "Democratic Republic of Congo",
      "Republic of the Congo": "Congo",
      "Czech Republic": "Czechia",
      "Myanmar": "Myanmar",
      "United Kingdom": "United Kingdom",
      "England": "United Kingdom",
      "Serbia": "Serbia",
      "Republic of Serbia": "Serbia",
      "Russia": "Russian Federation",
      "Russian Federation": "Russia",
      "South Korea": "Korea, Rep.",
      "North Korea": "Korea, Dem. People's Rep.",
      "Ivory Coast": "Côte d'Ivoire",
      "Syria": "Syrian Arab Republic",
      "Vietnam": "Viet Nam",
      "Tanzania": "United Republic of Tanzania"
    };


    const worldGlobe = Globe()
        .width(width)
        .height(height)
        .globeImageUrl(null)
        .bumpImageUrl(null)
        .polygonsData(features)
        .polygonAltitude(0.01)
        .polygonSideColor(() => "rgba(0,0,0,0.25)")
        .polygonStrokeColor(() => "#111")
        .polygonCapColor(d => {
            const geoName = d.properties.name;
            const altName = NAME_FIX[geoName];
            const v = valueByCountry.get(geoName) ||
                (altName ? valueByCountry.get(altName) : undefined);

            if (!Number.isFinite(v)) return "rgba(220,220,220,0.9)";
            return color(v);
        })
        .polygonLabel(d => {
            const geoName = d.properties.name;
            const altName = NAME_FIX[geoName];
            const v = valueByCountry.get(geoName) ||
                (altName ? valueByCountry.get(altName) : undefined);

            const valStr = Number.isFinite(v)
                ? `${v.toFixed(2)} CO2 tons per person`
                : "No data";

            return `
        <b>${geoName}</b><br>
        ${valStr}
      `;
        })
        .polygonsTransitionDuration(200).globeMaterial(new THREE.MeshStandardMaterial({
    color: "#7fbfff",
    roughness: 20,
    metalness: 0.1
  }))
  .backgroundColor("#f5f5f5");
    worldGlobe(globeElem);
    worldGlobe.pointOfView({ lat: 20, lng: 0, altitude: 2.1 });

    const svgLegend = d3.select("#map_legend");

    const legendHeight = 200;
    const legendWidth = 20;

    const defs = svgLegend.append("defs");

    const linearGradient = defs.append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    const nSteps = 10;
    for (let i = 0; i <= nSteps; i++) {
        linearGradient.append("stop")
            .attr("offset", `${i / nSteps * 100}%`)
            .attr("stop-color", color(extent[0] + (extent[1] - extent[0]) * i / nSteps));
    }

    svgLegend.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)")
        .style("stroke", "#000");

    const legendScale = d3.scaleLinear()
        .domain(extent)
        .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(5);

    svgLegend.append("g")
        .attr("transform", `translate(${legendWidth}, 0)`)
        .call(legendAxis);
})
    .catch(err => {
        console.error("Error", err);
    });
