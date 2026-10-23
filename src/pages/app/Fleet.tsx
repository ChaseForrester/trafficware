import { prettyWhen } from '../../lib/format.ts'
import { useStore } from '../../lib/store.tsx'

export function Fleet() {
    const { state, today, setVehicleStatus, pingVehicle } = useStore()
    const gpsOn = state.integrations.find((item) => item.id === 'gps')?.connected

    return (
        <div className="page-pad">
            <header className="page-title">
                <div>
                    <p className="kicker">Fleet and equipment</p>
                    <h1>Trucks, rego and gear</h1>
                </div>
            </header>
            {!gpsOn && <p className="banner">GPS telematics is off. Connect it under Integrations before a ping will move a truck.</p>}
            <div className="grid-2">
                {state.vehicles.map((vehicle) => (
                    <article key={vehicle.id} className="card">
                        <p className="kicker">{vehicle.kind} · {vehicle.depot}</p>
                        <h2>{vehicle.name}</h2>
                        <p className="muted">Rego {vehicle.rego} · expires {vehicle.regoExpires}</p>
                        <p className="muted">Service due {vehicle.nextService}</p>
                        <p><strong>{vehicle.gps.label}</strong></p>
                        <p className="muted">{vehicle.gps.speed} km/h · ping {prettyWhen(vehicle.gps.updated)}</p>
                        <div className="hero-actions">
                            <button
                                type="button"
                                className="btn btn-ghost btn-small"
                                onClick={() => setVehicleStatus(vehicle.id, vehicle.status === 'maintenance' ? 'available' : 'maintenance')}
                            >
                                {vehicle.status === 'maintenance' ? 'Mark available' : 'Send to workshop'}
                            </button>
                            <button type="button" className="btn btn-amber btn-small" onClick={() => pingVehicle(vehicle.id)}>
                                Ping GPS
                            </button>
                        </div>
                    </article>
                ))}
            </div>
            <section className="card page-gap">
                <p className="kicker">Equipment</p>
                <h2>Called for on today&apos;s jobs</h2>
                <div className="table">
                    {state.equipment.map((item) => {
                        const booked = state.bookings
                            .filter((booking) => booking.date === today)
                            .flatMap((booking) => booking.equipment)
                            .filter((line) => line.id === item.id)
                            .reduce((sum, line) => sum + line.qty, 0)
                        return (
                            <div key={item.id} className="table-row">
                                <strong>{item.name}</strong>
                                <span>{item.depot}</span>
                                <span>{booked} on jobs today</span>
                                <span>{item.available} of {item.total} in the yard</span>
                            </div>
                        )
                    })}
                </div>
            </section>
        </div>
    )
}
