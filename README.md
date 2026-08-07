ForkRoom Frontend

ForkRoom is a collaborative decision workspace. This repository contains the separate Next.js frontend for the completed FastAPI backend.

Stack

Next.js App Router + React + TypeScript

Mantine + CSS Modules + PostCSS

Tabler Icons

TanStack Query for server state

Zustand for local UI state

Axios for API access

react-resizable-panels for the desktop Decision Room

React Hook Form + Zod for forms

Motion for deliberate interface transitions

Tiptap, Yjs/Hocuspocus, and WebRTC dependencies will be added when their corresponding collaborative surfaces are implemented.

Local setup

npm install
cp .env.example .env.local
npm run dev

Open http://localhost:3000.

The default local API URL is http://127.0.0.1:8000/api/v1.

Quality checks

npm run typecheck
npm run lint
npm run build

Design source of truth

The frontend follows the supplied ForkRoom product brief, layout blueprint, and light-mode ARES-derived design system:

warm canvas: #F4EEEA

raised surface: #FFFDFC

primary rust: #CB4D22

commitment anchor: #000000

Manrope for interface text

Source Serif 4 for long-form decision content

JetBrains Mono for compact metadata

The core interface is the Decision Room: a resizable three-area desktop workspace that becomes tabs/sheets on smaller viewports.

Backend contract

Before wiring authentication and real server data, export the exact OpenAPI document from the running backend:

http://127.0.0.1:8000/openapi.json

The frontend will generate TypeScript API types from that contract instead of inventing request or response fields.