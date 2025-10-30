document.addEventListener("DOMContentLoaded", () => {
  d3.csv("data/global-energy-substitution.csv").then(rows => {
    console.log("CSV caricato, righe:", rows.length);

    const row2024 = rows.find(
      d => d.Year === "2024" && d.Entity === "World"
    );


    if (!row2024) {
      console.error("No 2024 row found for World");
      return;
    }

    const allCols = Object.keys(row2024);

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

    const data = energyCols.map(col => ({
      name: renameMap[col] || col,
      value: +row2024[col]
    }));


    const width = 800;
    const height = 550;
    const margin = { top: 45, right: 40, bottom: 80, left: 90 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select("#energy_2024_chart")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background", "#f9f9f9")  

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
      .text("Primary energy consumption by source globally");
  });
});
