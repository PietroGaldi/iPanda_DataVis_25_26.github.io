document.addEventListener("DOMContentLoaded", () => {
  // Simple barplot on average primary energy consumption by source (considering 2022-2024)
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
      .text("Average primary energy consumption by source 2022-2024");
  });
  
  // Grouped barchart on per-capita energy use in main european countries (considering 2022-2024)
  d3.csv("data/per-capita-energy-use-europe.csv").then(rows => {
    const countries = [
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
      countries.includes(d.Entity) &&
      (d.Year === "2022" || d.Year === "2023" || d.Year === "2024")
    );

    filtered.forEach(d => {
      d.value = +d["Primary energy consumption per capita (kWh/person)"];
    });

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

  //Heatmap of CO2 emission per capita in main European countries, considering years 2021-2023
  d3.csv("data/co-emissions-per-capita-europe.csv", function(d) {

      const co2Col = "Annual_CO2_emissions";
      const yearValue = d.Year ? String(d.Year).trim() : null; 
      const countryValue = d.Entity ? d.Entity.trim() : null;
      const co2Value = +d[co2Col];

      if (isNaN(co2Value) || !countryValue || !yearValue) return null;

      return {
          Country: countryValue,
          Year: yearValue,
          CO2_per_capita: co2Value
      };
  }).then(rows => {

      const countries = [
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

      const years = ["2021", "2022", "2023"]; 

      const heatmapData = rows.filter(d =>
          countries.includes(d.Country) &&
          years.includes(d.Year) 
      );

      const sortedData = countries.flatMap(country =>
          years.map(year =>
              heatmapData.find(d => d.Country === country && d.Year === year)
          ).filter(d => d)
      );

      const margin = { top: 60, right: 100, bottom: 40, left: 120 };
      const width = 800 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;
      const svg = d3.select("#co2_heatmap")
          .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleBand()
          .domain(years)
          .range([0, width])
          .padding(0); 

      const yScale = d3.scaleBand()
          .domain(countries) 
          .range([0, height])
          .padding(0); 
          
      const minCO2 = d3.min(sortedData, d => d.CO2_per_capita);
      const maxCO2 = d3.max(sortedData, d => d.CO2_per_capita);
      const flareColors = [
        "#410a26",
        "#631536",
        "#862643",
        "#a63e52",
        "#c45b63",
        "#db7c7e",
        "#e39e9c",
        "#ecc0ba"
      ];
      const colorScale = d3.scaleSequential() 
          .domain([maxCO2, minCO2])
          .interpolator(d3.interpolateRgbBasis(flareColors)); 

      svg.selectAll(".cell")
          .data(sortedData)
          .enter()
          .append("rect")
          .attr("class", "cell")
          .attr("x", d => xScale(d.Year))
          .attr("y", d => yScale(d.Country))
          .attr("width", xScale.bandwidth())
          .attr("height", yScale.bandwidth())
          .style("fill", d => colorScale(d.CO2_per_capita));

      svg.append("g")
          .attr("transform", `translate(0, ${height})`)
          .call(d3.axisBottom(xScale).tickSize(0))
          .select(".domain").remove(); 

      svg.append("g")
          .call(d3.axisLeft(yScale).tickSize(0))
          .select(".domain").remove(); 

      svg.append("text")
          .attr("x", width / 2)
          .attr("y", -30) 
          .attr("text-anchor", "middle")
          .style("font-size", "18px")
          .text("CO2 emissions per capita, 2021-2023");

      svg.append("text")
          .attr("x", width / 2)
          .attr("y", height + 35)
          .attr("text-anchor", "middle")
          .style("font-size", "13px")
          .text("Year");

      svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", -margin.left + 20)
          .attr("x", -(height / 2))
          .attr("text-anchor", "middle")
          .style("font-size", "13px")
          .text("Country");

      const defs = svg.append("defs");
      const linearGradient = defs.append("linearGradient")
          .attr("id", "linear-gradient")
          .attr("x1", "0%")
          .attr("y1", "0%")
          .attr("x2", "0%") 
          .attr("y2", "100%");

      linearGradient.selectAll("stop")
          .data(colorScale.ticks(5).map((t, i, n) => ({ 
               offset: `${100 * i / (n.length - 1)}%`, 
               color: colorScale(t) 
          })))
          .enter().append("stop")
          .attr("offset", d => d.offset)
          .attr("stop-color", d => d.color);

      const legendX = width + 42;
      const legendY = 0;
      const legendWidth = 20;
      const legendHeight = height;

      const legendGroup = svg.append("g")
          .attr("transform", `translate(${legendX}, ${legendY})`);

      legendGroup.append("rect")
          .attr("width", legendWidth)
          .attr("height", legendHeight)
          .style("fill", "url(#linear-gradient)");

      const legendScale = d3.scaleLinear()
          .domain([maxCO2, minCO2])
          .range([0, legendHeight]);

      const legendAxis = d3.axisRight(legendScale)
          .ticks(5)
          .tickSize(3);

      legendGroup.append("g")
          .attr("class", "legend-axis")
          .attr("transform", `translate(${legendWidth}, 0)`)
          .call(legendAxis);

      legendGroup.append("text")
          .attr("x", legendWidth / 2)
          .attr("y", legendHeight + 20)
          .attr("text-anchor", "middle")
          .style("font-size", "13px")
          .selectAll("tspan")
          .data(["CO2 emissions", "(tons per capita)"])
          .enter()
          .append("tspan")
          .attr("x", legendWidth / 2)
          .attr("dy", (d, i) => i * 15)
          .text(d => d);
  });

  // Stacked barchart on electricity production by source in main european countries (considering 2022-2024)
  d3.csv("data/electricity-prod-source-stacked.csv").then(rows => {
    const targetYears = ["2022", "2023", "2024"];
    const countries = [
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
      targetYears.includes(d.Year) &&
      countries.includes(d.Entity)
    );

    const allCols = Object.keys(filtered[0]);
    const energyCols = allCols.slice(3);


    const agg = {};
    filtered.forEach(d => {
      const c = d.Entity;
      if (!agg[c]) {
        agg[c] = {};
        energyCols.forEach(col => {
          agg[c][col] = { sum: 0, count: 0 };
        });
      }
      energyCols.forEach(col => {
        const v = +d[col];
        if (!isNaN(v)) {
          agg[c][col].sum += v;
          agg[c][col].count += 1;
        }
      });
    });


    const data = countries.map(country => {
      const obj = { country };
      energyCols.forEach(col => {
        const item = agg[country][col];
        const mean = item.count > 0 ? item.sum / item.count : 0;
        obj[col] = mean;
      });
      return obj;
    });

    function extractLabel(colname) {
      if (colname.toLowerCase().includes("other") && colname.toLowerCase().includes("renew")) {
        return "Other renewables";
      }
      const parts = colname.split("from");
      if (parts.length > 1) {
        let label = parts[1].trim();
        label = label.split("(")[0].trim();
        return label.charAt(0).toUpperCase() + label.slice(1);
      }
      return colname;
    }

    const labelMap = {};
    energyCols.forEach(col => {
      labelMap[col] = extractLabel(col);
    });

    const width = 950;
    const height = 520;
    const margin = { top: 50, right: 180, bottom: 80, left: 90 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select("#eu_electricity_stacked")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background", "#f9f9f9");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleBand()
      .domain(countries)
      .range([0, innerWidth])
      .padding(0.25);

    const stackGen = d3.stack()
      .keys(energyCols);

    const series = stackGen(data);

    const maxY = d3.max(series[series.length - 1], d => d[1]);

    const y = d3.scaleLinear()
      .domain([0, maxY])
      .nice()
      .range([innerHeight, 0]);

    const color = d3.scaleOrdinal()
      .domain(energyCols)
      .range(d3.schemeTableau10);

    const layer = g.selectAll(".layer")
      .data(series)
      .enter()
      .append("g")
      .attr("class", "layer")
      .attr("fill", d => color(d.key));

    layer.selectAll("rect")
      .data(d => d)
      .enter()
      .append("rect")
      .attr("x", d => x(d.data.country))
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth());

    g.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-25)")
      .style("text-anchor", "end");

    const yAxis = g.append("g")
      .call(d3.axisLeft(y));

    yAxis.append("text")
      .attr("x", -innerHeight / 2)
      .attr("y", -60)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .style("font-size", "13px")
      .style("fill", "#333")
      .text("Average electricity production (2022-2024)");

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 28)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .text("Average electricity production by source, 2022-2024");

    const legend = svg.append("g")
      .attr("transform", `translate(${width - 165}, ${60})`);

    energyCols.forEach((col, i) => {
      const lg = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      lg.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", color(col));

      lg.append("text")
        .attr("x", 20)
        .attr("y", 11)
        .text(labelMap[col])
        .style("font-size", "11px")
        .attr("alignment-baseline", "middle");
    });
  });

  // Waffle charts on fossil fuel electricity production in main european countries (considering 2022-2024)
  d3.csv("data/electricity-prod-source-stacked.csv").then(rows => {
    const years = ["2022", "2023", "2024"];
    const countries = [
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

    const coalCol = "Electricity from coal - TWh (adapted for visualization of chart electricity-prod-source-stacked)";
    const oilCol = "Electricity from oil - TWh (adapted for visualization of chart electricity-prod-source-stacked)";
    const gasCol = "Electricity from gas - TWh (adapted for visualization of chart electricity-prod-source-stacked)";

    const energyCols = [
      "Other renewables excluding bioenergy - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
      "Electricity from bioenergy - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
      "Electricity from solar - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
      "Electricity from wind - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
      "Electricity from hydro - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
      "Electricity from nuclear - TWh (adapted for visualization of chart electricity-prod-source-stacked)",
      oilCol,
      gasCol,
      coalCol
    ];

    const filtered = rows.filter(d =>
      years.includes(d.Year) &&
      countries.includes(d.Entity)
    );

    const countryStats = countries.map(country => {
      const rowsC = filtered.filter(d => d.Entity === country);
      let totals = { coal: 0, oil: 0, gas: 0, total: 0 };

      rowsC.forEach(r => {
        const c = +r[coalCol];
        const o = +r[oilCol];
        const g = +r[gasCol];

        if (!isNaN(c)) totals.coal += c;
        if (!isNaN(o)) totals.oil += o;
        if (!isNaN(g)) totals.gas += g;

        energyCols.forEach(col => {
          const v = +r[col];
          if (!isNaN(v)) totals.total += v;
        });
      });

      const pctCoal = totals.total ? (totals.coal / totals.total) * 100 : 0;
      const pctOil = totals.total ? (totals.oil / totals.total) * 100 : 0;
      const pctGas = totals.total ? (totals.gas / totals.total) * 100 : 0;

      return {
        country,
        pctCoal,
        pctOil,
        pctGas,
        total: totals.total
      };
    });

    const cellSize = 13;
    const cellGap = 2;
    const waffleCols = 10;
    const waffleRows = 10;
    const waffleWidth = waffleCols * (cellSize + cellGap);
    const waffleHeight = waffleRows * (cellSize + cellGap);

    const numCols = 5;
    const numRows = 2;
    const xSpacing = waffleWidth + 40;
    const ySpacing = waffleHeight + 90;

    const width = numCols * xSpacing + 80;
    const height = numRows * ySpacing + 140;
    const margin = { top: 50, right: 30, bottom: 50, left: 30 };

    const svg = d3.select("#eu_coal_waffle")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 26)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .text("Electricity production from fossil fuels, 2022-2024");

    const colors = {
      coal: "rgb(156, 117, 95)",
      oil: "rgb(175, 122, 161)",
      gas: "rgb(255, 157, 167)"
    };

    const countryG = svg.selectAll(".country-waffle")
      .data(countryStats)
      .enter()
      .append("g")
      .attr("class", "country-waffle")
      .attr("transform", (d, i) => {
        const col = i % numCols;
        const row = Math.floor(i / numCols);
        const x = margin.left + col * xSpacing;
        const y = 60 + row * ySpacing;
        return `translate(${x}, ${y})`;
      });

    countryG.each(function (d) {
      const g = d3.select(this);

      const coalCells = Math.round(d.pctCoal);
      const oilCells = Math.round(d.pctOil);
      const gasCells = Math.round(d.pctGas);

      const cellsData = d3.range(waffleRows * waffleCols).map(i => {
        const row = Math.floor(i / waffleCols);
        const col = i % waffleCols;

        let fill = "#eeeeee";
        if (i < coalCells) {
          fill = colors.coal;
        } else if (i < coalCells + oilCells) {
          fill = colors.oil;
        } else if (i < coalCells + oilCells + gasCells) {
          fill = colors.gas;
        }

        return { i, row, col, fill };
      });

      g.append("rect")
        .attr("x", -6)
        .attr("y", -6)
        .attr("width", waffleWidth + 12)
        .attr("height", waffleHeight + 12)
        .attr("fill", "none")
        .attr("stroke", "#ccc")
        .attr("stroke-width", 1.2)
        .attr("rx", 6);

      g.selectAll("rect.cell")
        .data(cellsData)
        .enter()
        .append("rect")
        .attr("class", "cell")
        .attr("x", c => c.col * (cellSize + cellGap))
        .attr("y", c => c.row * (cellSize + cellGap))
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("rx", 2)
        .attr("ry", 2)
        .attr("fill", c => c.fill)
        .attr("stroke", "#fff");

      g.append("text")
        .attr("x", waffleWidth / 2)
        .attr("y", waffleHeight + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .text(d.country);

      const totalFossil = d.pctCoal + d.pctOil + d.pctGas;
      g.append("text")
        .attr("x", waffleWidth / 2)
        .attr("y", waffleHeight + 36)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#555")
        .text(totalFossil.toFixed(1) + "% fossil");
    });

    const legendData = [
      { label: "Coal", color: colors.coal },
      { label: "Oil", color: colors.oil },
      { label: "Gas", color: colors.gas },
      { label: "Other sources", color: "#eeeeee" }
    ];

    const legendSpacing = 100;
    const legendWidth = legendData.length * legendSpacing;
    const legendX = (width - legendWidth) / 2;
    const legendY = height - 60;

    const legend = svg.append("g")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    legendData.forEach((d, i) => {
      const lg = legend.append("g")
        .attr("transform", `translate(${i * legendSpacing}, 0)`);

      lg.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", d.color)
        .attr("y", -7);

      lg.append("text")
        .attr("x", 20)
        .attr("y", 4)
        .text(d.label)
        .style("font-size", "12px")
        .attr("alignment-baseline", "middle");
    });
  });





});
