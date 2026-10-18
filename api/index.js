// server/app.ts
import express from "express";
import { randomInt, randomUUID as randomUUID2 } from "node:crypto";
import { mkdir as mkdir2, readFile as readFile2, rename as rename2, stat, unlink as unlink2, writeFile as writeFile2 } from "node:fs/promises";
import path3 from "node:path";
import { fileURLToPath } from "node:url";

// src/data/images.ts
var POTHOLE_IMAGE = "/api/assets/pothole_road_hazard_1791996006345.jpg";
var REPAIRED_ROAD_IMAGE = "/api/assets/road_repaired_after.svg";

// src/data/mockReports.ts
var potholeImg = POTHOLE_IMAGE;
var INITIAL_REPORTS = [
  {
    id: "#CF-45821",
    hazardType: "Road Hazard (Pothole)",
    subType: "Pothole",
    department: "Roads & Stormwater",
    departmentUnit: "(Maintenance & Repairs)",
    location: "-33.9249, 18.4241",
    address: "Kloof Nek Rd & Camp St, Gardens, Cape Town",
    status: "In Progress",
    date: "14 Oct 2026",
    severity: "High",
    description: "Large pothole, potential risk to vehicles and pedestrians.",
    photoUrl: potholeImg,
    contact: "mpho.shiang@example.com",
    assignedTeam: "Roads Crew Delta 4",
    detectedAt: "14 Oct 2026, 09:14 AM",
    timeline: [
      { stage: "Photo Submitted", timestamp: "14 Oct 2026, 09:14 AM", done: true, note: "Received via CivicFix Mobile Web" },
      { stage: "Sample triage (demo data)", timestamp: "14 Oct 2026, 09:15 AM", done: true, note: "Illustrative seed data; no model analysis was run." },
      { stage: "Dispatched to Department", timestamp: "14 Oct 2026, 09:40 AM", done: true, note: "Assigned to Roads & Stormwater Maintenance Unit" },
      { stage: "Repair Crew En Route", timestamp: "14 Oct 2026, 11:20 AM", done: true, note: "Asphalt patching vehicle deployed" },
      { stage: "Inspection & Resolution", timestamp: "Estimated Today", done: false, note: "Final compaction and road clearance" }
    ]
  },
  {
    id: "#CF-45820",
    hazardType: "Water Hazard",
    subType: "Broken Water Main",
    department: "Water & Sanitation",
    departmentUnit: "(Emergency Valve Team)",
    location: "-33.9152, 18.4087",
    address: "Somerset Rd & Napier St, Green Point",
    status: "Assigned",
    date: "13 Oct 2026",
    severity: "High",
    description: "Pressurized water bursting from pavement edge, causing pooling.",
    photoUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
    contact: "mpho.shiang@example.com",
    assignedTeam: "Rapid Water Response 2",
    detectedAt: "13 Oct 2026, 14:32 PM",
    timeline: [
      { stage: "Photo Submitted", timestamp: "13 Oct 2026, 14:32 PM", done: true },
      { stage: "Sample triage (demo data)", timestamp: "13 Oct 2026, 14:33 PM", done: true, note: "Illustrative seed data; no model analysis was run." },
      { stage: "Dispatched to Department", timestamp: "13 Oct 2026, 15:00 PM", done: true },
      { stage: "Repair Crew En Route", timestamp: "Scheduled 14 Oct", done: false }
    ]
  },
  {
    id: "#CF-45819",
    hazardType: "Waste Hazard",
    subType: "Illegal Dumping",
    department: "Waste Management",
    departmentUnit: "(Special Waste Removal)",
    location: "-33.9314, 18.4260",
    address: "Roeland St & Buitenkant St, Cape Town CBD",
    status: "In Progress",
    date: "12 Oct 2026",
    severity: "Medium",
    description: "Piles of construction rubble and discarded plastic obstructing curb.",
    photoUrl: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80",
    contact: "mpho.shiang@example.com",
    assignedTeam: "Civic Clean Sweep 1",
    detectedAt: "12 Oct 2026, 08:20 AM",
    timeline: [
      { stage: "Photo Submitted", timestamp: "12 Oct 2026, 08:20 AM", done: true },
      { stage: "Sample triage (demo data)", timestamp: "12 Oct 2026, 08:21 AM", done: true, note: "Illustrative seed data; no model analysis was run." },
      { stage: "Dispatched to Department", timestamp: "12 Oct 2026, 09:10 AM", done: true },
      { stage: "Cleanup In Progress", timestamp: "13 Oct 2026, 10:00 AM", done: true }
    ]
  },
  {
    id: "#CF-45818",
    hazardType: "Traffic Infrastructure",
    subType: "Traffic Light Fault",
    department: "Traffic & Transport",
    departmentUnit: "(Signal Electronics)",
    location: "-33.9176, 18.4198",
    address: "Buitengracht St & Strand St, Cape Town",
    status: "Resolved",
    date: "11 Oct 2026",
    severity: "High",
    description: "Traffic signals dark during peak rush hour, causing congestion.",
    photoUrl: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80",
    contact: "mpho.shiang@example.com",
    assignedTeam: "Traffic Signals Squad 3",
    detectedAt: "11 Oct 2026, 07:15 AM",
    timeline: [
      { stage: "Photo Submitted", timestamp: "11 Oct 2026, 07:15 AM", done: true },
      { stage: "Sample triage (demo data)", timestamp: "11 Oct 2026, 07:16 AM", done: true, note: "Illustrative seed data; no model analysis was run." },
      { stage: "Dispatched to Department", timestamp: "11 Oct 2026, 07:30 AM", done: true },
      { stage: "Controller Repaired & Tested", timestamp: "11 Oct 2026, 10:45 AM", done: true }
    ]
  },
  {
    id: "#CF-45817",
    hazardType: "Drainage Hazard",
    subType: "Drainage Issue",
    department: "Water & Sanitation",
    departmentUnit: "(Stormwater Catchments)",
    location: "-33.9221, 18.4172",
    address: "Longmarket St & St Georges Mall",
    status: "Resolved",
    date: "10 Oct 2026",
    severity: "Medium",
    description: "Blocked stormwater grate with autumn leaves and silt overflow.",
    photoUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?auto=format&fit=crop&w=800&q=80",
    contact: "mpho.shiang@example.com",
    assignedTeam: "Drainage Jet Vac Unit 7",
    detectedAt: "10 Oct 2026, 11:05 AM",
    timeline: [
      { stage: "Photo Submitted", timestamp: "10 Oct 2026, 11:05 AM", done: true },
      { stage: "Sample triage (demo data)", timestamp: "10 Oct 2026, 11:06 AM", done: true, note: "Illustrative seed data; no model analysis was run." },
      { stage: "Drain Flushed & Cleared", timestamp: "10 Oct 2026, 16:30 PM", done: true }
    ]
  },
  {
    id: "#CF-45816",
    hazardType: "Electrical Hazard",
    subType: "Damaged Street Lamp",
    department: "Electricity Services",
    departmentUnit: "(Public Lighting)",
    location: "-33.9288, 18.4115",
    address: "Upper Orange St, Oranjezicht",
    status: "In Progress",
    date: "09 Oct 2026",
    severity: "Medium",
    description: "Streetlight pole tilted after vehicle impact, dangling fixture.",
    photoUrl: "https://images.unsplash.com/photo-1508873696983-2df57046475a?auto=format&fit=crop&w=800&q=80",
    contact: "mpho.shiang@example.com",
    assignedTeam: "Lighting Crew 2",
    detectedAt: "09 Oct 2026, 21:10 PM"
  },
  {
    id: "#CF-45815",
    hazardType: "Road Hazard",
    subType: "Missing Manhole Cover",
    department: "Roads & Stormwater",
    departmentUnit: "(Safety Hazards)",
    location: "-33.9350, 18.4180",
    address: "Mill St, Gardens",
    status: "In Progress",
    date: "08 Oct 2026",
    severity: "Critical",
    description: "Deep exposed sewer manhole without warning cone.",
    photoUrl: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80",
    contact: "mpho.shiang@example.com",
    assignedTeam: "Emergency Road Safety",
    detectedAt: "08 Oct 2026, 17:40 PM"
  },
  {
    id: "#CF-45814",
    hazardType: "Parks & Recreation",
    subType: "Fallen Tree Branch",
    department: "City Parks",
    departmentUnit: "(Arboriculture)",
    location: "-33.9295, 18.4162",
    address: "Company\u2019s Garden Walkway",
    status: "Resolved",
    date: "07 Oct 2026",
    severity: "Medium",
    description: "Heavy pine bough blocking pedestrian promenade.",
    photoUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
    contact: "mpho.shiang@example.com",
    assignedTeam: "Tree Care Specialists",
    detectedAt: "07 Oct 2026, 13:25 PM"
  },
  {
    id: "#CF-45813",
    hazardType: "Road Hazard",
    subType: "Sunken Trench",
    department: "Roads & Stormwater",
    departmentUnit: "(Maintenance & Repairs)",
    location: "-33.9210, 18.4230",
    address: "Sir Lowry Rd & Russell St",
    status: "In Progress",
    date: "06 Oct 2026",
    severity: "Medium",
    description: "Cable trench asphalt sunken by 8cm across lane.",
    photoUrl: potholeImg,
    contact: "mpho.shiang@example.com",
    assignedTeam: "Roads Crew Beta",
    detectedAt: "06 Oct 2026, 10:11 AM"
  },
  {
    id: "#CF-45812",
    hazardType: "Traffic Infrastructure",
    subType: "Faded Pedestrian Crossing",
    department: "Traffic & Transport",
    departmentUnit: "(Road Markings)",
    location: "-33.9189, 18.4130",
    address: "Somerset Rd, De Waterkant",
    status: "In Progress",
    date: "05 Oct 2026",
    severity: "Low",
    description: "Zebra crossing markings almost completely eroded near school.",
    photoUrl: "https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=800&q=80",
    contact: "mpho.shiang@example.com",
    assignedTeam: "Line Marking Ops",
    detectedAt: "05 Oct 2026, 16:00 PM"
  },
  {
    id: "#CF-45811",
    hazardType: "Waste Hazard",
    subType: "Overflowing Public Bin",
    department: "Waste Management",
    departmentUnit: "(Street Cleansing)",
    location: "-33.9234, 18.4211",
    address: "Adderley St & Darling St",
    status: "Resolved",
    date: "04 Oct 2026",
    severity: "Low",
    description: "Tourist square public bin overflowing onto brick pavement.",
    photoUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
    contact: "mpho.shiang@example.com",
    assignedTeam: "Area Cleansing Crew 4",
    detectedAt: "04 Oct 2026, 12:44 PM"
  },
  {
    id: "#CF-45810",
    hazardType: "Private Property",
    subType: "Unmaintained Private Wall",
    department: "Building Compliance",
    departmentUnit: "(Private Encroachment)",
    location: "-33.9312, 18.4145",
    address: "Wandel St, Gardens",
    status: "Rejected",
    date: "02 Oct 2026",
    severity: "Low",
    description: "Cracking garden boundary wall located entirely inside private erf.",
    photoUrl: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80",
    contact: "mpho.shiang@example.com",
    assignedTeam: "Municipal Inspectorate",
    detectedAt: "02 Oct 2026, 09:30 AM",
    notes: "Non-municipal infrastructure; owner notified via property rates register."
  }
];

// src/utils/timeline.ts
var PIPELINE_STAGES = [
  "Report submitted",
  "Report details reviewed",
  "Verified by municipality",
  "Assigned to crew",
  "Repair in progress",
  "Repair completed",
  "Resident confirmation"
];
var PENDING_TIMESTAMP = "Pending";
var STATUS_STAGE = {
  Received: "Report submitted",
  Verified: "Verified by municipality",
  Assigned: "Assigned to crew",
  "In Progress": "Repair in progress",
  Resolved: "Repair completed",
  Rejected: "Rejected by municipality"
};
function orderIndex(stage) {
  return PIPELINE_STAGES.indexOf(stage);
}
function clone(timeline) {
  return (timeline ?? []).map((entry) => ({ ...entry }));
}
function ensureStage(list, stage, order) {
  if (list.some((entry) => entry.stage === stage)) return;
  let insertAt = list.length;
  if (order >= 0) {
    insertAt = 0;
    for (const entry of list) {
      const existing = orderIndex(entry.stage);
      if (existing < 0 || existing < order) insertAt = list.indexOf(entry) + 1;
      else break;
    }
  }
  list.splice(insertAt, 0, { stage, timestamp: PENDING_TIMESTAMP, done: false });
}
function applyStatusToTimeline(timeline, status, timestamp) {
  const next = clone(timeline);
  const target = STATUS_STAGE[status];
  const targetIndex = orderIndex(target);
  if (targetIndex === -1) {
    const existing = next.find((entry) => entry.stage === target);
    if (existing) {
      existing.done = true;
      if (!existing.timestamp || existing.timestamp === PENDING_TIMESTAMP) {
        existing.timestamp = timestamp;
      }
    } else {
      next.push({ stage: target, timestamp, done: true });
    }
    return next;
  }
  for (let index = 0; index < PIPELINE_STAGES.length; index += 1) {
    ensureStage(next, PIPELINE_STAGES[index], index);
  }
  for (let index = 0; index <= targetIndex; index += 1) {
    const entry = next.find((item) => item.stage === PIPELINE_STAGES[index]);
    if (!entry || entry.done) continue;
    entry.done = true;
    if (entry.timestamp === PENDING_TIMESTAMP) entry.timestamp = timestamp;
  }
  return next;
}
function markResidentConfirmation(timeline, confirmed, timestamp) {
  const next = clone(timeline);
  const stage = "Resident confirmation";
  const existing = next.find((entry) => entry.stage === stage);
  const note = confirmed ? "Resident confirmed the fix." : "Resident reported the issue is still not fixed.";
  if (existing) {
    existing.done = true;
    existing.timestamp = timestamp;
    existing.note = note;
    return next;
  }
  next.push({ stage, timestamp, done: true, note });
  return next;
}
function initialTimeline(submittedAt, sampleNote) {
  return [
    { stage: "Report submitted", timestamp: submittedAt, done: true, note: "Received via CivicFix" },
    { stage: "Report details reviewed", timestamp: submittedAt, done: true, note: sampleNote }
  ];
}

// src/data/seedReports.ts
var WATER_PHOTO = "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80";
var DUMPING_PHOTO = "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80";
var SIGNAL_PHOTO = "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80";
var DRAIN_PHOTO = "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?auto=format&fit=crop&w=800&q=80";
var LAMP_PHOTO = "https://images.unsplash.com/photo-1508873696983-2df57046475a?auto=format&fit=crop&w=800&q=80";
var MANHOLE_PHOTO = "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80";
var TREE_PHOTO = "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80";
var CROSSING_PHOTO = "https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=800&q=80";
var BIN_PHOTO = "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80";
function makeReport(input) {
  return {
    id: input.id,
    hazardType: input.hazardType,
    subType: input.subType,
    department: input.department,
    departmentUnit: input.departmentUnit,
    location: input.location,
    address: input.address,
    status: input.status,
    date: input.date,
    severity: input.severity,
    description: input.description,
    photoUrl: input.photoUrl,
    contact: "mpho.shiang@example.com",
    assignedTeam: input.assignedTeam,
    detectedAt: input.detectedAt,
    timeline: applyStatusToTimeline(
      initialTimeline(input.detectedAt, input.detectionNote),
      input.status,
      input.detectedAt
    )
  };
}
var EXTRA_REPORTS = [
  makeReport({
    id: "#CF-45824",
    hazardType: "Road Hazard (Pothole)",
    subType: "Pothole",
    department: "Roads & Stormwater",
    departmentUnit: "(Maintenance & Repairs)",
    location: "-33.9275, 18.4186",
    address: "Buitengracht St & Long St, Cape Town",
    status: "Resolved",
    date: "14 Oct 2026",
    detectedAt: "14 Oct 2026, 07:48",
    severity: "High",
    description: "Deep pothole in the eastbound lane where buses brake for the intersection.",
    photoUrl: POTHOLE_IMAGE,
    assignedTeam: "Roads Crew Delta 4",
    detectionNote: "Illustrative seed data; no model analysis was run."
  }),
  makeReport({
    id: "#CF-45823",
    hazardType: "Water Hazard",
    subType: "Broken Water Main",
    department: "Water & Sanitation",
    departmentUnit: "(Emergency Valve Team)",
    location: "-33.9262, 18.4225",
    address: "St Georges Mall, Cape Town CBD",
    status: "Received",
    date: "15 Oct 2026",
    detectedAt: "15 Oct 2026, 06:52",
    severity: "Critical",
    description: "Water surfacing through a pavement joint and running down the pedestrian lane.",
    photoUrl: WATER_PHOTO,
    assignedTeam: "Rapid Water Response 2",
    detectionNote: "Illustrative seed data; no model analysis was run."
  }),
  makeReport({
    id: "#CF-45822",
    hazardType: "Traffic Infrastructure",
    subType: "Traffic Light Fault",
    department: "Traffic & Transport",
    departmentUnit: "(Signal Electronics)",
    location: "-33.923, 18.4195",
    address: "Darling St & Buitengracht St, Cape Town",
    status: "Verified",
    date: "15 Oct 2026",
    detectedAt: "15 Oct 2026, 05:31",
    severity: "High",
    description: "Intersection signal stuck on amber flash, causing uncertain right-of-way.",
    photoUrl: SIGNAL_PHOTO,
    assignedTeam: "Traffic Signals Squad 3",
    detectionNote: "Illustrative seed data; no model analysis was run."
  }),
  makeReport({
    id: "#CF-45825",
    hazardType: "Waste Hazard",
    subType: "Illegal Dumping",
    department: "Waste Management",
    departmentUnit: "(Special Waste Removal)",
    location: "-33.9338, 18.4225",
    address: "Hatton St, Foreshore",
    status: "Assigned",
    date: "14 Oct 2026",
    detectedAt: "14 Oct 2026, 10:26",
    severity: "Medium",
    description: "Construction rubble dumped against the boundary fence overnight.",
    photoUrl: DUMPING_PHOTO,
    assignedTeam: "Civic Clean Sweep 1",
    detectionNote: "Illustrative seed data; no model analysis was run."
  }),
  makeReport({
    id: "#CF-45826",
    hazardType: "Electrical Hazard",
    subType: "Damaged Street Lamp",
    department: "Electricity Services",
    departmentUnit: "(Public Lighting)",
    location: "-33.9205, 18.4155",
    address: "Bloem St, Cape Town",
    status: "In Progress",
    date: "13 Oct 2026",
    detectedAt: "13 Oct 2026, 20:04",
    severity: "Medium",
    description: "Lamp head hanging loose after a delivery vehicle clipped the pole.",
    photoUrl: LAMP_PHOTO,
    assignedTeam: "Lighting Crew 2",
    detectionNote: "Illustrative seed data; no model analysis was run."
  }),
  makeReport({
    id: "#CF-45827",
    hazardType: "Drainage Hazard",
    subType: "Drainage Issue",
    department: "Water & Sanitation",
    departmentUnit: "(Stormwater Catchments)",
    location: "-33.9288, 18.4248",
    address: "Barrack St, Cape Town",
    status: "Received",
    date: "15 Oct 2026",
    detectedAt: "15 Oct 2026, 08:12",
    severity: "Medium",
    description: "Stormwater grate blocked with litter, water pooling across the kerb lane.",
    photoUrl: DRAIN_PHOTO,
    assignedTeam: "Drainage Jet Vac Unit 7",
    detectionNote: "Illustrative seed data; no model analysis was run."
  }),
  makeReport({
    id: "#CF-45828",
    hazardType: "Road Hazard",
    subType: "Missing Manhole Cover",
    department: "Roads & Stormwater",
    departmentUnit: "(Safety Hazards)",
    location: "-33.9365, 18.4212",
    address: "Mill Ln, Gardens",
    status: "Verified",
    date: "14 Oct 2026",
    detectedAt: "14 Oct 2026, 21:37",
    severity: "Critical",
    description: "Open manhole with no cover or cone in a residential street.",
    photoUrl: MANHOLE_PHOTO,
    assignedTeam: "Emergency Road Safety",
    detectionNote: "Illustrative seed data; no model analysis was run."
  }),
  makeReport({
    id: "#CF-45829",
    hazardType: "Waste Hazard",
    subType: "Overflowing Public Bin",
    department: "Waste Management",
    departmentUnit: "(Street Cleansing)",
    location: "-33.9215, 18.4255",
    address: "Church St, Cape Town",
    status: "Resolved",
    date: "11 Oct 2026",
    detectedAt: "11 Oct 2026, 13:02",
    severity: "Low",
    description: "Public bin overflowing after the lunchtime rush onto the paving.",
    photoUrl: BIN_PHOTO,
    assignedTeam: "Area Cleansing Crew 4",
    detectionNote: "Illustrative seed data; no model analysis was run."
  }),
  makeReport({
    id: "#CF-45830",
    hazardType: "Traffic Infrastructure",
    subType: "Faded Pedestrian Crossing",
    department: "Traffic & Transport",
    departmentUnit: "(Road Markings)",
    location: "-33.9165, 18.4148",
    address: "Somerset Rd, Green Point",
    status: "Assigned",
    date: "12 Oct 2026",
    detectedAt: "12 Oct 2026, 17:18",
    severity: "Low",
    description: "Crossing markings faded to nothing outside the primary school gate.",
    photoUrl: CROSSING_PHOTO,
    assignedTeam: "Line Marking Ops",
    detectionNote: "Illustrative seed data; no model analysis was run."
  }),
  makeReport({
    id: "#CF-45831",
    hazardType: "Parks & Recreation",
    subType: "Fallen Tree Branch",
    department: "City Parks",
    departmentUnit: "(Arboriculture)",
    location: "-33.9302, 18.4172",
    address: "Company\u2019s Garden Walkway",
    status: "In Progress",
    date: "12 Oct 2026",
    detectedAt: "12 Oct 2026, 09:44",
    severity: "Medium",
    description: "Storm-snapped branch resting across the pedestrian walkway.",
    photoUrl: TREE_PHOTO,
    assignedTeam: "Tree Care Specialists",
    detectionNote: "Illustrative seed data; no model analysis was run."
  })
];
var SEED_REPORTS = [...EXTRA_REPORTS, ...INITIAL_REPORTS];
var SEED_ENGAGEMENTS = [
  { id: "#CF-45821", affected: 126, confirmations: ["Thandi M.", "Sipho D.", "Ayesha K."] },
  { id: "#CF-45824", affected: 27, confirmations: ["Naledi P."] },
  { id: "#CF-45820", affected: 47, confirmations: ["Riaan V.", "Fatima S."] },
  { id: "#CF-45819", affected: 18, confirmations: ["Jabu N."] },
  { id: "#CF-45815", affected: 31, confirmations: ["Peter L.", "Zanele K."] },
  { id: "#CF-45823", affected: 12, confirmations: [] }
];
var SEED_THREADS = [
  {
    id: "#CF-45820",
    messages: [
      {
        id: "M-1",
        from: "resident",
        author: "Mpho S.",
        text: "The leak is getting worse \u2014 it now reaches the pedestrian crossing.",
        at: "14 Oct 2026, 13:58"
      },
      {
        id: "M-2",
        from: "municipality",
        author: "Water & Sanitation",
        text: "Thank you. We have escalated this to the emergency response team.",
        at: "14 Oct 2026, 14:14"
      },
      {
        id: "M-3",
        from: "municipality",
        author: "Water & Sanitation",
        text: "Team dispatched at 14:32. Rapid Water Response 2 is on site to isolate the valve.",
        at: "14 Oct 2026, 14:33"
      },
      {
        id: "M-4",
        from: "resident",
        author: "Mpho S.",
        text: "Thank you \u2014 traffic cones are up now, that already helps.",
        at: "14 Oct 2026, 14:51"
      }
    ]
  },
  {
    id: "#CF-45821",
    messages: [
      {
        id: "M-1",
        from: "resident",
        author: "Mpho S.",
        text: "Is the resurfacing still planned for today? Two more cars hit this hole this morning.",
        at: "14 Oct 2026, 10:05"
      },
      {
        id: "M-2",
        from: "municipality",
        author: "Roads & Stormwater",
        text: "The asphalt patching vehicle is en route. We expect the patch to be in place before the afternoon peak.",
        at: "14 Oct 2026, 11:24"
      }
    ]
  }
];
var SEED_RESOLUTIONS = [
  {
    id: "#CF-45824",
    before: POTHOLE_IMAGE,
    after: REPAIRED_ROAD_IMAGE,
    note: "Asphalt patch compacted, lane reopened and road markings restored.",
    at: "14 Oct 2026, 15:20",
    residentConfirmed: null
  }
];
var SEED_RATINGS = [
  {
    id: "#CF-45818",
    stars: 5,
    comment: "Signal fixed the same morning \u2014 the intersection flows properly again.",
    at: "11 Oct 2026, 12:40"
  },
  {
    id: "#CF-45817",
    stars: 4,
    comment: "Drain cleared quickly. A lid would stop leaves falling straight back in.",
    at: "11 Oct 2026, 09:12"
  }
];

// src/utils/dates.ts
var MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11
};
function parseLooseDate(value) {
  if (!value) return null;
  const structured = value.match(
    /(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})(?:\s*[,–-]?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i
  );
  if (structured) {
    const month = MONTHS[structured[2].slice(0, 3).toLowerCase()];
    if (month !== void 0) {
      let hour = structured[4] === void 0 ? 0 : Number(structured[4]);
      const meridiem = structured[6]?.toUpperCase();
      if (meridiem === "PM" && hour < 12) hour += 12;
      if (meridiem === "AM" && hour === 12) hour = 0;
      const minute = structured[5] === void 0 ? 0 : Number(structured[5]);
      const parsed = new Date(
        Number(structured[3]),
        month,
        Number(structured[1]),
        hour,
        minute
      ).getTime();
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  const fallback = Date.parse(value);
  return Number.isNaN(fallback) ? null : fallback;
}
function daysBetween(fromMs, toMs) {
  return Math.round((toMs - fromMs) / 864e5);
}
function daysAgo(value, nowMs = Date.now()) {
  const parsed = parseLooseDate(value);
  if (parsed === null) return null;
  return daysBetween(parsed, nowMs);
}
function formatTimestamp(date = /* @__PURE__ */ new Date()) {
  return date.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// src/data/teams.ts
var FIELD_TEAMS = [
  {
    id: "T-ROAD-04",
    name: "Roads Crew Delta 4",
    departments: ["Roads & Stormwater"],
    lat: -33.9249,
    lon: 18.4241,
    active: true,
    members: 6,
    zone: "City Bowl"
  },
  {
    id: "T-ROAD-02",
    name: "Roads Crew Beta",
    departments: ["Roads & Stormwater"],
    lat: -33.921,
    lon: 18.423,
    active: true,
    members: 4,
    zone: "District Six"
  },
  {
    id: "T-ROAD-09",
    name: "Emergency Road Safety",
    departments: ["Roads & Stormwater"],
    lat: -33.935,
    lon: 18.418,
    active: true,
    members: 3,
    zone: "Gardens"
  },
  {
    id: "T-WAT-02",
    name: "Rapid Water Response 2",
    departments: ["Water & Sanitation"],
    lat: -33.9152,
    lon: 18.4087,
    active: true,
    members: 5,
    zone: "Green Point"
  },
  {
    id: "T-WAT-07",
    name: "Drainage Jet Vac Unit 7",
    departments: ["Water & Sanitation"],
    lat: -33.9221,
    lon: 18.4172,
    active: true,
    members: 4,
    zone: "CBD"
  },
  {
    id: "T-WST-01",
    name: "Civic Clean Sweep 1",
    departments: ["Waste Management"],
    lat: -33.9314,
    lon: 18.426,
    active: true,
    members: 5,
    zone: "East City"
  },
  {
    id: "T-WST-04",
    name: "Area Cleansing Crew 4",
    departments: ["Waste Management"],
    lat: -33.9234,
    lon: 18.4211,
    active: true,
    members: 4,
    zone: "CBD"
  },
  {
    id: "T-TRF-03",
    name: "Traffic Signals Squad 3",
    departments: ["Traffic & Transport"],
    lat: -33.9176,
    lon: 18.4198,
    active: true,
    members: 4,
    zone: "Foreshore"
  },
  {
    id: "T-TRF-06",
    name: "Line Marking Ops",
    departments: ["Traffic & Transport"],
    lat: -33.9189,
    lon: 18.413,
    active: true,
    members: 3,
    zone: "De Waterkant"
  },
  {
    id: "T-ELC-02",
    name: "Lighting Crew 2",
    departments: ["Electricity Services"],
    lat: -33.9288,
    lon: 18.4115,
    active: true,
    members: 4,
    zone: "Oranjezicht"
  },
  {
    id: "T-PRK-01",
    name: "Tree Care Specialists",
    departments: ["City Parks"],
    lat: -33.9295,
    lon: 18.4162,
    active: false,
    members: 3,
    zone: "Company Garden"
  },
  {
    id: "T-BLD-05",
    name: "Municipal Inspectorate",
    departments: ["Building Compliance"],
    lat: -33.9312,
    lon: 18.4145,
    active: true,
    members: 2,
    zone: "Gardens"
  }
];

// src/utils/proximity.ts
function parseCoordinates(value) {
  if (!value) return null;
  const match = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}
function distanceMeters(a, b) {
  const toRad = (degrees) => degrees * Math.PI / 180;
  const earthRadius = 6371e3;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const haversine = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(haversine))));
}

// src/utils/dispatch.ts
function servesDepartment(team, department) {
  const wanted = department.trim().toLocaleLowerCase();
  if (wanted.length === 0) return false;
  return team.departments.some((entry) => {
    const known = entry.toLocaleLowerCase();
    return known === wanted || wanted.includes(known) || known.includes(wanted);
  });
}
function dispatchTeam(department, location, teams = FIELD_TEAMS) {
  const origin = parseCoordinates(location);
  const candidates = teams.filter((team) => team.active && servesDepartment(team, department));
  if (candidates.length === 0) {
    return {
      team: null,
      distanceMetres: null,
      reason: `No active field team is registered for ${department || "this department"}.`
    };
  }
  if (!origin) {
    return {
      team: null,
      distanceMetres: null,
      reason: "Report location is not usable for distance-based dispatch."
    };
  }
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const team of candidates) {
    const distance = distanceMeters(origin, { lat: team.lat, lon: team.lon });
    if (distance < bestDistance) {
      best = team;
      bestDistance = distance;
    }
  }
  if (!best) {
    return { team: null, distanceMetres: null, reason: "No dispatchable crew found." };
  }
  return {
    team: best,
    distanceMetres: bestDistance,
    reason: `Nearest active ${best.departments[0]} crew (${bestDistance} m away).`
  };
}

// src/utils/duplicate.ts
var DUPLICATE_RADIUS_METRES = 250;
var DUPLICATE_WINDOW_DAYS = 14;
function sameHazard(candidate, report) {
  const a = candidate.subType.trim().toLocaleLowerCase();
  const b = report.subType.trim().toLocaleLowerCase();
  if (a.length > 0 && a === b) return true;
  if (candidate.hazardType) {
    const category = candidate.hazardType.split("(")[0].trim().toLocaleLowerCase();
    const other = report.hazardType.split("(")[0].trim().toLocaleLowerCase();
    if (category.length > 0 && category === other) return true;
  }
  return false;
}
function findDuplicateReports(candidate, reports2, options = {}) {
  const radius = options.radiusMetres ?? DUPLICATE_RADIUS_METRES;
  const window = options.windowDays ?? DUPLICATE_WINDOW_DAYS;
  const nowMs = options.nowMs ?? Date.now();
  const origin = parseCoordinates(candidate.location);
  if (!origin) return [];
  const matches = [];
  for (const report of reports2) {
    if (candidate.id && report.id === candidate.id) continue;
    if (report.status === "Rejected") continue;
    if (!sameHazard(candidate, report)) continue;
    const target = parseCoordinates(report.location);
    if (!target) continue;
    const distance = distanceMeters(origin, target);
    if (distance > radius) continue;
    const age = daysAgo(report.date, nowMs);
    if (age !== null && age > window) continue;
    matches.push({
      id: report.id,
      distanceMeters: distance,
      daysAgo: age ?? 0,
      subType: report.subType,
      address: report.address,
      status: report.status,
      affected: 0,
      sortKey: report.status === "Resolved" ? 1 : 0
    });
  }
  return matches.sort((left, right) => left.sortKey - right.sortKey || left.distanceMeters - right.distanceMeters).map(({ sortKey: _sortKey, ...match }) => match);
}

// server/collections.ts
import path2 from "node:path";
import { Router } from "express";

// server/store.ts
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
var JsonStore = class {
  constructor(options) {
    this.options = options;
    this.queue = Promise.resolve();
  }
  get file() {
    return this.options.file;
  }
  async list() {
    if (this.options.documentStore) {
      return (await this.readRemoteItems()).items;
    }
    if (this.cache) return this.cache;
    try {
      const contents = await readFile(this.options.file, "utf8");
      const parsed = JSON.parse(contents);
      if (!Array.isArray(parsed) || !parsed.every(this.options.validate)) {
        throw new Error(`Data at ${this.options.file} has an invalid format.`);
      }
      this.cache = parsed;
    } catch (error) {
      if (isEnoent(error)) {
        this.cache = this.options.seed ? this.options.seed() : [];
        return this.cache;
      }
      throw error;
    }
    return this.cache;
  }
  async get(id) {
    return (await this.list()).find((item) => item.id === id);
  }
  async create(body, makeId) {
    return this.mutate((items) => {
      const created = { ...body, id: makeId(items) };
      if (!this.options.validate(created)) {
        throw new StoreValidationError("The submitted record is not valid.");
      }
      return { items: [created, ...items], result: created, changed: true };
    });
  }
  async upsert(id, body) {
    return this.mutate((items) => {
      const candidate = { ...body, id };
      if (!this.options.validate(candidate)) {
        throw new StoreValidationError("The submitted record is not valid.");
      }
      const index = items.findIndex((item) => item.id === id);
      const next = [...items];
      if (index === -1) next.unshift(candidate);
      else next[index] = candidate;
      return { items: next, result: candidate, changed: true };
    });
  }
  async update(id, update) {
    return this.mutate((items) => {
      const index = items.findIndex((item) => item.id === id);
      const current = index === -1 ? void 0 : items[index];
      const candidate = update(current);
      if (!candidate || candidate === current) {
        return { items, result: candidate, changed: false };
      }
      if (candidate.id !== id || !this.options.validate(candidate)) {
        throw new StoreValidationError("The updated record is not valid.");
      }
      const next = [...items];
      if (index === -1) next.unshift(candidate);
      else next[index] = candidate;
      return { items: next, result: candidate, changed: true };
    });
  }
  async patch(id, changes) {
    return this.mutate((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return { items, result: void 0, changed: false };
      const candidate = { ...items[index], ...changes };
      if (!this.options.validate(candidate)) {
        throw new StoreValidationError("The updated record is not valid.");
      }
      const next = [...items];
      next[index] = candidate;
      return { items: next, result: candidate, changed: true };
    });
  }
  async remove(id) {
    return this.mutate((items) => {
      const next = items.filter((item) => item.id !== id);
      const changed = next.length !== items.length;
      return { items: changed ? next : items, result: changed, changed };
    });
  }
  async mutate(operation) {
    const documentStore2 = this.options.documentStore;
    if (documentStore2) {
      const key = this.documentKey();
      for (let attempt = 0; attempt < 32; attempt += 1) {
        const document = await this.readRemoteItems();
        const mutation = operation(document.items);
        if (!mutation.changed) return mutation.result;
        if (await documentStore2.compareAndSet(
          key,
          document.revision,
          mutation.items
        )) {
          return mutation.result;
        }
      }
      throw new Error(`Concurrent updates prevented saving document "${key}".`);
    }
    return this.enqueue(async () => {
      const mutation = operation(await this.list());
      if (mutation.changed) await this.persist(mutation.items);
      return mutation.result;
    });
  }
  async readRemoteItems() {
    const store = this.options.documentStore;
    if (!store) throw new Error("Remote document storage is not configured.");
    const key = this.documentKey();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const document = await store.read(key);
      if (document) {
        if (!Array.isArray(document.value) || !document.value.every(this.options.validate)) {
          throw new Error(`Data for document "${key}" has an invalid format.`);
        }
        return { items: document.value, revision: document.revision };
      }
      const seed = this.options.seed?.() ?? [];
      if (seed.length === 0) return { items: seed, revision: null };
      if (await store.compareAndSet(key, null, seed)) {
        return { items: seed, revision: 1 };
      }
    }
    throw new Error(`Could not initialize document "${key}" after concurrent writes.`);
  }
  documentKey() {
    const key = this.options.documentKey;
    if (!key) throw new Error("Remote document storage requires a document key.");
    return key;
  }
  enqueue(operation) {
    const result = this.queue.then(operation);
    this.queue = result.then(
      () => void 0,
      () => void 0
    );
    return result;
  }
  async persist(next) {
    await mkdir(path.dirname(this.options.file), { recursive: true });
    const temporary = `${this.options.file}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(next, null, 2)}
`, {
        encoding: "utf8",
        flag: "wx"
      });
      await rename(temporary, this.options.file);
    } catch (error) {
      try {
        await unlink(temporary);
      } catch (cleanupError) {
        console.error("Could not remove temporary file:", cleanupError);
      }
      throw error;
    }
    this.cache = next;
  }
};
var StoreValidationError = class extends Error {
};
function isEnoent(error) {
  return typeof error === "object" && error !== null && error.code === "ENOENT";
}
function nextCollectionId(prefix, items) {
  const used = new Set(items.map((item) => item.id));
  let counter = 100 + items.length;
  let id = `${prefix}-${counter}`;
  while (used.has(id)) {
    counter += 1;
    id = `${prefix}-${counter}`;
  }
  return id;
}

// src/types.ts
var REPORT_STATUSES = [
  "Received",
  "Verified",
  "Assigned",
  "In Progress",
  "Resolved",
  "Rejected"
];
var HAZARD_SEVERITIES = ["Low", "Medium", "High", "Critical"];
var ALERT_CATEGORIES = [
  "Infrastructure",
  "Water",
  "Roads",
  "Electricity",
  "Waste",
  "Traffic",
  "Emergencies",
  "Community events"
];
var COMMUNITY_CATEGORIES = [
  "Roads",
  "Water",
  "Waste",
  "Traffic",
  "Electricity",
  "Development",
  "Parks",
  "Community",
  "Safety"
];

// server/validation.ts
var severities = HAZARD_SEVERITIES;
var statuses = REPORT_STATUSES;
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isBoundedString(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}
function hasOptionalString(record, key, maxLength) {
  const value = record[key];
  return value === void 0 || typeof value === "string" && value.length <= maxLength;
}
function isPhotoReference(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 145e5) {
    return false;
  }
  const dataImage = value.match(
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/
  );
  if (dataImage) {
    const bytes = Buffer.from(dataImage[2], "base64");
    switch (dataImage[1]) {
      case "jpeg":
        return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      case "png":
        return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      case "webp":
        return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    }
  }
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
function isTimeline(value) {
  return value === void 0 || Array.isArray(value) && value.every(
    (entry) => isRecord(entry) && isBoundedString(entry.stage, 120) && isBoundedString(entry.timestamp, 80) && typeof entry.done === "boolean" && hasOptionalString(entry, "note", 1e3)
  );
}
function isAiAssessment(value) {
  if (value === void 0) return true;
  if (!isRecord(value)) return false;
  return isBoundedString(value.model, 120) && isBoundedString(value.label, 160) && typeof value.score === "number" && Number.isFinite(value.score) && value.score >= 0 && value.score <= 1 && typeof value.inferenceMs === "number" && Number.isFinite(value.inferenceMs) && value.inferenceMs >= 0 && value.inferenceMs <= 6e5 && ["accepted", "edited", "unclassified"].includes(String(value.outcome));
}
function isHazardReport(value) {
  if (!isRecord(value)) return false;
  return isBoundedString(value.id, 40) && isBoundedString(value.hazardType, 120) && isBoundedString(value.subType, 120) && isBoundedString(value.department, 120) && isBoundedString(value.location, 200) && isBoundedString(value.status, 30) && statuses.includes(value.status) && isBoundedString(value.date, 50) && isBoundedString(value.severity, 20) && severities.includes(value.severity) && isBoundedString(value.description, 5e3) && isPhotoReference(value.photoUrl) && hasOptionalString(value, "departmentUnit", 120) && hasOptionalString(value, "address", 300) && hasOptionalString(value, "contact", 254) && hasOptionalString(value, "assignedTeam", 120) && hasOptionalString(value, "notes", 5e3) && hasOptionalString(value, "detectedAt", 80) && isAiAssessment(value.aiAssessment) && isTimeline(value.timeline);
}
function checkField(value, spec) {
  if (value === void 0 || value === null) return spec.optional === true;
  switch (spec.kind) {
    case "string":
      return typeof value === "string" && value.length <= spec.max && (spec.optional === true || value.trim().length > 0);
    case "enum":
      return typeof value === "string" && spec.values.includes(value);
    case "boolean":
      return typeof value === "boolean";
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return false;
      if (spec.integer === true && !Number.isInteger(value)) return false;
      if (spec.min !== void 0 && value < spec.min) return false;
      if (spec.max !== void 0 && value > spec.max) return false;
      return true;
    case "photo":
      return isPhotoReference(value);
    case "array":
      return Array.isArray(value) && (spec.maxItems === void 0 || value.length <= spec.maxItems) && value.every((item) => checkField(item, spec.of));
    case "object":
      return isRecord(value) && validateShape(value, spec.fields);
  }
}
function validateShape(value, shape) {
  if (!isRecord(value)) return false;
  return Object.entries(shape).every(([key, spec]) => checkField(value[key], spec));
}

// src/data/seed.ts
var SEED_ALERTS = [
  {
    id: "AL-101",
    level: "emergency",
    title: "Water main burst \u2014 Adderley Street",
    body: "A major water main has burst near Adderley Street. Residents are advised to avoid the area while crews isolate the valve.",
    category: "Water",
    area: "Cape Town CBD",
    createdAt: "15 Oct 2026, 06:40",
    active: true
  },
  {
    id: "AL-102",
    level: "important",
    title: "Road closure \u2014 Long Street",
    body: "Temporary closure expected tomorrow between Buitengracht and Strand Street for resurfacing. Heavy maintenance underway.",
    category: "Roads",
    area: "Long Street",
    createdAt: "14 Oct 2026, 16:05",
    active: true
  },
  {
    id: "AL-103",
    level: "important",
    title: "Power interruption \u2014 Gardens",
    body: "Planned interruption affecting Streets 12\u201318 while a substation fuse is replaced. Expected restoration: 16:00.",
    category: "Electricity",
    area: "Gardens",
    createdAt: "14 Oct 2026, 08:15",
    active: true
  },
  {
    id: "AL-104",
    level: "info",
    title: "Community clean-up",
    body: "Saturday, 09:00 at the District Six open space. Bags and gloves supplied by the ward office.",
    category: "Community events",
    area: "District Six",
    createdAt: "13 Oct 2026, 11:00",
    active: true
  },
  {
    id: "AL-105",
    level: "info",
    title: "Refuse collection shifted a day",
    body: "Collection moves to Wednesday this week because of the public holiday. Wheels-out by 07:00.",
    category: "Waste",
    area: "Foreshore",
    createdAt: "12 Oct 2026, 09:30",
    active: false
  }
];
var SEED_ANNOUNCEMENTS = [
  {
    id: "AN-101",
    municipality: "City of Cape Town",
    title: "Planned water maintenance in Cape Town CBD",
    body: "Planned water maintenance in the Cape Town CBD on 17 October, 08:00\u201316:00. Affected streets include Buitengracht, Loop and Long Street. Water may be interrupted during this window; store enough for the day.",
    date: "17 Oct 2026",
    category: "Water",
    verified: true
  },
  {
    id: "AN-102",
    municipality: "City of Cape Town \u2014 Roads & Stormwater",
    title: "Long Street resurfacing programme",
    body: "Resurfacing continues between Buitengracht and Strand Street from 16\u201331 October. Expect lane shifts and reduced parking during working hours (07:00\u201317:00).",
    date: "16 Oct 2026",
    category: "Roads",
    verified: true
  },
  {
    id: "AN-103",
    municipality: "City of Cape Town \u2014 Electricity Services",
    title: "Planned outage: City Bowl substation",
    body: "A planned outage will affect Gardens and Oranjezicht on 18 October, 08:00\u201314:00, while a transformer is replaced. Load reduction notices will be sent to registered accounts.",
    date: "15 Oct 2026",
    category: "Electricity",
    verified: true
  },
  {
    id: "AN-104",
    municipality: "City of Cape Town \u2014 City Parks",
    title: "New trees for the Company\u2019s Garden",
    body: "Sixty indigenous trees will be planted along the eastern walkway this month. Temporary fencing will protect the planting sites for six weeks.",
    date: "14 Oct 2026",
    category: "Parks",
    verified: true
  }
];
var at = (day) => day;
var SEED_DISCUSSIONS = [
  {
    id: "DS-101",
    title: "Has anyone else noticed the water leak near Buitengracht?",
    body: "The puddle has been growing since the weekend and the pavement is getting slippery. I have already logged a ticket but nothing has moved yet.",
    category: "Water",
    author: "Mpho S.",
    area: "Cape Town CBD",
    createdAt: at("13 Oct 2026"),
    photos: [],
    votes: 34,
    comments: [
      {
        id: "C-1",
        author: "Thandi M.",
        text: "Yes \u2014 it is worse in the mornings. I nearly slipped near the taxi rank.",
        at: "13 Oct 2026, 18:22"
      },
      {
        id: "C-2",
        author: "Sipho D.",
        text: "Confirmed on my side too. Adding my name to the ticket.",
        at: "14 Oct 2026, 07:05"
      },
      {
        id: "C-3",
        author: "City of Cape Town",
        text: "Logged for the emergency valve team. Reference CF-45820.",
        at: "14 Oct 2026, 09:41"
      },
      {
        id: "C-4",
        author: "Ayesha K.",
        text: "Thanks \u2014 is there an ETA on the repair?",
        at: "14 Oct 2026, 12:15"
      }
    ]
  },
  {
    id: "DS-102",
    title: "Pothole outside the taxi rank is getting worse",
    body: "Three cars have hit it this week and one burst a tyre. It sits right where passengers cross.",
    category: "Roads",
    author: "Sipho D.",
    area: "District Six",
    createdAt: at("12 Oct 2026"),
    photos: [],
    votes: 61,
    comments: [
      {
        id: "C-1",
        author: "Naledi P.",
        text: "The taxis swerve around it into the pedestrian lane, which is just as dangerous.",
        at: "12 Oct 2026, 20:10"
      },
      {
        id: "C-2",
        author: "Mpho S.",
        text: "I photographed it this morning \u2014 uploading as evidence to my report.",
        at: "13 Oct 2026, 07:55"
      }
    ]
  },
  {
    id: "DS-103",
    title: "Illegal dumping behind the fresh market",
    body: "Rubble and bags have piled up again behind the market. It blocks the stormwater drain when it rains.",
    category: "Waste",
    author: "Naledi P.",
    area: "East City",
    createdAt: at("11 Oct 2026"),
    photos: [],
    votes: 27,
    comments: [
      {
        id: "C-1",
        author: "Ward 115 Office",
        text: "Special waste removal has been requested. Please do not add to the pile.",
        at: "11 Oct 2026, 15:30"
      }
    ]
  },
  {
    id: "DS-104",
    title: "Street lights out on Upper Orange Street",
    body: "Four lamps in a row have been dark for over a week. Walking home after 19:00 is uncomfortable.",
    category: "Electricity",
    author: "Ayesha K.",
    area: "Oranjezicht",
    createdAt: at("10 Oct 2026"),
    photos: [],
    votes: 19,
    comments: []
  },
  {
    id: "DS-105",
    title: "Ward meeting: what should we prioritise first?",
    body: "The ward office is collecting inputs before the November meeting. Roads, water and safety keep coming up \u2014 add your vote in the polls section.",
    category: "Community",
    author: "Ward 115 Office",
    area: "Cape Town Central",
    createdAt: at("09 Oct 2026"),
    photos: [],
    votes: 88,
    comments: [
      {
        id: "C-1",
        author: "Thandi M.",
        text: "Street lighting first \u2014 it affects everyone walking at night.",
        at: "09 Oct 2026, 19:44"
      }
    ]
  }
];
var SEED_POLLS = [
  {
    id: "PL-101",
    question: "What should we improve in your neighbourhood?",
    options: [
      { id: "O-1", label: "Parks", votes: 122 },
      { id: "O-2", label: "Roads", votes: 148 },
      { id: "O-3", label: "Public transport", votes: 54 },
      { id: "O-4", label: "Waste management", votes: 36 }
    ],
    createdAt: "10 Oct 2026",
    active: true
  },
  {
    id: "PL-102",
    question: "Should this park receive new lighting?",
    options: [
      { id: "O-1", label: "Yes", votes: 161 },
      { id: "O-2", label: "No", votes: 60 }
    ],
    createdAt: "08 Oct 2026",
    active: true
  }
];
var SEED_EVENTS = [
  {
    id: "EV-101",
    title: "Community cleanup \u2014 District Six open space",
    kind: "Community cleanup",
    date: "18 Oct 2026",
    time: "09:00\u201312:00",
    location: "District Six open space, Minto Road",
    description: "Bags and gloves supplied. Meet at the corner of Minto and Hanover Street."
  },
  {
    id: "EV-102",
    title: "Public meeting: Long Street resurfacing",
    kind: "Public meeting",
    date: "21 Oct 2026",
    time: "18:00\u201319:30",
    location: "Ward 115 offices, 121 Harrington Street",
    description: "Roads & Stormwater will present the remaining programme and answer parking questions."
  },
  {
    id: "EV-103",
    title: "Ward consultation \u2014 safety priorities",
    kind: "Ward meeting",
    date: "25 Oct 2026",
    time: "17:30\u201319:00",
    location: "Tafelberg Community Hall",
    description: "Residents vote on the top three safety projects for the next quarter."
  },
  {
    id: "EV-104",
    title: "Recycling drop-off day",
    kind: "Recycling event",
    date: "01 Nov 2026",
    time: "08:00\u201315:00",
    location: "Green Point recycling depot",
    description: "Glass, plastics, e-waste and garden refuse accepted free of charge."
  }
];
var SEED_DOCUMENTS = [
  {
    id: "DC-101",
    title: "Cape Town CBD road development notice",
    category: "Municipal notices",
    description: "Public notice covering the CBD road development programme, affected streets and the comment period.",
    publishedAt: "12 Oct 2026",
    municipality: "City of Cape Town",
    pages: 8
  },
  {
    id: "DC-102",
    title: "Long Street resurfacing \u2014 project plan",
    category: "Project plans",
    description: "Method statement, phasing diagram and traffic management plan for the resurfacing works.",
    publishedAt: "10 Oct 2026",
    municipality: "City of Cape Town \u2014 Roads & Stormwater",
    pages: 24
  },
  {
    id: "DC-103",
    title: "Ward 115 integrated development plan extract",
    category: "Ward plans",
    description: "Service delivery priorities, budgets and reporting lines for the ward over the coming financial year.",
    publishedAt: "04 Oct 2026",
    municipality: "Ward 115",
    pages: 46
  },
  {
    id: "DC-104",
    title: "Draft budget \u2014 public participation document",
    category: "Public participation documents",
    description: "Draft revenue and capital budgets with the schedule for written public comment.",
    publishedAt: "28 Sep 2026",
    municipality: "City of Cape Town",
    pages: 112
  },
  {
    id: "DC-105",
    title: "Minutes: ward committee meeting, September",
    category: "Meeting minutes",
    description: "Attendance, matters arising and resolutions from the September ward committee meeting.",
    publishedAt: "22 Sep 2026",
    municipality: "Ward 115",
    pages: 6
  }
];
var SEED_PROJECTS = [
  {
    id: "PJ-101",
    name: "Long Street Road Rehabilitation",
    category: "Roads",
    percent: 63,
    budget: "R4.8M",
    start: "02 Sept 2026",
    expectedEnd: "30 Nov 2026",
    location: "Long Street, Cape Town CBD",
    updates: [
      { date: "14 Oct", text: "Drainage installation completed." },
      { date: "10 Oct", text: "Road excavation completed." }
    ]
  },
  {
    id: "PJ-102",
    name: "Adderley Street Stormwater Upgrade",
    category: "Stormwater",
    percent: 41,
    budget: "R12.2M",
    start: "15 Aug 2026",
    expectedEnd: "28 Feb 2027",
    location: "Adderley Street, Cape Town CBD",
    updates: [
      { date: "13 Oct", text: "Pipe jacking between Bree and Darling completed." },
      { date: "02 Oct", text: "Site compound established; traffic plan in effect." }
    ]
  },
  {
    id: "PJ-103",
    name: "CBD Solar Street Lighting Rollout",
    category: "Electricity",
    percent: 78,
    budget: "R6.4M",
    start: "10 Jun 2026",
    expectedEnd: "20 Dec 2026",
    location: "City Bowl and Foreshore",
    updates: [
      { date: "12 Oct", text: "312 of 400 units installed and commissioned." },
      { date: "28 Sep", text: "Grid-tie inspections passed for block 4." }
    ]
  }
];

// server/collections.ts
var COMMENT_SHAPE = {
  id: { kind: "string", max: 40 },
  author: { kind: "string", max: 80 },
  text: { kind: "string", max: 2e3 },
  at: { kind: "string", max: 80 }
};
var MESSAGE_SHAPE = {
  id: { kind: "string", max: 40 },
  from: { kind: "enum", values: ["resident", "municipality"] },
  author: { kind: "string", max: 80 },
  text: { kind: "string", max: 2e3 },
  at: { kind: "string", max: 80 }
};
var TICKET_KEYED = true;
var COLLECTION_CONFIGS = {
  alerts: {
    prefix: "AL",
    shape: {
      level: { kind: "enum", values: ["emergency", "important", "info"] },
      title: { kind: "string", max: 160 },
      body: { kind: "string", max: 2e3 },
      category: { kind: "enum", values: ALERT_CATEGORIES },
      area: { kind: "string", max: 120 },
      createdAt: { kind: "string", max: 80 },
      active: { kind: "boolean" }
    },
    seed: () => SEED_ALERTS
  },
  announcements: {
    prefix: "AN",
    shape: {
      municipality: { kind: "string", max: 120 },
      title: { kind: "string", max: 200 },
      body: { kind: "string", max: 4e3 },
      date: { kind: "string", max: 60 },
      category: { kind: "enum", values: COMMUNITY_CATEGORIES },
      verified: { kind: "boolean" }
    },
    seed: () => SEED_ANNOUNCEMENTS
  },
  discussions: {
    prefix: "DS",
    shape: {
      title: { kind: "string", max: 200 },
      body: { kind: "string", max: 5e3 },
      category: { kind: "enum", values: COMMUNITY_CATEGORIES },
      author: { kind: "string", max: 80 },
      area: { kind: "string", max: 120 },
      createdAt: { kind: "string", max: 60 },
      photos: { kind: "array", of: { kind: "photo" }, maxItems: 6, optional: true },
      votes: { kind: "number", min: 0, max: 1e6, integer: true },
      comments: { kind: "array", of: { kind: "object", fields: COMMENT_SHAPE }, maxItems: 300 }
    },
    seed: () => SEED_DISCUSSIONS
  },
  polls: {
    prefix: "PL",
    shape: {
      question: { kind: "string", max: 300 },
      options: {
        kind: "array",
        of: {
          kind: "object",
          fields: {
            id: { kind: "string", max: 40 },
            label: { kind: "string", max: 160 },
            votes: { kind: "number", min: 0, integer: true }
          }
        },
        maxItems: 8
      },
      createdAt: { kind: "string", max: 60 },
      active: { kind: "boolean" }
    },
    seed: () => SEED_POLLS
  },
  events: {
    prefix: "EV",
    shape: {
      title: { kind: "string", max: 200 },
      kind: { kind: "string", max: 80 },
      date: { kind: "string", max: 60 },
      time: { kind: "string", max: 60 },
      location: { kind: "string", max: 200 },
      description: { kind: "string", max: 2e3 }
    },
    seed: () => SEED_EVENTS
  },
  documents: {
    prefix: "DC",
    shape: {
      title: { kind: "string", max: 200 },
      category: { kind: "string", max: 80 },
      description: { kind: "string", max: 3e3 },
      publishedAt: { kind: "string", max: 60 },
      municipality: { kind: "string", max: 120 },
      pages: { kind: "number", min: 0, integer: true }
    },
    seed: () => SEED_DOCUMENTS
  },
  projects: {
    prefix: "PJ",
    shape: {
      name: { kind: "string", max: 200 },
      category: { kind: "string", max: 80 },
      percent: { kind: "number", min: 0, max: 100 },
      budget: { kind: "string", max: 60 },
      start: { kind: "string", max: 60 },
      expectedEnd: { kind: "string", max: 60 },
      location: { kind: "string", max: 200 },
      updates: {
        kind: "array",
        of: {
          kind: "object",
          fields: {
            date: { kind: "string", max: 60 },
            text: { kind: "string", max: 600 }
          }
        },
        maxItems: 50
      }
    },
    seed: () => SEED_PROJECTS
  },
  threads: {
    prefix: "TH",
    allowCustomId: TICKET_KEYED,
    shape: {
      messages: { kind: "array", of: { kind: "object", fields: MESSAGE_SHAPE }, maxItems: 300 }
    },
    seed: () => SEED_THREADS
  },
  engagements: {
    prefix: "EN",
    allowCustomId: TICKET_KEYED,
    shape: {
      affected: { kind: "number", min: 0, max: 1e6, integer: true },
      confirmations: { kind: "array", of: { kind: "string", max: 80 }, maxItems: 5e4 }
    },
    seed: () => SEED_ENGAGEMENTS
  },
  resolutions: {
    prefix: "RS",
    allowCustomId: TICKET_KEYED,
    shape: {
      before: { kind: "photo" },
      after: { kind: "photo" },
      note: { kind: "string", max: 1e3, optional: true },
      at: { kind: "string", max: 80 },
      residentConfirmed: { kind: "boolean", optional: true }
    },
    seed: () => SEED_RESOLUTIONS
  },
  ratings: {
    prefix: "RT",
    allowCustomId: TICKET_KEYED,
    shape: {
      stars: { kind: "number", min: 1, max: 5, integer: true },
      comment: { kind: "string", max: 1e3, optional: true },
      at: { kind: "string", max: 80 }
    },
    seed: () => SEED_RATINGS
  }
};
function requireStore(stores2, name) {
  const store = stores2.get(name);
  if (!store) {
    throw new Error(`Collection "${name}" is not registered.`);
  }
  return store;
}
function hasUsableId(value) {
  return isRecord(value) && typeof value.id === "string" && value.id.trim().length > 0 && value.id.length <= 40;
}
function createStores(dataDirectory2, seedEnabled2, documentStore2) {
  const stores2 = /* @__PURE__ */ new Map();
  for (const [name, config] of Object.entries(COLLECTION_CONFIGS)) {
    stores2.set(
      name,
      new JsonStore({
        file: path2.join(dataDirectory2, "collections", `${name}.json`),
        validate: (value) => hasUsableId(value) && validateShape(value, config.shape),
        seed: seedEnabled2 && config.seed ? config.seed : void 0,
        documentStore: documentStore2,
        documentKey: `collection:${name}`
      })
    );
  }
  return stores2;
}
function configFor(name) {
  return COLLECTION_CONFIGS[name];
}
function createCollectionsRouter(stores2) {
  const router = Router();
  router.get("/:name", async (request, response, next) => {
    try {
      const store = stores2.get(request.params.name);
      if (!store) {
        response.status(404).json({ error: "Unknown collection." });
        return;
      }
      response.json(await store.list());
    } catch (error) {
      next(error);
    }
  });
  router.post("/:name", async (request, response, next) => {
    try {
      const name = request.params.name;
      const config = configFor(name);
      const store = stores2.get(name);
      if (!config || !store) {
        response.status(404).json({ error: "Unknown collection." });
        return;
      }
      if (!isRecord(request.body)) {
        response.status(400).json({ error: "Request body must contain a JSON object." });
        return;
      }
      const providedId = typeof request.body.id === "string" && request.body.id.trim().length > 0 ? request.body.id.trim() : void 0;
      if (config.allowCustomId) {
        if (!providedId) {
          response.status(400).json({ error: "This collection requires a ticket id." });
          return;
        }
        const { id: _id, ...rest } = request.body;
        if (!validateShape(rest, config.shape)) {
          response.status(400).json({ error: "The submitted record is not valid." });
          return;
        }
        const existing = await store.list();
        const replaced = existing.some((item) => item.id === providedId);
        response.status(replaced ? 200 : 201).json(await store.upsert(providedId, rest));
        return;
      }
      if (providedId) {
        response.status(400).json({ error: "Ids are assigned by the server." });
        return;
      }
      if (!validateShape(request.body, config.shape)) {
        response.status(400).json({ error: "The submitted record is not valid." });
        return;
      }
      const created = await store.create(
        request.body,
        (items) => nextCollectionId(config.prefix, items)
      );
      response.status(201).json(created);
    } catch (error) {
      next(error);
    }
  });
  router.patch("/:name/:id", async (request, response, next) => {
    try {
      const store = stores2.get(request.params.name);
      if (!store) {
        response.status(404).json({ error: "Unknown collection." });
        return;
      }
      if (!isRecord(request.body)) {
        response.status(400).json({ error: "Request body must contain a JSON object." });
        return;
      }
      const updated = await store.patch(request.params.id, request.body);
      if (!updated) {
        response.status(404).json({ error: "Record not found." });
        return;
      }
      response.json(updated);
    } catch (error) {
      next(error);
    }
  });
  router.delete("/:name/:id", async (request, response, next) => {
    try {
      const store = stores2.get(request.params.name);
      if (!store) {
        response.status(404).json({ error: "Unknown collection." });
        return;
      }
      const removed = await store.remove(request.params.id);
      if (!removed) {
        response.status(404).json({ error: "Record not found." });
        return;
      }
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  router.use(
    (error, _request, response, next) => {
      if (error instanceof StoreValidationError) {
        response.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  );
  return router;
}

// server/jsonDocumentStore.ts
var SupabaseJsonDocumentStore = class {
  constructor(supabaseUrl2, serviceRoleKey, fetcher = fetch) {
    this.fetcher = fetcher;
    const baseUrl = new URL(supabaseUrl2);
    if (baseUrl.protocol !== "https:" && baseUrl.hostname !== "localhost") {
      throw new Error("SUPABASE_URL must use HTTPS.");
    }
    this.restUrl = new URL("/rest/v1", baseUrl).toString();
    this.headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json"
    };
  }
  async read(key) {
    const query = new URLSearchParams({
      key: `eq.${key}`,
      select: "revision,value",
      limit: "1"
    });
    const response = await this.fetcher(
      `${this.restUrl}/civic_json_documents?${query.toString()}`,
      { headers: this.headers }
    );
    if (!response.ok) {
      throw new Error(`Supabase document read failed (${response.status}).`);
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) {
      throw new Error("Supabase returned an invalid document response.");
    }
    if (rows.length === 0) return null;
    const row = rows[0];
    if (typeof row !== "object" || row === null || !("revision" in row) || typeof row.revision !== "number" || !Number.isSafeInteger(row.revision) || !("value" in row)) {
      throw new Error("Supabase returned an invalid document row.");
    }
    return { revision: row.revision, value: row.value };
  }
  async compareAndSet(key, expectedRevision, value) {
    const response = await this.fetcher(
      `${this.restUrl}/rpc/civic_compare_and_set_json_document`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          p_key: key,
          p_expected_revision: expectedRevision,
          p_value: value
        })
      }
    );
    if (!response.ok) {
      throw new Error(`Supabase document write failed (${response.status}).`);
    }
    const result = await response.json();
    if (typeof result !== "boolean") {
      throw new Error("Supabase returned an invalid document write response.");
    }
    return result;
  }
};

// server/vercelRouting.ts
function restoreVercelApiUrl(requestUrl, forwardedPath) {
  const url = new URL(requestUrl, "http://localhost");
  url.searchParams.delete("__vercel_path");
  const apiPath = forwardedPath.startsWith("/") ? forwardedPath : `/${forwardedPath}`;
  return `/api${apiPath}${url.search}`;
}

// server/app.ts
var serverDirectory = path3.dirname(fileURLToPath(import.meta.url));
var projectDirectory = path3.resolve(serverDirectory, "..");
var isVercel = Boolean(process.env.VERCEL);
var supabaseUrl = process.env.SUPABASE_URL;
var supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (Boolean(supabaseUrl) !== Boolean(supabaseServiceRoleKey)) {
  throw new Error("Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or neither.");
}
var dataFile = path3.resolve(
  projectDirectory,
  process.env.REPORTS_FILE ?? (isVercel && !supabaseUrl ? "/tmp/civic-data/reports.json" : "data/reports.json")
);
var dataDirectory = isVercel && !supabaseUrl ? "/tmp/civic-data" : path3.dirname(dataFile);
var port = Number(process.env.API_PORT ?? 3001);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error("API_PORT must be an integer between 0 and 65535.");
}
var seedEnabled = !["0", "false", "no", "off"].includes(
  (process.env.CIVIC_SEED ?? "1").toLocaleLowerCase()
);
var documentStore = supabaseUrl && supabaseServiceRoleKey ? new SupabaseJsonDocumentStore(supabaseUrl, supabaseServiceRoleKey) : void 0;
if (isVercel && !documentStore) {
  console.warn(
    "Running on Vercel without Supabase credentials. Reports and collections will use in-memory and /tmp storage. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for permanent database persistence."
  );
}
var app = express();
var reports;
var reportsRevision = null;
var writeQueue = Promise.resolve();
var writeAttempts = /* @__PURE__ */ new Map();
app.use((request, _response, next) => {
  const forwardedPath = request.query.__vercel_path;
  if (process.env.VERCEL && typeof forwardedPath === "string") {
    request.url = restoreVercelApiUrl(request.url, forwardedPath);
  }
  next();
});
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: process.env.VERCEL ? "4mb" : "15mb" }));
var WRITE_METHODS = /* @__PURE__ */ new Set(["POST", "PATCH", "PUT", "DELETE"]);
app.use("/api", (request, response, next) => {
  if (!WRITE_METHODS.has(request.method)) {
    next();
    return;
  }
  const now = Date.now();
  const clientKey = request.socket.remoteAddress ?? "unknown";
  let limit = writeAttempts.get(clientKey);
  if (!limit || now - limit.windowStartedAt >= 6e4) {
    limit = { count: 0, windowStartedAt: now };
    writeAttempts.set(clientKey, limit);
  }
  limit.count += 1;
  if (writeAttempts.size > 1e4) {
    for (const [key, entry] of writeAttempts) {
      if (now - entry.windowStartedAt >= 6e4) writeAttempts.delete(key);
    }
  }
  if (limit.count > 30) {
    response.setHeader(
      "Retry-After",
      Math.ceil((6e4 - (now - limit.windowStartedAt)) / 1e3)
    );
    response.status(429).json({ error: "Too many changes. Please wait before trying again." });
    return;
  }
  next();
});
var stores = createStores(dataDirectory, seedEnabled, documentStore);
var engagementStore = requireStore(stores, "engagements");
var resolutionStore = requireStore(stores, "resolutions");
var ratingStore = requireStore(stores, "ratings");
var threadStore = requireStore(stores, "threads");
async function loadReports() {
  if (documentStore) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const document = await documentStore.read("reports");
      if (document) {
        if (!Array.isArray(document.value) || !document.value.every(isHazardReport)) {
          throw new Error("The reports document in Supabase has an invalid format.");
        }
        reports = document.value;
        reportsRevision = document.revision;
        return reports;
      }
      const initialReports = seedEnabled ? [...SEED_REPORTS] : [];
      if (initialReports.length === 0) {
        reports = initialReports;
        reportsRevision = null;
        return reports;
      }
      if (await documentStore.compareAndSet("reports", null, initialReports)) {
        reports = initialReports;
        reportsRevision = 1;
        return reports;
      }
    }
    throw new Error("Could not initialize reports in Supabase after concurrent writes.");
  }
  if (reports) return reports;
  try {
    const parentDirectory = await stat(path3.dirname(dataFile));
    if (!parentDirectory.isDirectory()) {
      throw new Error("The configured report storage parent is not a directory.");
    }
  } catch (error) {
    if (!isRecord(error) || error.code !== "ENOENT") {
      throw error;
    }
  }
  try {
    const contents = await readFile2(dataFile, "utf8");
    const parsed = JSON.parse(contents);
    if (!Array.isArray(parsed) || !parsed.every(isHazardReport)) {
      throw new Error(`Report data at ${dataFile} has an invalid format.`);
    }
    reports = parsed;
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") {
      reports = seedEnabled ? [...SEED_REPORTS] : [];
      return reports;
    }
    throw error;
  }
  return reports;
}
async function persistReports(nextReports) {
  if (documentStore) {
    if (!await documentStore.compareAndSet(
      "reports",
      reportsRevision,
      nextReports
    )) {
      reports = void 0;
      throw new Error("Reports changed during this request. Please retry.");
    }
    reportsRevision = reportsRevision === null ? 1 : reportsRevision + 1;
    reports = nextReports;
    return;
  }
  await mkdir2(path3.dirname(dataFile), { recursive: true });
  const temporaryFile = `${dataFile}.${process.pid}.${randomUUID2()}.tmp`;
  try {
    await writeFile2(temporaryFile, `${JSON.stringify(nextReports, null, 2)}
`, {
      encoding: "utf8",
      flag: "wx"
    });
    await rename2(temporaryFile, dataFile);
  } catch (error) {
    try {
      await unlink2(temporaryFile);
    } catch (cleanupError) {
      console.error("Could not remove temporary report file:", cleanupError);
    }
    throw error;
  }
  reports = nextReports;
}
function queueWrite(operation) {
  const result = writeQueue.then(operation);
  writeQueue = result.then(
    () => void 0,
    () => void 0
  );
  return result;
}
function makeReportId(existingReports) {
  let id;
  do {
    id = `#CF-${randomInt(1e4, 1e5)}`;
  } while (existingReports.some((report) => report.id === id));
  return id;
}
async function findReport(id) {
  return (await loadReports()).find((report) => report.id === id);
}
app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});
app.get("/api/reports", async (_request, response, next) => {
  try {
    response.json(await loadReports());
  } catch (error) {
    next(error);
  }
});
app.get("/api/reports/:id", async (request, response, next) => {
  try {
    const report = await findReport(request.params.id);
    if (!report) {
      response.status(404).json({ error: "Report not found." });
      return;
    }
    response.json(report);
  } catch (error) {
    next(error);
  }
});
app.post("/api/reports/detect-duplicates", async (request, response, next) => {
  try {
    const body = request.body;
    if (!isRecord(body) || typeof body.subType !== "string" || typeof body.location !== "string") {
      response.status(400).json({ error: "Send subType and location to check for similar reports." });
      return;
    }
    const existing = await loadReports();
    const engagements = await engagementStore.list();
    const matches = findDuplicateReports(
      {
        subType: body.subType,
        hazardType: typeof body.hazardType === "string" ? body.hazardType : void 0,
        location: body.location,
        id: typeof body.id === "string" ? body.id : void 0
      },
      existing
    ).map((match) => ({
      ...match,
      affected: engagements.find((entry) => entry.id === match.id)?.affected ?? 0
    }));
    response.json({
      matches,
      radiusMetres: DUPLICATE_RADIUS_METRES,
      windowDays: DUPLICATE_WINDOW_DAYS
    });
  } catch (error) {
    next(error);
  }
});
app.get("/api/reports/:id/engagement", async (request, response, next) => {
  try {
    const record = await engagementStore.get(request.params.id);
    response.json(record ?? { id: request.params.id, affected: 0, confirmations: [] });
  } catch (error) {
    next(error);
  }
});
app.post("/api/reports/:id/confirm", async (request, response, next) => {
  try {
    const id = request.params.id;
    if (!await findReport(id)) {
      response.status(404).json({ error: "Report not found." });
      return;
    }
    const resident = isRecord(request.body) && typeof request.body.resident === "string" ? request.body.resident.trim() : "";
    if (resident.length === 0 || resident.length > 80) {
      response.status(400).json({ error: "Send the resident name confirming this issue." });
      return;
    }
    let alreadyConfirmed = false;
    const record = await engagementStore.update(id, (existing) => {
      const confirmations = Array.isArray(existing?.confirmations) ? existing.confirmations : [];
      if (confirmations.includes(resident)) {
        alreadyConfirmed = true;
        return existing;
      }
      return {
        id,
        affected: (Number(existing?.affected) || 0) + 1,
        confirmations: [...confirmations, resident]
      };
    });
    if (!record) {
      throw new Error(`Could not update engagement for report ${id}.`);
    }
    response.status(alreadyConfirmed ? 200 : 201).json(record);
  } catch (error) {
    next(error);
  }
});
app.get("/api/reports/:id/resolution", async (request, response, next) => {
  try {
    response.json(await resolutionStore.get(request.params.id) ?? null);
  } catch (error) {
    next(error);
  }
});
app.put("/api/reports/:id/resolution", async (request, response, next) => {
  try {
    const id = request.params.id;
    if (!await findReport(id)) {
      response.status(404).json({ error: "Report not found." });
      return;
    }
    if (!isRecord(request.body) || !isPhotoReference(request.body.before) || !isPhotoReference(request.body.after)) {
      response.status(400).json({ error: "A proof of resolution needs a before and an after image." });
      return;
    }
    const record = await resolutionStore.upsert(id, {
      before: request.body.before,
      after: request.body.after,
      note: typeof request.body.note === "string" && request.body.note.length <= 1e3 ? request.body.note : void 0,
      at: formatTimestamp(/* @__PURE__ */ new Date()),
      residentConfirmed: null
    });
    response.status(201).json(record);
  } catch (error) {
    next(error);
  }
});
app.patch("/api/reports/:id/resolution", async (request, response, next) => {
  try {
    const id = request.params.id;
    const existing = await resolutionStore.get(id);
    if (!existing) {
      response.status(404).json({ error: "No proof of resolution has been uploaded." });
      return;
    }
    if (!isRecord(request.body) || typeof request.body.residentConfirmed !== "boolean") {
      response.status(400).json({ error: "Send residentConfirmed as true or false." });
      return;
    }
    const confirmed = request.body.residentConfirmed;
    const timestamp = formatTimestamp(/* @__PURE__ */ new Date());
    const record = await resolutionStore.patch(id, { residentConfirmed: confirmed });
    const report = await queueWrite(async () => {
      const items = await loadReports();
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return null;
      const next2 = [...items];
      next2[index] = {
        ...items[index],
        status: confirmed ? items[index].status : "In Progress",
        timeline: markResidentConfirmation(items[index].timeline, confirmed, timestamp)
      };
      await persistReports(next2);
      return next2[index];
    });
    response.json({ resolution: record, report });
  } catch (error) {
    next(error);
  }
});
app.get("/api/reports/:id/rating", async (request, response, next) => {
  try {
    response.json(await ratingStore.get(request.params.id) ?? null);
  } catch (error) {
    next(error);
  }
});
app.post("/api/reports/:id/rating", async (request, response, next) => {
  try {
    const id = request.params.id;
    if (!await findReport(id)) {
      response.status(404).json({ error: "Report not found." });
      return;
    }
    const stars = isRecord(request.body) ? request.body.stars : void 0;
    if (typeof stars !== "number" || !Number.isInteger(stars) || stars < 1 || stars > 5) {
      response.status(400).json({ error: "Rating must be a whole number from 1 to 5." });
      return;
    }
    const comment = isRecord(request.body) && typeof request.body.comment === "string" ? request.body.comment.slice(0, 1e3) : void 0;
    const record = await ratingStore.upsert(id, {
      stars,
      comment: comment || void 0,
      at: formatTimestamp(/* @__PURE__ */ new Date())
    });
    response.status(201).json(record);
  } catch (error) {
    next(error);
  }
});
app.get("/api/reports/:id/messages", async (request, response, next) => {
  try {
    const thread = await threadStore.get(request.params.id);
    response.json(thread?.messages ?? []);
  } catch (error) {
    next(error);
  }
});
app.post("/api/reports/:id/messages", async (request, response, next) => {
  try {
    const id = request.params.id;
    if (!await findReport(id)) {
      response.status(404).json({ error: "Report not found." });
      return;
    }
    const body = request.body;
    const from = isRecord(body) && body.from === "municipality" ? "municipality" : "resident";
    const text = isRecord(body) && typeof body.text === "string" ? body.text.trim() : "";
    const author = isRecord(body) && typeof body.author === "string" && body.author.trim().length > 0 ? body.author.trim().slice(0, 80) : from === "municipality" ? "Municipality" : "Resident";
    if (text.length === 0 || text.length > 2e3) {
      response.status(400).json({ error: "Message text is required (2000 characters max)." });
      return;
    }
    let createdMessage;
    const thread = await threadStore.update(id, (existing) => {
      const messages = Array.isArray(existing?.messages) ? [...existing.messages] : [];
      let counter = messages.length + 1;
      while (messages.some((message) => message.id === `M-${counter}`)) counter += 1;
      createdMessage = {
        id: `M-${counter}`,
        from,
        author,
        text,
        at: formatTimestamp(/* @__PURE__ */ new Date())
      };
      messages.push(createdMessage);
      return { id, messages };
    });
    if (!thread || !createdMessage) {
      throw new Error(`Could not append message to report ${id}.`);
    }
    response.status(201).json(createdMessage);
  } catch (error) {
    next(error);
  }
});
app.patch("/api/reports/:id/status", async (request, response, next) => {
  try {
    const requestedStatus = request.body?.status;
    if (typeof requestedStatus !== "string" || !statuses.includes(requestedStatus)) {
      response.status(400).json({
        error: "Status must be Received, Verified, Assigned, In Progress, Resolved, or Rejected."
      });
      return;
    }
    const updatedReport = await queueWrite(async () => {
      const existingReports = await loadReports();
      const reportIndex = existingReports.findIndex(
        (item) => item.id === request.params.id
      );
      if (reportIndex === -1) {
        return null;
      }
      const current = existingReports[reportIndex];
      const nextReports = [...existingReports];
      nextReports[reportIndex] = {
        ...current,
        status: requestedStatus,
        timeline: applyStatusToTimeline(
          current.timeline,
          requestedStatus,
          formatTimestamp(/* @__PURE__ */ new Date())
        )
      };
      await persistReports(nextReports);
      return nextReports[reportIndex];
    });
    if (!updatedReport) {
      response.status(404).json({ error: "Report not found." });
      return;
    }
    response.json(updatedReport);
  } catch (error) {
    next(error);
  }
});
app.post("/api/reports", async (request, response, next) => {
  try {
    if (!isRecord(request.body) || !isHazardReport({ ...request.body, id: "#CF-00000" })) {
      response.status(400).json({ error: "Report is missing required or valid fields." });
      return;
    }
    const createdReport = await queueWrite(async () => {
      const existingReports = await loadReports();
      const submittedAt = formatTimestamp(/* @__PURE__ */ new Date());
      const dispatch = dispatchTeam(
        String(request.body.department),
        String(request.body.location)
      );
      const timeline = Array.isArray(request.body.timeline) ? [...request.body.timeline] : [];
      if (dispatch.team) {
        timeline.push({
          stage: "Auto-dispatched",
          timestamp: submittedAt,
          done: true,
          note: `${dispatch.team.name} \u2014 ${dispatch.reason}`
        });
      }
      const report = {
        id: makeReportId(existingReports),
        hazardType: request.body.hazardType,
        subType: request.body.subType,
        department: request.body.department,
        departmentUnit: request.body.departmentUnit,
        location: request.body.location,
        address: request.body.address,
        status: request.body.status,
        date: request.body.date,
        severity: request.body.severity,
        description: request.body.description,
        photoUrl: request.body.photoUrl,
        contact: request.body.contact,
        assignedTeam: dispatch.team?.name ?? request.body.assignedTeam,
        notes: request.body.notes,
        detectedAt: request.body.detectedAt,
        aiAssessment: request.body.aiAssessment,
        timeline
      };
      const nextReports = [report, ...existingReports];
      await persistReports(nextReports);
      return report;
    });
    response.status(201).json(createdReport);
  } catch (error) {
    next(error);
  }
});
app.use("/api/c", createCollectionsRouter(stores));
app.use(
  "/api/assets",
  express.static(path3.join(projectDirectory, "src", "assets", "images"))
);
app.use((error, _request, response, _next) => {
  if (isRecord(error) && error.type === "entity.parse.failed") {
    response.status(400).json({ error: "Request body must contain valid JSON." });
    return;
  }
  if (isRecord(error) && error.type === "entity.too.large") {
    response.status(413).json({
      error: `Request body exceeds the ${process.env.VERCEL ? "4 MB Vercel" : "15 MB"} limit.`
    });
    return;
  }
  console.error("API request failed:", error);
  response.status(500).json({ error: "The reports service encountered an unexpected error." });
});
var app_default = app;
export {
  app_default as default
};
