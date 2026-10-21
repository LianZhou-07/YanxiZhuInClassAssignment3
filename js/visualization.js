/*
 * COSI 116A: Information Visualization
 * In-class programming: Blue Bikes
 * Author: Dylan Cashman
 */
// Immediately Invoked Function Expression to limit access to our 
// variables and prevent race conditions
((() => {

  // Load the data from a CSV file
  d3.csv("data/march2017_bluebikes_trip_counts.csv").then((data) => {

    // Create a spatial plot given a background image,
    // x and y attributes, 
    // a div id selector to put our svg in; and the data to use.
    let spatialPlot = spatial({
        'backgroundImage': null
      })
      .x(d => +d.Longitude)
      .y(d => +d.Latitude)
      ("#spatial", data);
  });

})());