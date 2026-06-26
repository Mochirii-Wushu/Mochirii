# Internal Mochi Social Account Progress Notes

This is a private implementation note for maintainers. It is not player-facing copy.
Player-facing wording belongs in `docs/mochi-social-playtest-guide.md`
and should stay focused on the shared guild room, Lirabao care, closed alpha
access, and no real value.

Mochirii owns Supabase membership, allowlist, terms, audit, feedback, and Unity
player mapping. The game repo owns Unity runtime behavior and UGS saves;
account-linked character and shared-pet persistence are brokered from here but
stored primarily in Unity Gaming Services.

## Authority Contract

- `mochi_social_progress_snapshots` stores one no-real-value alpha snapshot per Supabase user.
- UGS Player Data `character.v1` is the primary durable character save for the Unity WebGL alpha.
- UGS Game Data `room:jade-lantern-room/sharedPet.v1` is the primary durable shared Lirabao save.
- `mochi_social_unity_players` stores the Supabase user to UGS Custom ID/player mapping for audit and support.
- `mochi_social_shared_pet_snapshots` stores the latest Supabase audit mirror for shared Lirabao state, not the primary runtime save.
- `mochi-social-unity-auth` verifies Supabase auth, allowlist, and terms before returning player-scoped Unity Custom ID tokens.
- `mochi-social-alpha-progress` loads a snapshot only for a game-server-verified, allowlisted tester who has accepted the alpha terms.
- `mochi-social-alpha-action` remains idempotent through `mochi_social_ledger_events.request_id`, records the action ledger, updates the legacy snapshot when the game sends `payload.state`, and mirrors shared Lirabao state on `unity.pet.state_saved`.
- Browser code never receives service-role keys, Unity service account secrets, game server tokens, Discord secrets, Enjin secrets, wallet material, or refresh tokens.
- RLS allows signed-in users to read their own progress snapshot as defense in depth; privileged writes stay in Edge Functions.
- Tester-password mode remains guest-only and should not claim account persistence.
- Live avatar transforms, emotes, and animation triggers are session state only; they are not durable Supabase saves.

## No-Cost Boundary

This setup is schema/function code only until an operator deploys it. Do not deploy Supabase functions, apply remote migrations, change Vercel/Supabase env vars, rotate secrets, or run hosted preview checks without fresh approval when usage or costs may be involved.
