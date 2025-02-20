
/* 
    this is sample code i.e. its expected you
    the style or zoom arugments

*/
// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiZm9saWNrcyIsImEiOiJjbTc5a3IwdG4wMWszMm1weWx4am5pNml1In0.fgO6EPaoZ2qcKxzwDof-6w';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/light-v10', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
  projection : 'globe'
});

// map.on('load', () => {

//     map.setFog({});

// });