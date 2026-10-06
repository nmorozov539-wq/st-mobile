# SillyTavern Mobile Frontend — Concept v0.1

## Purpose

An independent mobile application that provides its own complete UI/UX for SillyTavern.

SillyTavern remains the engine. The mobile application replaces the SillyTavern UI rather than wrapping or restyling it.

The goal is to make SillyTavern feel like a real mobile application: smooth, comfortable, and designed around mobile interaction rather than a compressed desktop interface.

UI and UX are intentionally not designed yet.

## Core Architecture

```text
┌──────────────────────────────┐
│        Mobile Frontend       │
│                              │
│  UI / UX                     │
│  presentation state          │
│  navigation                  │
│  gestures                    │
│  local interaction state     │
└──────────────┬───────────────┘
               │
          thin bridge
               │
               ▼
┌──────────────────────────────┐
│        SillyTavern           │
│            Engine            │
│                              │
│  persistent/RP state         │
│  characters                  │
│  chats                       │
│  generation                  │
│  presets                     │
│  lore / world info           │
│  personas                    │
│  extensions                  │
│  etc.                        │
└──────────────────────────────┘
```

SillyTavern is authoritative for persistent and RP/application state.

The app is authoritative for presentation state.

The bridge should be as thin as practical.

## Connection Model

The connection is primarily transactional, not a continuous mirror of SillyTavern's internal event bus.

The app sends a command when an operation actually requires SillyTavern to do something or provide data.

Purely local UI actions do not need to cross the bridge.

Examples of app-local state:

- navigation
- open/closed panels
- scrolling
- animations
- keyboard state
- selected UI elements

Examples of engine operations:

- switching chat
- selecting a character
- sending a message
- editing/deleting a message
- swiping/regenerating
- stopping generation
- changing engine settings
- creating/deleting chats

The bridge translates high-level app operations into SillyTavern operations. It should avoid reimplementing SillyTavern logic wherever possible.

SillyTavern's internal events are therefore not automatically exposed to the mobile app. Individual events may be used internally by the bridge where necessary, but reproducing the complete ST event system is not a project requirement.

## Local and Remote Operation

Both local and remote SillyTavern instances are required.

Initial priority: local operation.

The app should eventually be able to connect to a remotely running SillyTavern instance through the same general frontend/bridge model.

No project-specific remote infrastructure or server topology is part of this concept at this stage.

## Local ST Behavior

When SillyTavern is running locally, the app should function as a native SillyTavern client.

The intended limitation is generation itself: if the local setup cannot generate an answer, the app should still provide the rest of the SillyTavern experience and functionality.

In other words, lack of generation capability should not turn the local app into a crippled interface.

## Open Questions

### Application Technology — UNRESOLVED

What technology should the mobile frontend use?

Possible categories include native Android and cross-platform approaches such as Flutter or Kotlin Multiplatform.

The choice has not been made. The differences and trade-offs need to be investigated before deciding.

### SillyTavern Capability Scope — UNRESOLVED

Should the mobile frontend eventually expose essentially all SillyTavern capabilities, or should some desktop-oriented functionality remain desktop-only?

This is intentionally left unresolved for a longer discussion.

### UI / UX — UNRESOLVED

No concrete interface has been designed yet.

The only current UX requirement is that it should feel like a genuine mobile application rather than a compressed desktop SillyTavern interface.

## Current Principle

Do not design the UI around SillyTavern's existing webpage.

Design a mobile application around the capabilities SillyTavern provides as an engine.
