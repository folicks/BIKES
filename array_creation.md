To add the `departures` and `totalTraffic` properties to each station, you need to ensure that you correctly access and assign these values based on the station IDs. Here's how you can do it:

1. **Calculate Departures**: You already have the `departures` calculation using `d3.rollup`.
2. **Calculate Arrivals**: Similarly, you can calculate arrivals using `d3.rollup`.
3. **Calculate Total Traffic**: This can be derived by summing the arrivals and departures for each station.

Here is the complete code to achieve this:

```javascript
// Assuming trips and stations are already loaded and available

// Calculate departures
const departures = d3.rollup(
  trips,
  (v) => v.length,
  (d) => d.start_station_id
);

// Calculate arrivals
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
```

### Explanation:

1. **Departures Calculation**:
   ```javascript
   const departures = d3.rollup(
     trips,
     (v) => v.length,
     (d) => d.start_station_id
   );
   ```
   This calculates the number of trips that started at each station.

2. **Arrivals Calculation**:
   ```javascript
   const arrivals = d3.rollup(
     trips,
     (v) => v.length,
     (d) => d.end_station_id
   );
   ```
   This calculates the number of trips that ended at each station.

3. **Mapping Stations**:
   ```javascript
   stations = stations.map((station) => {
     let id = station.short_name;
     station.arrivals = arrivals.get(id) ?? 0;
     station.departures = departures.get(id) ?? 0;
     station.totalTraffic = (station.arrivals + station.departures);
     return station;
   });
   ```
   - `station.short_name` is used to get the station ID.
   - `arrivals.get(id) ?? 0` retrieves the number of arrivals for the station, defaulting to 0 if the station ID is not found.
   - `departures.get(id) ?? 0` retrieves the number of departures for the station, defaulting to 0 if the station ID is not found.
   - `station.totalTraffic` is calculated as the sum of arrivals and departures.

This approach ensures that each station object in the `stations` array has the `arrivals`, `departures`, and `totalTraffic` properties correctly assigned.