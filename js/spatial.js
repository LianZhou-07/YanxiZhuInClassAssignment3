/*
 * COSI 116A: Information Visualization
 * In-class programming: Blue Bikes
 * Author: Dylan Cashman
 */
/* global D3 */

// Initialize a spatial plot with an image background. Modeled after Mike Bostock's
// Reusable Chart framework https://bost.ocks.org/mike/chart/
function spatial(opts={}) {

  // Based on Mike Bostock's margin convention
  // https://bl.ocks.org/mbostock/3019563
  let margin = {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    },
    width = 934, // boston_map.png width in pixels
    height = 1076, // boston_map.png height in pixels
    xValue = d => d[0],
    yValue = d => d[1],
    xLabelText = "",
    yLabelText = "",
    yLabelOffsetPx = 0,
    xScale = d3.scaleLinear(),
    yScale = d3.scaleLinear(),
    rScale = d3.scaleLinear(),
    ourBrush = null,
    selectableElements = d3.select(null),
    dispatcher;

  // Create the chart by adding an svg to the div with the id 
  // specified by the selector using the given data
  function chart(selector, data) {

    let minX = d3.min(data, d => xValue(d)),
        maxX = d3.max(data, d => xValue(d)),
        minY = d3.min(data, d => yValue(d)),
        maxY = d3.max(data, d => yValue(d))

    console.log("minX is ", minX);
    console.log("minY is ", minY);
    console.log("maxX is ", maxX);
    console.log("maxY is ", maxY);

    let svg = d3.select(selector)
      .append("svg")
        // .attr("width", "100%")
        .attr("width", width + "px")
        .attr("height", height + "px")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("viewBox", [0, 0, width, height].join(' '))
        .classed("svg-content", true);

    if (opts['backgroundImage']) {
      svg.append('image')
        .attr('href', opts['backgroundImage'])
        .attr("width", width)
        .attr("height", height)
      // svg.attr('background-image', "url(" + opts['backgroundImage'] + ")");
    }

    svg = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    //Define scales
    xScale
      .domain([
        d3.min(data, d => xValue(d)),
        d3.max(data, d => xValue(d))
      ])
      .rangeRound([0, width]);

    yScale
      .domain([
        d3.min(data, d => yValue(d)),
        d3.max(data, d => yValue(d))
      ])
      .rangeRound([height, 0]);

    // Draw larger circles first so smaller ones stay on top and visible
    data = data.slice().sort((a, b) =>
      d3.descending(+a['trip start count'], +b['trip start count']));

    // Brush layer sits under the points so hovering a point shows its tooltip
    let brushLayer = svg.append("g");

    // Add the points
    let points = svg.append("g")
      .selectAll(".scatterPoint")
        .data(data);

    points.exit().remove();

    // YOUR CODE HERE:
    // Here, you can modify the radius or any other quality of the points
    // in order to encode additional data.
    //
    // Radius encodes 'trip start count'. The original range [1, 100] was the
    // problem: busy stations got 100px radii and covered the map. We use a
    // square-root scale (so circle AREA, not radius, is proportional to the
    // count), anchor the domain at 0, and shrink the range to [0, 18] px.
    rScale = d3.scaleSqrt()
      .domain([0, d3.max(data, d => +d['trip start count'])])
      .range([0, 18]);

    // Optional challenge: also show 'trip end count'. Fill color encodes net
    // flow = (end - start) / (end + start): red stations lose bikes (more trips
    // start there), blue stations gain bikes (more trips end there).
    let netFlow = d => {
      let s = +d['trip start count'], e = +d['trip end count'];
      return (e - s) / (e + s);
    };
    let colorScale = d3.scaleDiverging(t => d3.interpolateRdBu(t))
      .domain([-0.3, 0, 0.3])
      .clamp(true);

    points = points.enter()
      .append("circle")
        .attr("class", "point spatialPoint")
      .merge(points)
        .attr("cx", X)
        .attr("cy", Y)
        // .attr("r", (d) => { return 5; })
        .attr("r", (d) => { return rScale(+d['trip start count'])})
        .attr("fill", d => colorScale(netFlow(d)))
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.85);

    // Tooltip on hover
    points.append("title")
      .text(d => `${d.Name}\nTrips started: ${d['trip start count']}` +
        `\nTrips ended: ${d['trip end count']}`);

    drawLegend(svg, rScale, colorScale);
    
    selectableElements = points;
    
    brushLayer.call(brush);

    // Highlight points when brushed
    function brush(g) {
      const brush = d3.brush() // Create a 2D interactive brush
        .on("start brush", highlight) // When the brush starts/continues do...
        .on("end", brushEnd) // When the brush ends do...
        .extent([
          [-margin.left, -margin.bottom],
          [width + margin.right, height + margin.top]
        ]);
        
      ourBrush = brush;

      g.call(brush); // Adds the brush to this element

      // Highlight the selected circles
      function highlight(event) {
        if (event.selection === null) return;
        const [
          [x0, y0],
          [x1, y1]
        ] = event.selection;

        // If within the bounds of the brush, select it
        points.classed("selected", d =>
          x0 <= X(d) && X(d) <= x1 && y0 <= Y(d) && Y(d) <= y1
        );

        // Only link to other charts if a dispatcher has been provided
        if (dispatcher) {
          // Get the name of our dispatcher's event
          let dispatchString = Object.getOwnPropertyNames(dispatcher._)[0];

          // Let other charts know about our selection
          dispatcher.call(dispatchString, this, svg.selectAll(".selected").data());
        }
      }
      
      function brushEnd(event){
        // We don't want infinite recursion: only clear the brush when the
        // event came from the user (programmatic brush.move events have
        // no sourceEvent)
        if(event.sourceEvent){
          d3.select(this).call(brush.move, null);
        }         
      }
    }

    return chart;
  }

  // Size legend (trip starts) and color legend (net flow), top-left corner
  function drawLegend(svg, rScale, colorScale) {
    let legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", "translate(12, 12)")
      .style("font", "12px sans-serif")
      .style("pointer-events", "none");

    legend.append("rect")
      .attr("width", 190).attr("height", 155)
      .attr("fill", "white").attr("opacity", 0.85)
      .attr("stroke", "#999").attr("rx", 4);

    legend.append("text").attr("x", 10).attr("y", 20)
      .attr("font-weight", "bold").text("Trips started (size)");

    let sizes = [100, 1000, 3000];
    let maxR = rScale(sizes[sizes.length - 1]);
    let baseY = 30 + 2 * maxR;
    sizes.forEach(v => {
      legend.append("circle")
        .attr("cx", 10 + maxR).attr("cy", baseY - rScale(v)).attr("r", rScale(v))
        .attr("fill", "none").attr("stroke", "#333");
      legend.append("line")
        .attr("x1", 10 + maxR).attr("x2", 30 + 2 * maxR)
        .attr("y1", baseY - 2 * rScale(v)).attr("y2", baseY - 2 * rScale(v))
        .attr("stroke", "#999").attr("stroke-dasharray", "2,2");
      legend.append("text")
        .attr("x", 34 + 2 * maxR).attr("y", baseY - 2 * rScale(v) + 4)
        .text(d3.format(",")(v));
    });

    let cy = baseY + 25;
    legend.append("text").attr("x", 10).attr("y", cy)
      .attr("font-weight", "bold").text("Net flow (color)");

    let w = 170, steps = d3.range(0, 1.0001, 0.05);
    legend.selectAll(".swatch").data(steps).enter().append("rect")
      .attr("x", t => 10 + t * (w - w / steps.length))
      .attr("y", cy + 8)
      .attr("width", w / steps.length + 0.5).attr("height", 12)
      .attr("fill", t => colorScale(-0.3 + 0.6 * t));
    legend.append("text").attr("x", 10).attr("y", cy + 36).text("more starts");
    legend.append("text").attr("x", 10 + w).attr("y", cy + 36)
      .attr("text-anchor", "end").text("more ends");
    legend.append("text").attr("x", 10).attr("y", cy + 52)
      .attr("fill", "#555").text("(end − start) / (end + start)");
  }

  // The x-accessor from the datum
  function X(d) {
    return xScale(xValue(d));
  }

  // The y-accessor from the datum
  function Y(d) {
    return yScale(yValue(d));
  }

  chart.margin = function (_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function (_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.x = function (_) {
    if (!arguments.length) return xValue;
    xValue = _;
    return chart;
  };

  chart.y = function (_) {
    if (!arguments.length) return yValue;
    yValue = _;
    return chart;
  };

  chart.xLabel = function (_) {
    if (!arguments.length) return xLabelText;
    xLabelText = _;
    return chart;
  };

  chart.yLabel = function (_) {
    if (!arguments.length) return yLabelText;
    yLabelText = _;
    return chart;
  };

  chart.yLabelOffset = function (_) {
    if (!arguments.length) return yLabelOffsetPx;
    yLabelOffsetPx = _;
    return chart;
  };

  // Gets or sets the dispatcher we use for selection events
  chart.selectionDispatcher = function (_) {
    if (!arguments.length) return dispatcher;
    dispatcher = _;
    return chart;
  };

  // Given selected data from another visualization 
  // select the relevant elements here (linking)
  chart.updateSelection = function (selectedData) {
    if (!arguments.length) return;

    // Select an element if its datum was selected
    selectableElements.classed("selected", d => {
      return selectedData.includes(d)
    });

  };

  return chart;
}