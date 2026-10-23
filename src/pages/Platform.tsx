import { Link } from 'react-router-dom'
import { Architecture } from '../components/Architecture.tsx'
import { IconKicker } from '../components/Icons.tsx'
import { BotMark } from '../components/BotMark.tsx'
import { useTitle } from '../components/useTitle.ts'

export function Platform() {
    useTitle('Platform · Trafficware')
    return (
        <main className="wrap page">
            <header className="page-hero">
                <IconKicker name="platform">Platform</IconKicker>
                <h1 className="display">One database. Three bots. The whole shift.</h1>
                <p className="lede">
                    The office, the roster and the field read and write the same jobs. The bots do not keep a second copy.
                    They suggest, review and sync against that record.
                </p>
            </header>
            <Architecture />
            <div className="grid-3 page-gap">
                <article className="card">
                    <div className="story-bot">
                        <BotMark bot="roster" size={48} />
                        <p className="kicker">Roster bot</p>
                    </div>
                    <h2>Suggests, then waits.</h2>
                    <p>It will not place someone who fails a rule. You apply the list, and the crew still has to accept on the phone.</p>
                    <Link to="/app/board">Run it on the board</Link>
                </article>
                <article className="card">
                    <div className="story-bot">
                        <BotMark bot="closeout" size={48} />
                        <p className="kicker">Close-out bot</p>
                    </div>
                    <h2>Reads the docket against the roster.</h2>
                    <p>Missing signatures, extra hours and near misses stay in the queue. Clean dockets can be approved together.</p>
                    <Link to="/app/closeout">Open close-out</Link>
                </article>
                <article className="card">
                    <div className="story-bot">
                        <BotMark bot="field" size={48} />
                        <p className="kicker">Field sync bot</p>
                    </div>
                    <h2>The outbox is the queue.</h2>
                    <p>Turn the phone offline, submit a docket, then come back. Nothing reaches payroll until the sync runs.</p>
                    <Link to="/field">Open the field app</Link>
                </article>
            </div>
            <article className="card page-gap">
                <IconKicker name="cloud">Database</IconKicker>
                <h2>On this device for now.</h2>
                <p>
                    The workspace saves in the browser. When you add Firebase, replace the load and save functions in
                    <code> src/lib/persistence.ts</code>. The screens already talk to one store, so they do not need to change.
                    GitHub and Vercel can host the site as it stands.
                </p>
                <Link to="/app/settings">See the database status</Link>
            </article>
        </main>
    )
}
