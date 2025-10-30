document.addEventListener("DOMContentLoaded", () => {
  d3.csv("data/global-energy-substitution.csv").then(rows => {
    console.log("CSV caricato, righe:", rows.length);

    // Filter only the rows for 2022, 2023, 2024
    const rowsSelected = rows.filter(d =>
        ["2022", "2023", "2024"].includes(d.Year) && d.Entity === "World"
    );

    if (rowsSelected.length === 0) {
        console.error("No rows found for 2022-2024 for World");
        return;
    }

    const allCols = Object.keys(rowsSelected[0]);

    const energyCols = allCols.filter(
        c => c !== "Entity" && c !== "Code" && c !== "Year"
    );

    const renameMap = {
      "Other renewables (TWh, substituted energy)": "Other renewables",
      "Biofuels (TWh, substituted energy)": "Biofuels",
      "Solar (TWh, substituted energy)": "Solar",
      "Wind (TWh, substituted energy)": "Wind",
      "Hydropower (TWh, substituted energy)": "Hydropower",
      "Nuclear (TWh, substituted energy)": "Nuclear",
      "Gas (TWh, substituted energy)": "Gas",
      "Oil (TWh, substituted energy)": "Oil",
      "Coal (TWh, substituted energy)": "Coal",
      "Traditional biomass (TWh, substituted energy)": "Biomass"
    };

    const data = energyCols.map(col => {
        const avgValue =
            d3.mean(rowsSelected, d => +d[col]);
        return {
            name: renameMap[col] || col,
            value: avgValue
        };
    });

    const width = 750;
    const height = 550;
    const margin = { top: 45, right: 40, bottom: 80, left: 90 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select("#energy_22_24_chart")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background", "#f9f9f9");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, innerWidth])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .nice()
      .range([innerHeight, 0]);

    g.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => x(d.name))
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => innerHeight - y(d.value))
      .attr("fill", "green");

    g.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-35)")
      .style("text-anchor", "end")
      .style("font-size", "11px");

    g.append("g")
      .call(d3.axisLeft(y))
      .append("text")
      .attr("class", "y-axis-label")
      .attr("x", -innerHeight / 2)
      .attr("y", -55)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .style("font-size", "13px")
      .style("fill", "#333")
      .text("TWh");

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 22)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .text("Average primary energy consumption by source");
  });
  d3.csv("data/per-capita-energy-use-europe.csv").then(rows => {
    const euroMain = [
      "Italy",
      "France",
      "Germany",
      "Spain",
      "United Kingdom",
      "Sweden",
      "Norway",
      "Netherlands",
      "Greece",
      "Switzerland"
    ];


    const filtered = rows.filter(d =>
      euroMain.includes(d.Entity) &&
      (d.Year === "2022" || d.Year === "2023" || d.Year === "2024")
    );

    filtered.forEach(d => {
      d.value = +d["Primary energy consumption per capita (kWh/person)"];
    });

    const countries = euroMain;
    const years = ["2022", "2023", "2024"];


    const data = countries.map(country => {
      const byYear = {};
      years.forEach(y => {
        const row = filtered.find(d => d.Entity === country && d.Year === y);
        byYear[y] = row ? row.value : 0;
      });
      return {
        country,
        ...byYear
      };
    });

    const width = 750;
    const height = 480;
    const margin = { top: 45, right: 30, bottom: 120, left: 90 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select("#energy_europe_grouped")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background", "#f9f9f9");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x0 = d3.scaleBand()
      .domain(countries)
      .range([0, innerWidth])
      .padding(0.2);

    const x1 = d3.scaleBand()
      .domain(years)
      .range([0, x0.bandwidth()])
      .padding(0.05);


    const y = d3.scaleLinear()
      .domain([
        0,
        d3.max(data, d => d3.max(years, year => d[year]))
      ])
      .nice()
      .range([innerHeight, 0]);


    const color = d3.scaleOrdinal()
      .domain(years)
      .range(["#1f77b4", "#ff7f0e", "#2ca02c"]);


    const groups = g.selectAll("g.country-group")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "country-group")
      .attr("transform", d => `translate(${x0(d.country)},0)`);

    groups.selectAll("rect")
      .data(d => years.map(year => ({ year, value: d[year], country: d.country })))
      .enter()
      .append("rect")
      .attr("x", d => x1(d.year))
      .attr("y", d => y(d.value))
      .attr("width", x1.bandwidth())
      .attr("height", d => innerHeight - y(d.value))
      .attr("fill", d => color(d.year));


    g.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x0))
      .selectAll("text")
      .attr("transform", "rotate(-40)")
      .style("text-anchor", "end")
      .style("font-size", "10px");


    const yAxis = g.append("g")
      .call(d3.axisLeft(y));

    yAxis.append("text")
      .attr("x", -innerHeight / 2)
      .attr("y", -55)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .style("font-size", "13px")
      .style("fill", "#333")
      .text("kWh per person");


    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .text("Per-capita energy consume in main european countries");


    const legend = svg.append("g")
      .attr("transform", `translate(${width - 200}, 55)`);

    years.forEach((year, i) => {
      const lg = legend.append("g")
        .attr("transform", `translate(0, ${i * 22})`);

      lg.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", color(year));

      lg.append("text")
        .attr("x", 20)
        .attr("y", 11)
        .text(year)
        .style("font-size", "12px")
        .attr("alignment-baseline", "middle");
    });
  });

});
