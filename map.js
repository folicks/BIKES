
/* 
    this is sample code i.e. its expected you
    the style or zoom arugments

*/
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
const svg = d3.select('#map').select('svg');
let stations = [];

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






map.on('load', () => {
  // Add bike route sources and layers
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
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
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

  /**
 * icky function 
 * 
 */
  
  
  d3.json(jsonurl).then(jsonData => {


    // use these functions below if the website goes dead or something

    // console.log('Loaded JSON Data:', jsonData);  // Log to verify structure
    stations = jsonData.data.stations;  // Assign the stations data to the global variable
    // console.log('Stations Array:', stations);  // Log stations to verify

    

    
  
  
  


  


  const trips = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv'

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
    const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    .range([0, 25]);


  // Create the SVG circles after the data is loaded and processed
    const circles = svg.selectAll('circle')
      .data(stations)
      .enter()
      .append('circle')
      .attr('r', (d) => radiusScale(d.totalTraffic)) // Radius now based on scaled totalTraffic
      .attr('fill', 'steelblue')  // Circle fill color
      .attr('stroke', 'white')    // Circle border color
      .attr('stroke-width', 1)    // Circle border thickness
      .attr('opacity', 0.8);      // Circle opacity

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
      
    
      
    
    map.on('move', updatePositions);     // Update during map movement
    map.on('zoom', updatePositions);     // Update during zooming
    map.on('resize', updatePositions);   // Update on window resize
    map.on('moveend', updatePositions);
  






    // //previous code
  
    // //add THIS code
    // for (let trip of trips) {
  
    //   trip.started_at = new Date(trip.start_time);
    //   // do the same for end
    // }
  });

  });

});





