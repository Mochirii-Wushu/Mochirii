# Mochi Pets Future Project

Mochi Pets is not an active website game or playable build. The former
prototype repository is retirement-only and is scheduled for deletion after
the replacement page is verified in production. The stable website route
`/games/mochi-pets` is a static project-status page and must not embed, fetch,
authenticate against, or depend on a game runtime.

Already-deployed game provider resources are a separate security and data
retention boundary. Their reviewed function source remains quarantined in
`supabase` until an exact provider packet removes the remote endpoints and
confirms that the source can be deleted without abandoning callable code.

## Fresh-start boundary

Development may resume only through a separately approved project packet. The
new project must start from a new Unity project and a new repository in the
`Mochirii-Wushu` GitHub organization. Do not restore, copy, or treat the former
prototype source, generated builds, packages, credentials, database records, or
provider configuration as the new foundation.

The page artwork and Mochirii branding in this repository may be considered for
reuse only after a normal ownership and design review. No release date or
playable-build claim should appear until supported by a verified build.

## Required restart sequence

1. Approve a concise product brief: audience, core loop, supported devices,
   input methods, accessibility targets, performance budgets, privacy boundary,
   multiplayer scope, and explicit exclusions.
2. Select a currently supported Unity LTS release at project creation time.
   Record the exact editor version and modules in `ProjectVersion.txt` and the
   repository README.
3. Create the repository under `Mochirii-Wushu` with Mochirii-only source and
   documentation. Track `Assets`, `Packages`, and `ProjectSettings`; keep every
   asset with its `.meta` file; ignore generated directories such as `Library`,
   `Temp`, `Logs`, `UserSettings`, and build output.
4. Establish a minimal vertical slice before adding hosted services. Include
   deterministic editor/build checks, Unity Test Framework coverage for core
   logic, a documented supported-resolution matrix, keyboard/controller/touch
   decisions, and measured frame-time and memory budgets.
5. Add authentication, multiplayer, analytics, purchases, or persistent cloud
   data only in separate threat-modeled and privacy-reviewed changes. Keep all
   provider credentials out of Unity assets, public Git, client logs, and
   website configuration.
6. Connect the website only after a reviewed build has a stable hosted contract.
   Update the static route through a focused Website pull request, test the
   integration on a preview, and preserve a static rollback state.

Unity documents external version-control configuration and the source folders
that must be preserved in its official
[version-control guidance](https://docs.unity3d.com/Manual/Versioncontrolintegration.html).
GitHub's official
[repository best practices](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories)
apply when the new repository is created.
