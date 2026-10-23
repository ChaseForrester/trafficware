import { AU_STATES, NATIONAL, conductFor, type AuState } from './conduct.ts'

export type DocketTicket = { name: string; expires: string; document: string }

export type DocketModel = {
  companyName: string
  abn: string
  state: AuState
  number: string
  job: string
  site: string
  client: string
  date: string
  roster: string
  actualStart: string
  actualEnd: string
  breakMins: string
  hours: string
  role: string
  worker: string
  phone: string
  signedBy: string
  notes: string
  nearMiss: string
  photo: string
  status: string
  vehicle: string
  gear: string[]
  tickets: DocketTicket[]
  ticketOk: boolean
  signed: boolean
}

function esc(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function row(label: string, value: string) {
  return `<div class="drow"><span>${esc(label)}</span><strong>${esc(value || '—')}</strong></div>`
}

export function docketInnerHtml(model: DocketModel) {
  const conduct = conductFor(model.state)
  const tickets = model.tickets.length
    ? model.tickets.map((ticket) => `<li>${esc(ticket.name)} · expires ${esc(ticket.expires)} · ${esc(ticket.document)}</li>`).join('')
    : '<li>No ticket recorded on this person.</li>'
  const gear = model.gear.length ? model.gear.map((item) => `<li>${esc(item)}</li>`).join('') : '<li>No plant listed on the job.</li>'

  return `
    <header class="ds-head">
      <div>
        <p class="ds-kicker">Traffic control docket</p>
        <h1>${esc(model.companyName)}</h1>
        <p>${esc(model.abn ? `ABN ${model.abn}` : 'ABN ___________')} · ${esc(conduct.name)}</p>
      </div>
      <div class="ds-no">
        <span>Docket</span>
        <strong>${esc(model.number)}</strong>
        <span>${esc(model.status || 'Draft')}</span>
      </div>
    </header>
    <section class="ds-grid">
      ${row('Job', model.job)}
      ${row('Client', model.client)}
      ${row('Site', model.site)}
      ${row('Date', model.date)}
      ${row('Rostered', model.roster)}
      ${row('Worked', model.actualStart || model.actualEnd ? `${model.actualStart}–${model.actualEnd}` : '')}
      ${row('Break', model.breakMins ? `${model.breakMins} min` : '')}
      ${row('Paid hours', model.hours)}
      ${row('Role', model.role)}
      ${row('Worker', model.worker)}
      ${row('Phone', model.phone)}
      ${row('Vehicle', model.vehicle)}
    </section>
    <section>
      <h2>Plant and gear</h2>
      <ul>${gear}</ul>
    </section>
    <section>
      <h2>Tickets on this person</h2>
      <ul>${tickets}</ul>
      <p class="ds-flag">${model.ticketOk ? 'No listed ticket was past its expiry on this date.' : 'A listed ticket was expired on this date. Do not treat this shift as compliant until the office clears it.'}</p>
    </section>
    <section>
      <h2>Work notes</h2>
      <p>${esc(model.notes || 'None recorded.')}</p>
      <h2>Near miss</h2>
      <p>${esc(model.nearMiss || 'None recorded.')}${model.photo ? ` Photo: ${esc(model.photo)}` : ''}</p>
    </section>
    <section>
      <h2>Traffic guidance scheme</h2>
      <p class="ds-line">TGS / TMP number ________________________________ &nbsp; Drawn by ______________________</p>
      <p>${esc(conduct.field)}</p>
    </section>
    <section class="ds-rules">
      <h2>What this record has to satisfy</h2>
      <p><strong>National.</strong> ${esc(NATIONAL.standard)} ${esc(NATIONAL.austroads)}</p>
      <p><strong>${esc(conduct.id)} · ${esc(conduct.authority)}.</strong> ${esc(conduct.instrument)}</p>
      <p><strong>Road law.</strong> ${esc(conduct.law)}</p>
      <p><strong>Safety.</strong> ${esc(conduct.whs)}</p>
      <p><strong>Fair trading.</strong> ${esc(NATIONAL.acl)}</p>
      <p class="ds-note">This sheet names the rules. It is not a copy of the state manual. The manual remains the authority if they differ.</p>
    </section>
    <section class="ds-sign">
      <div>
        <h2>Worker</h2>
        <p>I confirm these times, breaks and notes are a true record. I have not left out a near miss I know about. My ticket for this role was current when I started. I worked to the traffic guidance scheme for this site, and I was fit for the shift.</p>
        <p class="ds-line">Signed ${esc(model.signedBy || '______________________________')}</p>
        <p class="ds-line">Signature ________________________________ &nbsp; Time __________</p>
      </div>
      <div>
        <h2>Site representative</h2>
        <p>The hours and the traffic control described match what I saw on site.</p>
        <p class="ds-line">Name ______________________________________</p>
        <p class="ds-line">Company ___________________________________</p>
        <p class="ds-line">Signature ________________________________ &nbsp; Time __________</p>
      </div>
    </section>
    <section>
      <h2>Office check before pay or invoice</h2>
      <ul class="ds-checks">
        <li>${model.signed ? '☑' : '☐'} Worker name is on the docket</li>
        <li>${model.ticketOk ? '☑' : '☐'} Tickets current for the role</li>
        <li>☐ Hours match the roster, or the difference is approved</li>
        <li>☐ Fatigue and rest rules cleared</li>
        <li>☐ TGS number filed with this docket</li>
        <li>☐ Client signature, or a noted refusal</li>
        <li>☐ Near miss copied to the safety log if one was written</li>
      </ul>
    </section>
    <footer class="ds-foot">
      <p>${esc(model.companyName)} · ${esc(conduct.name)} · Keep with the job file. Print and choose Save as PDF to file a copy.</p>
    </footer>`
}

const DOCKET_CSS = `
  body { font-family: "Source Sans 3", "Segoe UI", sans-serif; color: #282c35; margin: 24px; }
  h1 { font-size: 28px; margin: 0; }
  h2 { font-size: 16px; margin: 18px 0 6px; }
  p, li { font-size: 14px; line-height: 1.4; }
  .ds-kicker { letter-spacing: 0.12em; text-transform: uppercase; font-size: 12px; color: #f34f27; margin: 0 0 4px; }
  .ds-head, .ds-sign { display: flex; justify-content: space-between; gap: 24px; }
  .ds-no { text-align: right; }
  .ds-no strong { display: block; font-size: 20px; }
  .ds-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px; }
  .drow { display: grid; gap: 2px; padding: 8px 10px; border: 1px solid #e4ddd4; border-radius: 8px; background: #faf8f5; }
  .drow span { color: #6b6258; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
  .drow strong { font-size: 15px; }
  .ds-rules { margin-top: 18px; padding: 12px 14px; background: #f6f4f2; border-radius: 10px; font-size: 13px; color: #4a453f; }
  .ds-rules h2 { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 8px; }
  .ds-rules p { margin: 0 0 6px; }
  .ds-line { border-bottom: 1px solid #282c35; padding-bottom: 8px; }
  .ds-flag, .ds-note { background: #f6f4f2; padding: 8px 10px; }
  .ds-checks { list-style: none; padding: 0; }
  .ds-foot { margin-top: 24px; color: #5c6370; font-size: 12px; }
  article.sheet { break-after: page; }
  @media print { .no-print { display: none; } body { margin: 0; } }
`

function page(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>${DOCKET_CSS}</style>
</head>
<body>
  <p class="no-print"><button onclick="print()">Print or save PDF</button></p>
  ${body}
</body>
</html>`
}

export function docketStandaloneHtml(model: DocketModel) {
  return page(`${model.number} · ${model.job}`, `<article>${docketInnerHtml(model)}</article>`)
}

export function docketPackHtml(models: DocketModel[]) {
  const body = models.map((model) => `<article class="sheet">${docketInnerHtml(model)}</article>`).join('\n')
  const title = models[0] ? `Dockets ${models[0].date}` : 'Dockets'
  return page(title, body)
}

export function conductIndexHtml(companyName: string) {
  const states = AU_STATES.map((id) => {
    const conduct = conductFor(id)
    return `<section>
      <h2>${esc(conduct.id)} · ${esc(conduct.name)}</h2>
      <p><strong>${esc(conduct.authority)}.</strong> ${esc(conduct.instrument)}</p>
      <p><strong>Road law.</strong> ${esc(conduct.law)}</p>
      <p><strong>Safety.</strong> ${esc(conduct.whs)}</p>
      <p>${esc(conduct.field)}</p>
    </section>`
  }).join('')
  return page(`${companyName} · codes named on a docket`, `
    <article>
      <p class="ds-kicker">Print index</p>
      <h1>${esc(companyName)}</h1>
      <p>Each job docket names the national rules and the instrument for the state the job was worked in. This page lists every state so the office can see they are all on the form.</p>
      <h2>National, on every docket</h2>
      <p>${esc(NATIONAL.standard)}</p>
      <p>${esc(NATIONAL.austroads)}</p>
      <p><strong>Fair trading.</strong> ${esc(NATIONAL.acl)}</p>
      <p class="ds-note">These sheets name the rules. They are not copies of the state manuals.</p>
      ${states}
    </article>`)
}

export function downloadHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
