import { DemoForm } from '../components/DemoForm.tsx'
import { useTitle } from '../components/useTitle.ts'

export function Demo() {
    useTitle('Book a demo · Trafficware')
    return (
        <main className="wrap page demo-page">
            <header className="page-hero">
                <p className="kicker">Book a demo</p>
                <h1 className="display">Tell us about the yard.</h1>
                <p className="lede">
                    The request is saved into this workspace. Open Today afterwards and it will be sitting in the office inbox.
                </p>
            </header>
            <DemoForm />
        </main>
    )
}
