export const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] as const

export type AuState = (typeof AU_STATES)[number]

export type StateConduct = {
    id: AuState
    name: string
    authority: string
    instrument: string
    law: string
    whs: string
    field: string
}

export const NATIONAL = {
    standard: 'AS 1742.3, Manual of uniform traffic control devices, Part 3, Traffic control for works on roads.',
    austroads: 'Austroads Guide to Temporary Traffic Management. The state document below prevails where it sets a local variation.',
    acl: 'Australian Consumer Law, Schedule 2 to the Competition and Consumer Act 2010 (Cth), enforced by the Australian Competition and Consumer Commission (ACCC) and by state and territory fair-trading agencies. This docket is a record of services supplied. Hours, breaks, plant and allowances on it must match the work. A record that misstates that is misleading.',
}

export const STATE_CONDUCT: Record<AuState, StateConduct> = {
    NSW: {
        id: 'NSW',
        name: 'New South Wales',
        authority: 'Transport for NSW',
        instrument: 'Technical Standard TS 05492 Traffic Control at Work Sites (TCAWS).',
        law: 'Roads Act 1993 (NSW), including the duty to install, maintain and remove road-work speed limits in line with TCAWS.',
        whs: 'Work Health and Safety Act 2011 (NSW).',
        field: 'Signs, speed limits and portable signals on this sheet follow the approved traffic guidance scheme and TCAWS.',
    },
    VIC: {
        id: 'VIC',
        name: 'Victoria',
        authority: 'Department of Transport and Planning',
        instrument: 'Code of Practice for Worksite Safety – Traffic Management, made under the Road Management Act 2004 (Vic). It incorporates the Austroads Guide to Temporary Traffic Management and AS 1742.3–2019, as varied for Victoria.',
        law: 'Road Management Act 2004 (Vic) and Road Safety Act 1986 (Vic).',
        whs: 'Occupational Health and Safety Act 2004 (Vic).',
        field: 'The worksite follows the approved traffic guidance scheme under the Victorian Code of Practice for Worksite Safety – Traffic Management.',
    },
    QLD: {
        id: 'QLD',
        name: 'Queensland',
        authority: 'Department of Transport and Main Roads',
        instrument: 'Queensland Guide to Temporary Traffic Management, read with the Manual of Uniform Traffic Control Devices (Queensland) and the Traffic Controller Accreditation Scheme.',
        law: 'Transport Operations (Road Use Management) Act 1995 (Qld) and the accreditation regulation for traffic controllers.',
        whs: 'Work Health and Safety Act 2011 (Qld) and the Traffic Management for Construction or Maintenance Work Code of Practice.',
        field: 'Only an accredited traffic controller worked a control position. The scheme matches the Queensland guide for this site.',
    },
    SA: {
        id: 'SA',
        name: 'South Australia',
        authority: 'Department for Infrastructure and Transport',
        instrument: 'SA Standards for Workzone Traffic Management, and AS 1742.3 as varied by the DIT supplement and the Code of Technical Requirements.',
        law: 'Road Traffic Act 1961 (SA) and its regulations.',
        whs: 'Work Health and Safety Act 2012 (SA).',
        field: 'Devices on this worksite follow the SA workzone standard, including any DIT variation from AS 1742.3.',
    },
    WA: {
        id: 'WA',
        name: 'Western Australia',
        authority: 'Main Roads Western Australia',
        instrument: 'Traffic Management for Works on Roads Code of Practice. Where it differs from the Austroads guide or AS 1742.3–2019, the Code prevails.',
        law: 'Road Traffic Code 2000 (WA) and Main Roads requirements for works on roads.',
        whs: 'Work Health and Safety Act 2020 (WA).',
        field: 'The traffic management plan for this job is based on the Main Roads Code.',
    },
    TAS: {
        id: 'TAS',
        name: 'Tasmania',
        authority: 'Department of State Growth',
        instrument: 'Tasmanian Guide to Traffic Control for Works on Roads (Department of State Growth), read with AS 1742.3 and the Austroads guide. For Traffic Act 1925 (Tas) s 59, the Guide is the direction for traffic signs at work sites.',
        law: 'Traffic Act 1925 (Tas).',
        whs: 'Work Health and Safety Act 2012 (Tas).',
        field: 'The closure matches the approved scheme in the Tasmanian Guide for this road.',
    },
    ACT: {
        id: 'ACT',
        name: 'Australian Capital Territory',
        authority: 'Transport Canberra and City Services',
        instrument: 'Transport Canberra and City Services approval of the traffic management plan for work on a public road, footpath or path, with AS 1742.3.',
        law: 'Road Transport Act 1999 and the Road Transport (Road Rules) Regulation 2017 (ACT).',
        whs: 'Work Health and Safety Act 2011 (ACT).',
        field: 'Devices were placed under the approved ACT traffic management plan.',
    },
    NT: {
        id: 'NT',
        name: 'Northern Territory',
        authority: 'Department of Logistics and Infrastructure',
        instrument: 'Department of Logistics and Infrastructure Standard Specification for Roadworks. Works traffic control must comply with AS 1742.3 and the Austroads Guide to Temporary Traffic Management.',
        law: 'Traffic Act 1987 (NT).',
        whs: 'Work Health and Safety (National Uniform Legislation) Act 2011 (NT).',
        field: 'The site was controlled under the approved NT traffic guidance scheme.',
    },
}

export function conductFor(id: AuState) {
    return STATE_CONDUCT[id]
}
