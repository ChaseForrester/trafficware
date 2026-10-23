export type EmploymentStatus = 'active' | 'leave' | 'inactive' | 'onboarding'

export type SkillRecord = {
  id: string
  name: string
  expires: string
  document: string
}

export type OnboardingItem = {
  id: string
  label: string
  done: boolean
}

export type Person = {
  id: string
  name: string
  title: string
  depot: string
  status: EmploymentStatus
  phone: string
  email: string
  ordinaryRate: number
  nightRate: number
  weekendRate: number
  skills: SkillRecord[]
  leaveDates: string[]
  priorHours: { date: string; hours: number }[]
  onboarding: OnboardingItem[]
  color: string
}

export type VehicleKind = 'TMA truck' | 'Ute' | 'Cone truck' | 'Light tower'

export type Vehicle = {
  id: string
  name: string
  rego: string
  kind: VehicleKind
  depot: string
  status: 'available' | 'maintenance'
  nextService: string
  regoExpires: string
  gps: { label: string; updated: string; speed: number }
}

export type EquipmentItem = {
  id: string
  name: string
  depot: string
  available: number
  total: number
}

export type Client = {
  id: string
  name: string
  contact: string
  email: string
  phone: string
  billingRate: number
}

export type SlotResponse = 'pending' | 'accepted' | 'declined'

export type Slot = {
  id: string
  role: string
  personId: string | null
  response: SlotResponse | null
}

export type BookingStatus =
  | 'planning'
  | 'offered'
  | 'confirmed'
  | 'submitted'
  | 'approved'
  | 'invoiced'

export type Geofence = {
  lat: number
  lng: number
  radiusM: number
}

export type SiteCheck = {
  id: string
  personId: string
  at: string
  lat: number
  lng: number
  accuracyM: number
  distanceM: number
  inside: boolean
}

export type DocketSiteCheck = {
  inside: boolean
  distanceM: number
  accuracyM: number
  at: string
}

export type Booking = {
  id: string
  clientId: string
  title: string
  site: string
  depot: string
  date: string
  start: string
  end: string
  notes: string
  slots: Slot[]
  vehicleId: string | null
  equipment: { id: string; qty: number }[]
  invoiceId: string | null
  geofence: Geofence | null
  siteChecks: SiteCheck[]
}

export type DocketStatus = 'queued' | 'submitted' | 'approved' | 'queried'

export type Docket = {
  id: string
  bookingId: string
  personId: string
  start: string
  end: string
  breakMins: number
  notes: string
  signedBy: string
  nearMiss: string
  photoName: string
  status: DocketStatus
  submittedAt: string
  queryNote: string
  siteCheck: DocketSiteCheck | null
}

export type SafetyNote = {
  id: string
  personId: string
  bookingId: string | null
  note: string
  photoName: string
  at: string
  status: 'queued' | 'logged'
}

export type Invoice = {
  id: string
  number: string
  clientId: string
  bookingIds: string[]
  hours: number
  wages: number
  amount: number
  status: 'draft' | 'exported'
  createdAt: string
}

export type IntegrationId = 'xero' | 'employment-hero' | 'gps' | 'hr-onboarding'

export type Integration = {
  id: IntegrationId
  name: string
  blurb: string
  connected: boolean
  lastSync: string | null
}

export type ActivitySource = 'roster-bot' | 'closeout-bot' | 'field-sync' | 'system'

export type Activity = {
  id: string
  at: string
  source: ActivitySource
  message: string
}

export type HomeState = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'ACT' | 'NT'

export type Settings = {
  companyName: string
  homeState: HomeState
  maxShiftHours: number
  maxWeekHours: number
  minRestHours: number
  expiryWarningDays: number
  depots: string[]
  defaultOrdinary: number
  defaultNight: number
  defaultWeekend: number
}

export type DemoRequest = {
  id: string
  name: string
  company: string
  email: string
  phone: string
  crewSize: string
  note: string
  at: string
}

export type AppState = {
  version: 1
  people: Person[]
  vehicles: Vehicle[]
  equipment: EquipmentItem[]
  clients: Client[]
  bookings: Booking[]
  dockets: Docket[]
  outbox: Docket[]
  safetyNotes: SafetyNote[]
  invoices: Invoice[]
  integrations: Integration[]
  activity: Activity[]
  settings: Settings
  demoRequests: DemoRequest[]
  offline: boolean
}

export type Issue = {
  level: 'block' | 'warn'
  code: string
  message: string
}

export type Suggestion = {
  bookingId: string
  slotId: string
  personId: string
  score: number
  reason: string
}

export type Gap = {
  bookingId: string
  slotId: string
  role: string
  bookingTitle: string
  reason: string
}

export type NoticeTone = 'ok' | 'warn' | 'bad'

export type Notice = {
  id: string
  tone: NoticeTone
  text: string
}

export const ROLES = ['Team Leader', 'Traffic Controller', 'TMA Operator'] as const

export const SKILL_NAMES = [
  'Team Leader',
  'Traffic Controller',
  'TMA Operator',
  'White Card',
  'First Aid',
  'Implement TCP',
  'HR Licence',
] as const
