import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
const svg = d3.select('#map').select('svg');
let stations = [];
let tripsAll = [];
let circles;
let radiusScale; // Define radiusScale outside map.on('load') scope
let timeFilter = -1; // Initialize timeFilter outside map.on('load') scope

mapboxgl.accessToken = 'pk.eyJ1IjoiZm9saWNrcsIsImEiOiJjbTc5a3IwdG4wMWszMm1weWx4am5pNml1In0.fgO6EPaoZ2qcKxzwDof-6w';
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

// Define computeStationTraffic function globally
function computeStationTraffic(stations, trips) {
    // Compute departures
    const departures = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.start_station_id
    );

    // Compute arrivals
    const arrivals = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.end_station_id
    );

    // Update each station..
    return stations.map((station) => {
        let id = station.short_name;
        station.arrivals = arrivals.get(id) ?? 0;
        station.departures = departures.get(id) ?? 0;
        station.totalTraffic = (station.arrivals + station.departures); // Calculate total traffic
        return station;
    });
}

// Define minutesSinceMidnight function globally
function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
}

// Define filterTripsbyTime function globally
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

// Define updateScatterPlot function globally
function updateScatterPlot(timeFilter) {
    // Get only the trips that match the selected time filter
    const filteredTrips = filterTripsbyTime(tripsAll, timeFilter);

    // Recompute station traffic based on the filtered trips
    const filteredStations = computeStationTraffic(stations, filteredTrips);

    // Dynamically adjust radiusScale range
    timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);
    radiusScale.domain([0, d3.max(filteredStations, d => d.totalTraffic)]); // Recalculate domain


    // Update the scatterplot by adjusting the radius of circles
    circles
        .data(filteredStations, (d) => d.short_name) // Use key function here
        .join('circle') // Ensure the data is bound correctly
        .transition() // Add transition for smoother updates
        .duration(500)
        .attr('r', (d) => radiusScale(d.totalTraffic)) // Update circle sizes
        .each(function(d) {
            d3.select(this)
                .select('title')
                .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
        });
}


map.on('load', async () => {
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
            'line-color': '#32D400',  // A bright green using hex code
            'line-width': 5,          // Thicker lines
            'line-opacity': 0.6       // Slightly less transparent
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
            'line-color': '#32D400',  // A bright green using hex code
            'line-width': 5,          // Thicker lines
            'line-opacity': 0.6       // Slightly less transparent
        }
    });

    // Load the nested JSON file
    const jsonurl = "https://dsc106.com/labs/lab07/data/bluebikes-stations.json";
    const jsonData = await d3.json(jsonurl);

    // console.log('Loaded JSON Data:', jsonData);  // Log to verify structure
    stations = jsonData.data.stations;  // Assign the stations data to the global variable
    // console.log('Stations Array:', stations);  // Log stations to verify

    const trips_url = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';

    tripsAll = await d3.csv(
        trips_url,
        (trip) => {
            trip.started_at = new Date(trip.start_time);
            trip.ended_at = new Date(trip.end_time);
            return trip;
        },
    );


    // Initialize station data with traffic counts
    stations = computeStationTraffic(jsonData.data.stations, tripsAll);

    // Define radiusScale AFTER stations data is processed - INITIALIZE HERE
    radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(stations, (d) => d.totalTraffic)])
        .range([0, 25]);


    // Create the SVG circles after the data is loaded and processed
    circles = svg
        .selectAll('circle')
        .data(stations, (d) => d.short_name) // Use key function here for initial creation
        .enter()
        .append('circle')
        .attr('r', (d) => radiusScale(d.totalTraffic)) // Radius now based on scaled totalTraffic
        .attr('fill', 'steelblue')  // Circle fill color
        .attr('stroke', 'white')    // Circle border color
        .attr('stroke-width', 1)    // Circle border thickness
        .attr('opacity', 0.8)
        .each(function(d) {
            // Add <title> for browser tooltips
            d3.select(this)
                .append('title')
                .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
        });      // Circle opacity


    // Function to update circle positions when the map moves/zooms
    function updatePositions() {
        circles
            .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
            .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
    }
    updatePositions();

    function getCoords(station) {
        const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
        const { x, y } = map.project(point);  // Project to pixel coordinates
        return { cx: x, cy: y };  // Return as object for use in SVG attributes
    }

    map.on('move', updatePositions);     // Update during map movement
    map.on('zoom', updatePositions);     // Update during zooming
    map.on('resize', updatePositions);   // Update on window resize
    map.on('moveend', updatePositions);

    // Initial scatterplot render (no time filter)
    updateScatterPlot(-1);
    updateTimeDisplay(); // <----- MOVED INITIAL CALL HERE, AFTER DATA LOAD

});


const timeSlider = document.getElementById('time-filter');
const selectedTime = document.getElementById('selected-time');
const anyTimeLabel = document.getElementById('any-time');

function formatTime(minutes) {
    const date = new Date(0, 0, 0, Math.floor(minutes/60), minutes%60);
    return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function updateTimeDisplay() {
    timeFilter = Number(timeSlider.value);

    if (timeFilter === -1) {
        selectedTime.textContent = '';
        anyTimeLabel.style.display = 'block';
    } else {
        selectedTime.textContent = formatTime(timeFilter);
        anyTimeLabel.style.display = 'none';
    }
    updateScatterPlot(timeFilter); // Call updateScatterPlot with the time filter value
}


// Add this after your map initialization
document.addEventListener('DOMContentLoaded', () => {
    timeSlider.addEventListener('input', updateTimeDisplay);
    // Removed initial call here - moved inside map.on('load')
});