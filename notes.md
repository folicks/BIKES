TODO
- do the same procedure of boston on cambridge
- get the bluebikes json to read

```
You can experiment with other layer types like 'fill', 'circle', or 'symbol' depending on your data and goals. For bike routes, 'line' works best.
```

| questions      | answer     |
| ------------- | ------------- |
| do the same procedure of boston on cambridge | chang ethe id to respective objects on the Map |
| why is id the way of making variables with "unique"  | see map documentation? |
| how come i couldn't access the jsonData from outside the d3 block?  | the jsonData possessed the "await" type being in this =>{} (?) |
| how is the updatePositions causing the entire map.on to not run  | Cell 1, Row 2 |




```javascript

function updatePositions() {
  circles
    .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
    .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
}

// Initial position update when map loads
updatePositions();

map.on('load', () =>
```


____

where to put this

```javascript
const stations = computeStationTraffic(jsonData.data.stations, trips);
```

should this replace former usage of d3.csv
```javascript
let trips = await d3.csv(
  'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
  (trip) => {
    trip.started_at = new Date(trip.started_at);
    trip.ended_at = new Date(trip.ended_at);
    return trip;
  },
);
```



GOAL get timeFilter variable to this function where the "mouseover" can still happen
```javascript

function updateScatterPlot(timeFilter) {
    // Get only the trips that match the selected time filter
    const filteredTrips = filterTripsbyTime(trips, timeFilter);
    
    // Recompute station traffic based on the filtered trips
    const filteredStations = computeStationTraffic(stations, filteredTrips);
    
    // Update the scatterplot by adjusting the radius of circles
    circles
      .data(filteredStations)
      .join('circle') // Ensure the data is bound correctly
      .attr('r', (d) => radiusScale(d.totalTraffic)); // Update circle sizes
}


function updateTimeDisplay() {
    let timeFilter = Number(timeSlider.value); // Get slider value

    if (timeFilter === -1) {
      selectedTime.textContent = ''; // Clear time display
      anyTimeLabel.style.display = 'block'; // Show "(any time)"
    } else {
      selectedTime.textContent = formatTime(timeFilter); // Display formatted time
      anyTimeLabel.style.display = 'none'; // Hide "(any time)"
    }
    
    // Call updateScatterPlot to reflect the changes on the map
    updateScatterPlot(timeFilter);
}
```
