# Changelog

All notable changes to the Chef project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Inventory page now has an always-visible in-stock ingredient search bar instead of a search toggle button
- Inventory `Add` action now opens the ingredient catalog in a full-screen modal overlay matching the photo/video scan modal pattern

### Fixed
- API build failures due to outdated Prisma client generation
- Missing `handleAdded` function in inventory client causing TypeScript errors
- Vision sidecar service not running, preventing YOLO scans

### Added
- Vision sidecar FastAPI service setup and startup documentation
- Comprehensive build verification across all packages

## [2026-05-06] - Build Fixes and Vision Service Setup

### Fixed
- **API Build**: Regenerated Prisma client to include new user profile memory models (`UserFoodRule`, `UserGoal`, `UserPantryStaple`) and enums (`UserMemoryConfidence`, `UserMemorySource`, `UserGoalTimeframe`)
- **Web Build**: Added missing `handleAdded` function in `InventoryClient` component to handle items added through vision scanning modals
- **Vision Service**: Set up and started FastAPI vision sidecar at http://localhost:8000 for YOLO object detection

### Infrastructure
- Vision sidecar service now running with auto-reload for development
- Full monorepo build verification passing
- All TypeScript compilation errors resolved

### Documentation
- Added detailed change documentation in `docs/changes-2026-05-06.md`

---

For detailed change documentation, see the `docs/` directory.
