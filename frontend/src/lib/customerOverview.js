const dateFormatter = new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short' });
const dateWithYearFormatter = new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatRentalPeriod(start, end) {
  const from = start ? new Date(start) : null;
  const to = end ? new Date(end) : null;
  const includeYear = from && to && from.getFullYear() !== to.getFullYear();
  const formatter = includeYear ? dateWithYearFormatter : dateFormatter;
  return `${from ? formatter.format(from) : '–'} – ${to ? formatter.format(to) : '–'}`;
}

export function getCustomerRentalGroups(rentals, { search = '', location = '', status = '' } = {}) {
  const terms = search.trim().toLocaleLowerCase('sv-SE').split(/\s+/).filter(Boolean);
  const groups = new Map();

  for (const rental of rentals) {
    if (location && rental.deliveryPlace !== location) continue;
    if (status && rental.status !== status) continue;
    const searchable = [
      rental.customer, rental.itemName, rental.itemNr, rental.regNr, rental.serialNr, rental.deliveryPlace,
    ].join(' ').toLocaleLowerCase('sv-SE');
    if (!terms.every(term => searchable.includes(term))) continue;

    const key = rental.customerId != null
      ? `customer:${rental.customerId}`
      : rental.customer && rental.customer !== 'Kund saknas'
        ? `name:${rental.customer.trim().toLocaleLowerCase('sv-SE')}`
        : `reservation:${rental.reservationId}`;
    if (!groups.has(key)) {
      groups.set(key, { key, customer: rental.customer, rentals: [] });
    }
    groups.get(key).rentals.push(rental);
  }

  return [...groups.values()].sort((a, b) => a.customer.localeCompare(b.customer, 'sv-SE'));
}

export function getRentalLocationOptions(rentals) {
  return [...new Set(rentals.map(rental => rental.deliveryPlace).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'sv-SE'))
    .map(location => ({ value: location, label: location }));
}
