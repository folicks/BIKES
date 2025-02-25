import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
const svg = d3.select('#map').select('svg');
let stations = [];
let timeFilter = -1;
let circles;
let radiusScale;



// let timeFilter = -1;
const timeSlider = document.getElementById('time-filter');
const selectedTime = document.getElementById('selected-time');
const anyTimeLabel = document.getElementById('any-time');



// this is sample code i.e. its expected you
// style or change zoom arugments

mapboxgl.accessToken = 'pk.eyJ1IjoiZm9saWNrcyIsImEiOiJjbTc5a3IwdG4wMWszMm1weWx4am5pNml1In0.fgO6EPaoZ2qcKxzwDof-6w';
// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
  projection : 'globe'
});

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}


function formatTime(minutes) {
  const date = new Date(0, 0, 0, Math.floor(minutes/60), minutes%60);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function filterTripsbyTime(trips, timeFilter) {
  return timeFilter === -1 
    ? trips // If no filter is applied (-1), return all trips
    : trips.filter((trip) => {
        // Convert trip start and end times to minutes since midnight
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);
        
        // Include trips that started or ended within 60 minutes of the selected time
        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
    });
}






function computeStationTraffic(stations, trips) {
  // Compute departures
  const departures = d3.rollup(
    trips, 
    (v) => v.length, 
    (d) => d.start_station_id
);

  // Computed arrivals as you did in step 4.2

  const arrivals = d3.rollup(
    trips, 
    (v) => v.length, 
    (d) => d.end_station_id
  );
  // stations = stations.map((station) => {
  //   let id = station.short_name;
  //   station.arrivals = arrivals.get(id) ?? 0;
  //   station.departures = departures.get(id) ?? 0;
  //   station.totalTraffic = (station.arrivals + station.departures);
  //   return station;
  // });




  // Update each station..
  return stations.map((station) => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = (station.arrivals + station.departures);
    return station;
});
};



function updateScatterPlot(timeFilter) {
    // Get only the trips that match the selected time filter
    const filteredTrips = filterTripsbyTime(trips, timeFilter);
    
    // Recompute station traffic based on the filtered trips
    const filteredStations = computeStationTraffic(stations, filteredTrips);
    

    timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

    // Update the scatterplot by adjusting the radius of circles
    circles
      .data(filteredStations, (d) => d.short_name)
      .join('circle') // Ensure the data is bound correctly
      .attr('r', (d) => radiusScale(d.totalTraffic)); // Update circle sizes
}

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
  const { x, y } = map.project(point);  // Project to pixel coordinates
  return { cx: x, cy: y };  // Return as object for use in SVG attributes
}


function updatePositions() {
  if (circles) {
    circles
      .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
      .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
  }
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



// function updateVisualizations() {
//     // This function will update the map based on the time filter
//     // You'll need to implement the logic to filter and display the data
//     console.log("updateVisualizations called with timeFilter:", timeFilter);
//     updateScatterPlot(timeFilter);
//   }







map.on('load',async () => {


  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
  });

  map.addLayer({
    id: 'bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: {
      'line-color': '#32D400',  // A bright green using hex code
      'line-width': 5,          // Thicker lines
      'line-opacity': 0.6       // Slightly less transparent
    }
  });

  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson?...'
  });

  map.addLayer({
    id: 'cambridge-lanes',
    type: 'line',
    source: 'cambridge_route',
    paint: {
      'line-color': '#32D400',  // A bright green using hex code
      'line-width': 5,          // Thicker lines
      'line-opacity': 0.6       // Slightly less transparent
    }
  });

  



  // Load the nested JSON file
  const jsonurl = "https://dsc106.com/labs/lab07/data/bluebikes-stations.json";

  let stations = jsonurl.data.stations;


  let trips = await d3.csv(
    'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
    (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      return trip;
    },
  );
  
  /**
 * icky function 
 * 
 */

  stations = computeStationTraffic(stations, trips);
  radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(stations, (d) => d.totalTraffic)])
      .range([0, 25]);


  const svg = d3.select('#map').select('svg');

  const circles = svg.selectAll('circle')
  .data(stations, (d) => d.short_name)
  .enter()
  .append('circle')
  .attr('r', (d) => radiusScale(d.totalTraffic)) // Radius now based on scaled totalTraffic
  .attr('fill', 'steelblue')  // Circle fill color
  .attr('stroke', 'white')    // Circle border color
  .attr('stroke-width', 1)    // Circle border thickness
  .attr('opacity', 0.8)
  .each(function(d) {
    // Add <title> for browser tooltips
    d3.select(this)
      .append('title')
      .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
  });      // Circle opacity
  

  updatePositions();



  map.on('move', updatePositions);     // Update during map movement
  map.on('zoom', updatePositions);     // Update during zooming
  map.on('resize', updatePositions);   // Update on window resize
  map.on('moveend', updatePositions);



  timeSlider.addEventListener('input', updateTimeDisplay);
  updateTimeDisplay();


  d3.json(jsonurl).then(async jsonData => {


    // use these functions below if the website goes dead or something

    // console.log('Loaded JSON Data:', jsonData);  // Log to verify structure
    // stations = jsonData.data.stations;  // Assign the stations data to the global variable
    // console.log('Stations Array:', stations);  // Log stations to verify



  


  


  // const trips = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv'

  // im not sure whether to not use the previous const version of this data


  // let trips = await d3.csv(
  //   'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
  //   (trip) => {
  //     trip.started_at = new Date(trip.started_at);
  //     trip.ended_at = new Date(trip.ended_at);
  //     return trip;
  //   },
  // );

    let stations = computeStationTraffic(jsonData.data.stations, trips);
});



  





  






function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}



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

  d3.csv(trips).then(trips => {


    console.log('Loaded trips Data:', typeof(trips));  // Log to verify structure
    
    const departures = d3.rollup(
      trips,
      (v) => v.length,
      (d) => d.start_station_id,
    );

    console.log('Departures:', departures);  // Log stations to verify

    const arrivals = d3.rollup(
      trips,
      (v) => v.length,
      (d) => d.end_station_id
    );
    
    // Map over stations to add arrivals, departures, and totalTraffic properties
    stations = stations.map((station) => {
      let id = station.short_name;
      station.arrivals = arrivals.get(id) ?? 0;
      station.departures = departures.get(id) ?? 0;
      station.totalTraffic = (station.arrivals + station.departures);
      return station;
    });


    console.log('Stations with Traffic:', stations);  // Log stations to verify

    // Define radiusScale AFTER stations data is processed
    // const radiusScale = d3
    // .scaleSqrt()
    // .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    // .range([0, 25]);


  // Create the SVG circles after the data is loaded and processed
    // const circles = svg.selectAll('circle')
    //   .data(stations, (d) => d.short_name)
    //   .enter()
    //   .append('circle')
    //   .attr('r', (d) => radiusScale(d.totalTraffic)) // Radius now based on scaled totalTraffic
    //   .attr('fill', 'steelblue')  // Circle fill color
    //   .attr('stroke', 'white')    // Circle border color
    //   .attr('stroke-width', 1)    // Circle border thickness
    //   .attr('opacity', 0.8)
    //   .each(function(d) {
    //     // Add <title> for browser tooltips
    //     d3.select(this)
    //       .append('title')
    //       .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
    //   });      // Circle opacity

      // Function to update circle positions when the map moves/zooms
    function updatePositions() {
      circles
        .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
        .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
    }
    updatePositions();
      
    function getCoords(station) {
        const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
        const { x, y } = map.project(point);  // Project to pixel coordinates
        return { cx: x, cy: y };  // Return as object for use in SVG attributes
    }
        
      
        
    
    // map.on('move', updatePositions);     // Update during map movement
    // map.on('zoom', updatePositions);     // Update during zooming
    // map.on('resize', updatePositions);   // Update on window resize
    // map.on('moveend', updatePositions);
  
    // document.addEventListener('DOMContentLoaded', () => {
    //     timeSlider.addEventListener('input', updateTimeDisplay);
    //     updateTimeDisplay();
    //     updateScatterPlot(timeFilter);
    // });

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
    // //previous code
  
    // //add THIS code
    // for (let trip of trips) {
  
    //   trip.started_at = new Date(trip.start_time);
    //   // do the same for end
    // }
  });

});





// function updateVisualizations() {
//   // This function will update the map based on the time filter
//   // You'll need to implement the logic to filter and display the data
//   console.log("updateVisualizations called with timeFilter:", timeFilter);
//   updateScatterPlot(timeFilter);
// }


function updateTimeDisplay() {
    timeFilter = Number(timeSlider.value);
    
    if (timeFilter === -1) {
        selectedTime.textContent = '';
        anyTimeLabel.style.display = 'block';
    } else {
        selectedTime.textContent = formatTime(timeFilter);
        anyTimeLabel.style.display = 'none';
    }
    updateVisualizations(); // This will trigger the filtering
}






// Filter trips based on start time
// const filteredTrips = trips.filter((trip) => {
//   const startTime = new Date(trip.start_time);
//   const startTimeMinutes = startTime.getHours() * 60 + startTime.getMinutes();
//   return time === -1 || startTimeMinutes >= time;
// });

