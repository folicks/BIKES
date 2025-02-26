import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const svg = d3.select('#map').select('svg');
let stations = [];
let timeFilter = -1;
let trips = []; // Declare trips in a broader scope
let radiusScale; // Declare radiusScale in a broader scope
let circles;
let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);


function computeStationTraffic(stations, trips) {
    const departures = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.start_station_id
    );

    const arrivals = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.end_station_id
    );

    return stations.map((station) => {
        let id = station.short_name;
        station.arrivals = arrivals.get(id) ?? 0;
        station.departures = departures.get(id) ?? 0;
        station.totalTraffic = (station.arrivals + station.departures);
        return station;
    });
};

function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
};

function filterTripsbyTime(trips, timeFilter) {
    return timeFilter === -1
        ? trips
        : trips.filter((trip) => {
            const startedMinutes = minutesSinceMidnight(trip.started_at);
            const endedMinutes = minutesSinceMidnight(trip.ended_at);

            return (
                Math.abs(startedMinutes - timeFilter) <= 60 ||
                Math.abs(endedMinutes - timeFilter) <= 60
            );
        });
};

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

const timeSlider = document.getElementById('time-filter');
const selectedTime = document.getElementById('selected-time');
const anyTimeLabel = document.getElementById('any-time');

function formatTime(minutes) {
    const date = new Date(0, 0, 0, Math.floor(minutes / 60), minutes % 60);
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
    updateScatterPlot(timeFilter);
}


// Define updateScatterPlot in the global scope, before it's called
function updateScatterPlot(timeFilter) {

  if (!stations || stations.length === 0) {
      console.warn("Stations data not yet loaded.  UpdateScatterPlot cannot proceed.");
      return;
  }
   if (!trips || trips.length === 0) {
      console.warn("Trips data not yet loaded.  UpdateScatterPlot cannot proceed.");
      return;
  }
  
  // Get only the trips that match the selected time filter
  const filteredTrips = filterTripsbyTime(trips, timeFilter);
  
  // Recompute station traffic based on the filtered trips
  const filteredStations = computeStationTraffic(stations, filteredTrips);

  timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

  
  // Update the scatterplot by adjusting the radius of circles
  circles
    .data(filteredStations, (d) => d.short_name)
    .join('circle') // Ensure the data is bound correctly
    .attr('r', (d) => radiusScale(d.totalTraffic)) // Update circle sizes
    .style('--departure-ratio', (d) =>
      stationFlow(d.departures / d.totalTraffic),
    );
  }

map.on('load', async () => {
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
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

    const jsonurl = "https://dsc106.com/labs/lab07/data/bluebikes-stations.json";

    d3.json(jsonurl).then(async jsonData => {
        trips = await d3.csv( // Assign trips to the broader scope
            'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
            (trip) => {
                trip.started_at = new Date(trip.started_at);
                trip.ended_at = new Date(trip.ended_at);
                return trip;
            },
        );

        stations = computeStationTraffic(jsonData.data.stations, trips);

        // Define radiusScale AFTER stations data is processed, inside the 'load' event
        radiusScale = d3
            .scaleSqrt()
            .domain([0, d3.max(stations, (d) => d.totalTraffic)])
            .range([0, 25]);

        // Create the SVG circles after the data is loaded and processed
         circles = svg.selectAll('circle')
            .data(stations, (d) => d.short_name)
            .enter()
            .append('circle')
            .style("--departure-ratio", d => stationFlow(d.departures / d.totalTraffic))
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

        function getCoords(station) {
            const point = new mapboxgl.LngLat(+station.lon, +station.lat);
            const { x, y } = map.project(point);
            return { cx: x, cy: y };
        }

        function updatePositions() {
            circles
                .attr('cx', d => getCoords(d).cx)
                .attr('cy', d => getCoords(d).cy);
        }
        updatePositions();

        map.on('move', updatePositions);
        map.on('zoom', updatePositions);
        map.on('resize', updatePositions);
        map.on('moveend', updatePositions);
        updateScatterPlot(timeFilter);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();
});
