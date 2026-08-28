---
name: EAS GitHub build prerequisites
description: Constraints learned from the Expo GitHub-based Android development build.
---

For GitHub-triggered EAS builds in this workspace, the Expo project slug must exactly match the slug in app.json, and a pnpm workspace should declare its pnpm version in the root packageManager field while using Corepack. Every EAS build profile used by this project must set the same Node version, enable Corepack, and select a current Android image; profiles do not inherit those settings from one another. Combining Corepack with an explicit eas.json pnpm installer can conflict on newer build images.

**Why:** The EAS GitHub builder resolves the project from the appId and installs the repository with frozen lockfile settings. A profile without Corepack fell back to pnpm 8 and rejected the v9 lockfile; a profile without a current Android image selected Java 11 even though the SDK 54 Gradle plugin requires Java 17.

**How to apply:** Keep app.json slug and Expo project slug identical. For pnpm lockfile v9 workspaces, use a root packageManager entry plus Corepack and the pinned Node version in every profile. For SDK 54 Android builds, select a current image that provides Java 17.