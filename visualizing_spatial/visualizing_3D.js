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
        "United States": "United States of America",
        "Democratic Republic of Congo": "Democratic Republic of the Congo",
        "Congo": "Republic of the Congo",
        "Czechia": "Czech Republic",
        "Myanmar": "Burma"
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
                ? `${v.toFixed(2)} tCO₂ per person`
                : "No data";

            return `
        <b>${geoName}</b><br>
        <b>${COL}</b>, ${YEAR}: ${valStr}
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
})
    .catch(err => {
        console.error("Error", err);
    });
