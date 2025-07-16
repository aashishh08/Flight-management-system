// Web Worker for filtering and sorting flights
self.onmessage = function (e) {
  const { flights, filters, sort } = e.data;
  let result = flights;

  // Filtering
  if (filters) {
    if (filters.origin) {
      result = result.filter(f => f.origin_airport?.code === filters.origin);
    }
    if (filters.destination) {
      result = result.filter(f => f.destination_airport?.code === filters.destination);
    }
    if (filters.departureDate) {
      result = result.filter(f => f.departure_time && f.departure_time.startsWith(filters.departureDate));
    }
    if (filters.cabinClass) {
      result = result.filter(f => f.available_seats?.[filters.cabinClass] > 0);
    }
    if (filters.passengers) {
      result = result.filter(f => {
        const available = f.available_seats?.[filters.cabinClass] || 0;
        return available >= filters.passengers;
      });
    }
  }

  // Sorting
  if (sort) {
    if (sort === 'price') {
      result = result.slice().sort((a, b) => a.price - b.price);
    } else if (sort === 'duration') {
      result = result.slice().sort((a, b) => a.duration - b.duration);
    } else if (sort === 'departure_time') {
      result = result.slice().sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time));
    }
  }

  self.postMessage(result);
}; 