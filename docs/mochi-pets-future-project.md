# Mochi Pets Fresh Project

Mochi Pets is not an active website game or playable build. The former
prototype repository and local checkout are deleted and must not be restored.
The stable website route `/games/mochi-pets` provides a server-rendered tester
password doorway and a disconnected waiting room. It must not embed, fetch,
authenticate against, or depend on a game runtime while the connection contract
is `not-connected`.

The new private `Mochirii-Wushu/Mochirii-Pets` repository is a clean Unity
foundation. It owns the single game source that will later produce Web and iOS
artifacts. Registering that source does not connect a playable build, restore
saved progress, or reactivate any quarantined provider resource.

Already-deployed game provider resources are a separate security and data
retention boundary. Their reviewed function source remains quarantined in
`supabase` until an exact provider packet removes the remote endpoints and
confirms that the source can be deleted without abandoning callable code.

## Fresh-start boundary

Development resumes only in the separately approved fresh Unity project and
`Mochirii-Wushu/Mochirii-Pets` repository. Do not restore, copy, or treat the
former prototype source, generated builds, packages, credentials, database
records, or provider configuration as the new foundation.

The page artwork and Mochirii branding in this repository may be considered for
reuse only after a normal ownership and design review. No release date or
playable-build claim should appear until supported by a verified build.

## Required restart sequence

1. Approve a concise product brief: audience, core loop, supported devices,
   input methods, accessibility targets, performance budgets, privacy boundary,
   multiplayer scope, and explicit exclusions.
2. Keep the exact reviewed Unity editor version pinned in
   `ProjectVersion.txt`; upgrades require a focused dependency pull request and
   both platform exports.
3. Preserve Mochirii-only source and documentation. Track `Assets`, `Packages`,
   and `ProjectSettings`; keep every asset with its `.meta` file; ignore
   generated directories such as `Library`, `Temp`, `Logs`, `UserSettings`, Web
   output, and Xcode output.
4. Establish a minimal vertical slice before adding hosted services. Include
   deterministic editor/build checks, Unity Test Framework coverage for core
   logic, a documented supported-resolution matrix, keyboard/controller/touch
   decisions, and measured frame-time and memory budgets.
5. Add authentication, multiplayer, analytics, purchases, or persistent cloud
   data only in separate threat-modeled and privacy-reviewed changes. Keep all
   provider credentials out of Unity assets, public Git, client logs, and
   website configuration.
6. Connect the website only after a reviewed build has a stable hosted contract.
   Extend `docs/integrations/mochi-pets-website-contract.md` through a focused
   Website pull request, test the integration on a preview, and preserve the
   disconnected waiting room as the rollback state.

The iOS host stays in `Mochirii-Social-Mobile`. It embeds a reviewed Unity export
full-screen while Social and guild chat remain native screens connected to the
same `social.mochirii.com` platform. The initial app identity remains
`com.mochirii.social`; no Apple capability or App Store change is implied by the
source scaffold.

Unity documents external version-control configuration and the source folders
that must be preserved in its official
[version-control guidance](https://docs.unity3d.com/Manual/Versioncontrolintegration.html).
GitHub's official
[repository best practices](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories)
apply to ongoing maintenance of the fresh private repository.
