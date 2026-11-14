import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, RotateCw } from 'lucide-react';
import ActionButton from '../../components/ActionButton';
import FilterSelect from '../../components/FilterSelect';
import { getPlanningCustomerRentals } from '../../lib/planningApi';
import { PLANNING_STATUS_COLORS } from '../../lib/planningStatus';
import { formatRentalPeriod, getCustomerRentalGroups, getRentalLocationOptions } from '../../lib/customerOverview';
import { withPlanningLoadingDelay } from '../../lib/planningLoading';
import PlanningSkeleton from './PlanningSkeleton';
import { useDelayedSkeleton } from '../../hooks/useDelayedSkeleton';

const CustomerOverview = ({ typeSelector }) => {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('out');
  const showLoadingSkeleton = useDelayedSkeleton(loading, 200);

  useEffect(() => {
    let isActive = true;
    withPlanningLoadingDelay(getPlanningCustomerRentals())
      .then(data => {
        if (isActive) setRentals(data);
      })
      .catch(error => {
        if (isActive) setError(error.message || 'Kunde inte läsa kundöversikten.');
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => { isActive = false; };
  }, [reloadKey]);

  const refresh = () => {
    setLoading(true);
    setError('');
    setReloadKey(value => value + 1);
  };
  const locationOptions = useMemo(() => getRentalLocationOptions(rentals), [rentals]);
  const groups = useMemo(() => getCustomerRentalGroups(rentals, {
    search, location: location?.value ?? '', status,
  }), [rentals, search, location, status]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col px-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-6 pb-7 2xl:px-10">

        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="shrink-0">{typeSelector}</div>
          <input
            type="search"
            aria-label="Sök kund, objekt eller plats"
            placeholder="Sök kund, objekt eller plats..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="h-7 w-64 max-w-full rounded-full border border-lime-600 bg-white px-4 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700"
          />
          <FilterSelect
            inputId="customer-overview-location"
            aria-label="Plats"
            value={location}
            onChange={setLocation}
            options={locationOptions}
            placeholder="Alla platser"
            width="w-50"
            isSearchable
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[['', { name: 'Alla' }], ...Object.entries(PLANNING_STATUS_COLORS)].map(([code, colors]) => (
            <button
              key={code}
              type="button"
              aria-pressed={status === code}
              onClick={() => setStatus(code)}
              className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs text-gray-700 transition ${
                status === code ? 'border-lime-600 bg-lime-50' : 'border-transparent hover:bg-lime-50'
              }`}
            >
              {code && <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colors.bg }} />}
              <span className="capitalize">{colors.name}</span>
            </button>
          ))}
          {/* <ActionButton label="Uppdatera" icon={RotateCw} onClick={refresh} disabled={loading} accent="lime" /> */}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col" aria-busy={loading}>
        {loading && showLoadingSkeleton && (
          <PlanningSkeleton variant="customer" labelWidth={192} headerHeight={24} />
        )}
        {error && (
          <div role="alert" className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
            {error}
            <div className="mt-2">
              <ActionButton label="Försök igen" icon={RotateCw} onClick={refresh} disabled={loading} accent="lime" />
            </div>
          </div>
        )}
        {/* {!loading && !error && (
          <p className="mb-3 text-xs text-gray-500" aria-live="polite">
            {groups.length} {groups.length === 1 ? 'kund' : 'kunder'} · {rentalCount} objekt med bokning eller pågående hyra
          </p>
        )} */}
        {!loading && !error && rentals.length > 0 && (
          <div className="min-h-0 overflow-auto">
            <table className="w-full min-w-[600px] border-collapse text-xs text-gray-700">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-tiny font-semibold uppercase tracking-[0.10em] text-gray-500 h-6">
                  <th scope="col" className="w-48 border-b border-gray-200 px-4 bg-transparent"></th>
                  <th scope="col" className="border-b border-gray-200 px-4 ">
                    Uthyrda objekt · {status ? PLANNING_STATUS_COLORS[status].name : 'Alla'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map(group => (
                  <tr key={group.key} className="border-b border-gray-200 last:border-b-0">
                    <th scope="row" className="bg-[#d4defc] px-4 text-left align-middle border-b border-stone-400/50 last:border-b-0">
                      <p className="font-semibold text-gray-800">{group.customer}</p>
                      <p className="mt-0.5 text-tiny font-normal text-gray-500">{group.rentals.length} objekt</p>
                    </th>
                    <td className="px-3 py-1.5">
                      <div className="flex flex-wrap gap-2">
                        {group.rentals.map(rental => {
                          const colors = PLANNING_STATUS_COLORS[rental.status];
                          return (
                            <Link
                              key={rental.id}
                              to={`/operations/reservation/${rental.reservationId}`}
                              className="block w-54 rounded-sm border border-gray-200 bg-white px-3 py-2.5 shadow-sm transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-lime-600"
                              aria-label={`${rental.itemName}, ${rental.itemNr}, ${rental.customer}, ${colors.name}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 break-words font-semibold text-gray-800">{rental.itemName}</p>
                                <span className="shrink-0 font-semibold text-red-500">{rental.itemNr}</span>
                              </div>
                              <p className="min-h-4 text-tiny text-gray-500">{rental.regNr || rental.serialNr}</p>
                              <p className="mt-1 flex items-center gap-1 text-xs">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="break-words">{rental.deliveryPlace || 'Plats saknas'}</span>
                              </p>
                              <div className="mt-1 flex items-center justify-between gap-2 text-tiny text-gray-500">
                                <span className="min-w-0">{formatRentalPeriod(rental.start, rental.end)}</span>
                                <span
                                  className="shrink-0 rounded-full px-1.5 py-0.5 leading-none"
                                  style={{ backgroundColor: colors.bg, color: colors.text }}
                                >
                                  {colors.name}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && groups.length === 0 && (
          <p className="py-8 text-center text-xs text-gray-500">
            {rentals.length === 0 ? 'Inga bokade eller utlämnade objekt hittades.' : 'Inga kunder eller objekt matchar filtren.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default CustomerOverview;
