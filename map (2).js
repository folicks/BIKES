import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
const svg = d3.select('#map').select('svg');

// Global helper functions
function formatTime(minutes) {
    const date = new Date(0, 0, 0, 0, minutes);
    return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
}

// Create time buckets (1440 = 24 hours × 60 minutes)
let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);

// Efficient filtering by minute
function filterByMinute(tripsByMinute, minute) {
  if (minute === -1) {
    return tripsByMinute.flat(); // No filtering, return all trips
  }

  // Normalize both min and max minutes to the valid range [0, 1439]
  let minMinute = (minute - 60 + 1440) % 1440;
  let maxMinute = (minute + 60) % 1440;

  // Handle time filtering across midnight
  if (minMinute > maxMinute) {
    let beforeMidnight = tripsByMinute.slice(minMinute);
    let afterMidnight = tripsByMinute.slice(0, maxMinute + 1);
    return beforeMidnight.concat(afterMidnight).flat();
  } else {
    return tripsByMinute.slice(minMinute, maxMinute + 1).flat();
  }
}

// Updated computeStationTraffic to use the new filtering method
function computeStationTraffic(stations, timeFilter = -1) {
  // Retrieve filtered trips efficiently
  const departures = d3.rollup(
    filterByMinute(departuresByMinute, timeFilter),
    (v) => v.length,
    (d) => d.start_station_id
  );

  const arrivals = d3.rollup(
    filterByMinute(arrivalsByMinute, timeFilter),
    (v) => v.length,
    (d) => d.end_station_id
  );

  // Update each station with traffic values
  return stations.map((station) => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

// Initialize mapbox map
mapboxgl.accessToken = 'pk.eyJ1IjoiZm9saWNrcyIsImEiOiJjbTc5a3IwdG4wMWszMm1weWx4am5pNml1In0.fgO6EPaoZ2qcKxzwDof-6w';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-71.09415, 42.36027],
    zoom: 12,
    minZoom: 5,
    maxZoom: 18,
    projection: 'globe'
});

map.on('load', async () => {
    // Add bike route sources and layers
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?'
    });
    map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
            'line-color': '#32D400',
            'line-width': 5,
            'line-opacity': 0.6
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
            'line-color': '#32D400',
            'line-width': 5,
            'line-opacity': 0.6
        }
    });

    // Load JSON station data
    const jsonurl = "https://dsc106.com/labs/lab07/data/bluebikes-stations.json";
    const jsonData = await d3.json(jsonurl);

    // Load trips CSV data and convert time strings to Date objects
    let trips = await d3.csv(
        'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
        (trip) => {
            trip.started_at = new Date(trip.started_at);
            trip.ended_at = new Date(trip.ended_at);
            
            // Populate time buckets
            let startedMinutes = minutesSinceMidnight(trip.started_at);
            departuresByMinute[startedMinutes].push(trip);
            
            let endedMinutes = minutesSinceMidnight(trip.ended_at);
            arrivalsByMinute[endedMinutes].push(trip);
            
            return trip;
        }
    );

    // Compute initial station traffic (using all trips)
    let stations = computeStationTraffic(jsonData.data.stations);

    // Create circles with a key for D3 to track each station (using short_name)
    let radiusScale = d3.scaleSqrt().domain([0, d3.max(stations, (d) => d.totalTraffic)]).range([0, 25]);
    const circles = svg
        .selectAll('circle')
        .data(stations, (d) => d.short_name)
        .enter()
        .append('circle')
        .attr('r', (d) => radiusScale(d.totalTraffic))
        .attr('fill', 'steelblue')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8);

    // Update positions based on map movement
    function updatePositions() {
        circles
            .attr('cx', d => {
                const point = new mapboxgl.LngLat(+d.lon, +d.lat);
                return map.project(point).x;
            })
            .attr('cy', d => {
                const point = new mapboxgl.LngLat(+d.lon, +d.lat);
                return map.project(point).y;
            });
    }
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);

    // Re-usable function to update the scatterplot based on the time filter
    function updateScatterPlot(timeFilter) {
        // Update stations based on time filter (using the new approach)
        const filteredStations = computeStationTraffic(jsonData.data.stations, timeFilter);
        
        // Dynamically adjust circle size range based on filtering
        timeFilter === -1
            ? radiusScale.range([0, 25])
            : radiusScale.range([3, 50]);
        
        circles
            .data(filteredStations, (d) => d.short_name)
            .join('circle')
            .attr('r', (d) => radiusScale(d.totalTraffic))
            .attr('fill', 'steelblue')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .attr('opacity', 0.8);
    }

    // Select slider and time display elements
    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('selected-time');
    const anyTimeLabel = document.getElementById('any-time');
    let timeFilter = -1;
    
    // Function to update the time display and trigger filtering
    function updateTimeDisplay() {
        timeFilter = Number(timeSlider.value);
        
        if (timeFilter === -1) {
            selectedTime.textContent = '';
            anyTimeLabel.style.display = 'block';
        } else {
            selectedTime.textContent = formatTime(timeFilter);
            anyTimeLabel.style.display = 'none';
        }
        updateScatterPlot(timeFilter);
    }
    
    // Bind slider input event for real-time updates
    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();
});