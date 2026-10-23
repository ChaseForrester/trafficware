import { Link, Route, Routes } from 'react-router-dom'
import { Marketing } from './components/Marketing.tsx'
import { Toast } from './components/Toast.tsx'
import { StoreProvider } from './lib/store.tsx'
import { Demo } from './pages/Demo.tsx'
import { FieldApp } from './pages/Field.tsx'
import { Home } from './pages/Home.tsx'
import { Platform } from './pages/Platform.tsx'
import { Pricing } from './pages/Pricing.tsx'
import { Product } from './pages/Product.tsx'
import { BoardPage } from './pages/app/Board.tsx'
import { Clients } from './pages/app/Clients.tsx'
import { Closeout } from './pages/app/Closeout.tsx'
import { Dashboard } from './pages/app/Dashboard.tsx'
import { Fleet } from './pages/app/Fleet.tsx'
import { Integrations } from './pages/app/Integrations.tsx'
import { People } from './pages/app/People.tsx'
import { Settings } from './pages/app/Settings.tsx'
import { AppShell } from './pages/app/Shell.tsx'

export default function App() {
  return (
    <StoreProvider>
      <Toast />
      <Routes>
        <Route element={<Marketing />}>
          <Route index element={<Home />} />
          <Route path="product" element={<Product />} />
          <Route path="platform" element={<Platform />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="demo" element={<Demo />} />
        </Route>
        <Route path="app" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="people" element={<People />} />
          <Route path="people/:id" element={<People />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="fleet" element={<Fleet />} />
          <Route path="clients" element={<Clients />} />
          <Route path="closeout" element={<Closeout />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="field" element={<FieldApp />} />
        <Route path="*" element={<Missing />} />
      </Routes>
    </StoreProvider>
  )
}

function Missing() {
  return (
    <main className="wrap page">
      <h1 className="display">That page is not on the site.</h1>
      <Link to="/">Back home</Link>
    </main>
  )
}
