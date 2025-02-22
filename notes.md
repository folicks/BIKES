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


