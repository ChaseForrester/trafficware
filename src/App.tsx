import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { GrokProvider } from './components/GrokDock.tsx'
import { IconKicker, TechStack } from './components/Icons.tsx'
import { Marketing } from './components/Marketing.tsx'
import { Splash } from './components/Splash.tsx'
import { Toast } from './components/Toast.tsx'
import { PairProvider } from './lib/pair.tsx'
import { SessionProvider } from './lib/session.tsx'
import { StoreProvider } from './lib/store.tsx'
import { ThemeProvider } from './lib/theme.tsx'
import { Business } from './pages/Business.tsx'
import { Crew } from './pages/Crew.tsx'
import { Demo } from './pages/Demo.tsx'
import { JoinCompany, StartCompany } from './pages/Enter.tsx'
import { FieldApp } from './pages/Field.tsx'
import { Home } from './pages/Home.tsx'
import { Platform } from './pages/Platform.tsx'
import { Pricing } from './pages/Pricing.tsx'
import { Product } from './pages/Product.tsx'
import { ClientView, Compare, Guides, Privacy } from './pages/Trust.tsx'
import { DocketBlank, DocketCodes, DocketPack, DocketSheet } from './pages/Dockets.tsx'
import { BoardPage } from './pages/app/Board.tsx'
import { Clients } from './pages/app/Clients.tsx'
import { Closeout } from './pages/app/Closeout.tsx'
import { Dashboard } from './pages/app/Dashboard.tsx'
import { Fleet } from './pages/app/Fleet.tsx'
import { Integrations } from './pages/app/Integrations.tsx'
import { More } from './pages/app/More.tsx'
import { People } from './pages/app/People.tsx'
import { Settings } from './pages/app/Settings.tsx'
import { AppShell } from './pages/app/Shell.tsx'

const SPLASH_KEY = 'trafficware.splash'

function SplashGate({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(() => sessionStorage.getItem(SPLASH_KEY) !== '1')
  const done = useCallback(() => {
    sessionStorage.setItem(SPLASH_KEY, '1')
    setShow(false)
  }, [])

  return (
    <>
      {children}
      {show ? <Splash onDone={done} /> : null}
    </>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <ThemeProvider>
        <PairProvider>
          <SessionProvider>
            <GrokProvider>
              <Toast />
              <SplashGate>
                <Routes>
                  <Route element={<AppShell />}>
                    <Route path="app" element={<Dashboard />} />
                    <Route path="app/people" element={<People />} />
                    <Route path="app/people/:id" element={<People />} />
                    <Route path="app/board" element={<BoardPage />} />
                    <Route path="app/fleet" element={<Fleet />} />
                    <Route path="app/clients" element={<Clients />} />
                    <Route path="app/closeout" element={<Closeout />} />
                    <Route path="app/integrations" element={<Integrations />} />
                    <Route path="app/settings" element={<Settings />} />
                    <Route path="app/more" element={<More />} />
                    <Route path="field" element={<FieldApp />} />
                  </Route>
                  <Route path="docket/:id" element={<DocketSheet />} />
                  <Route path="dockets" element={<DocketPack />} />
                  <Route path="dockets/blank" element={<DocketBlank />} />
                  <Route path="dockets/codes" element={<DocketCodes />} />
                  <Route element={<Marketing />}>
                    <Route index element={<Home />} />
                    <Route path="business" element={<Business />} />
                    <Route path="crew" element={<Crew />} />
                    <Route path="start" element={<StartCompany />} />
                    <Route path="join" element={<JoinCompany />} />
                    <Route path="site" element={<Navigate to="/" replace />} />
                    <Route path="product" element={<Product />} />
                    <Route path="platform" element={<Platform />} />
                    <Route path="pricing" element={<Pricing />} />
                    <Route path="demo" element={<Demo />} />
                    <Route path="privacy" element={<Privacy />} />
                    <Route path="guides" element={<Guides />} />
                    <Route path="compare" element={<Compare />} />
                    <Route path="client" element={<ClientView />} />
                    <Route path="how" element={<Navigate to={{ pathname: '/', hash: 'how' }} replace />} />
                  </Route>
                  <Route path="*" element={<Missing />} />
                </Routes>
              </SplashGate>
            </GrokProvider>
          </SessionProvider>
        </PairProvider>
      </ThemeProvider>
    </StoreProvider>
  )
}

function Missing() {
  return (
    <main className="wrap page">
      <div className="stack-bar">
        <TechStack />
      </div>
      <IconKicker name="alert">Missing</IconKicker>
      <h1 className="display">That page is not on the site.</h1>
      <Link to="/">Back home</Link>
    </main>
  )
}
