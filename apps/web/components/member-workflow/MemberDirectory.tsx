"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChange, requireAuth } from "@/lib/supabase/auth";
import { getPublishedMemberProfile, listPublishedMemberProfiles } from "@/lib/supabase/member-profiles";
import { text, type PublicMemberProfile } from "@/lib/supabase/types";
import { ProfileDisplay } from "@/components/public-pages/ProfileDisplay";
import { WorkflowEmptyState, WorkflowNotice } from "./WorkflowState";

const fallbackAvatar = "/assets/img/leaders/leader-silhouette.webp";
const fallbackBanner = "/assets/img/leaders/panel.webp";

function memberTitle(profile: PublicMemberProfile) {
  return text(profile.guildTitle, "Mōchirīī Member");
}

function MemberCard({ profile }: { profile: PublicMemberProfile }) {
  const slug = text(profile.slug);
  const displayName = text(profile.displayName, "Mōchirīī Member");

  return (
    <article className="glass-card glass-card--soft glass-pad member-card">
      <img
        className="member-card__avatar"
        src={profile.avatarUrl || fallbackAvatar}
        alt={`${displayName} profile picture`}
        loading="lazy"
        decoding="async"
      />
      <div>
        <p className="kicker">{memberTitle(profile)}</p>
        <h2 className="section-title section-title--sm">{displayName}</h2>
        {profile.timezone ? <p className="muted">{profile.timezone}</p> : null}
        <p>{profile.bio ? profile.bio.slice(0, 160) : "Profile details are coming soon."}</p>
        {slug ? <Link className="footer-link" href={`/members/${slug}`}>Open profile</Link> : null}
      </div>
    </article>
  );
}

function GateMessage({ title, message }: { title: string; message: string }) {
  return (
    <section className="glass-card glass-card--primary glass-pad auth-panel">
      <p className="kicker">Members</p>
      <h2 className="section-title">{title}</h2>
      <p className="muted">{message}</p>
      <div className="auth-actions">
        <Link className="hero-cta hero-cta--primary" href="/auth">Login</Link>
        <Link className="hero-cta" href="/account">Account</Link>
      </div>
    </section>
  );
}

export function MembersDirectory() {
  const [busy, setBusy] = useState(true);
  const [profiles, setProfiles] = useState<PublicMemberProfile[]>([]);
  const [message, setMessage] = useState("Loading member profiles.");
  const [signedIn, setSignedIn] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const auth = await requireAuth();
    setSignedIn(Boolean(auth.ok));
    if (!auth.ok) {
      setProfiles([]);
      setMessage("Choose a sign-in method to view member profiles.");
      setBusy(false);
      return;
    }

    const result = await listPublishedMemberProfiles();
    if (!result.ok) {
      setProfiles([]);
      setMessage(result.message || "Member profiles could not be loaded.");
      setBusy(false);
      return;
    }

    const nextProfiles = Array.isArray(result.data?.profiles) ? result.data.profiles : [];
    setProfiles(nextProfiles);
    setMessage(nextProfiles.length ? `${nextProfiles.length} member profile${nextProfiles.length === 1 ? "" : "s"} shown.` : "No members have published profiles yet.");
    setBusy(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    const subscription = onAuthStateChange(() => {
      void load();
    });
    return () => subscription.data?.subscription?.unsubscribe();
  }, [load]);

  if (!signedIn && !busy) {
    return <GateMessage title="Sign In Required" message={message} />;
  }

  return (
    <section className="glass-card glass-card--primary glass-pad auth-panel" aria-busy={busy} aria-live="polite">
      <div className="auth-panel__head">
        <div>
          <p className="kicker">Members</p>
          <h2 className="section-title">Published Profiles</h2>
        </div>
        <button className="hero-cta" type="button" onClick={load} disabled={busy}>Refresh</button>
      </div>
      <WorkflowNotice tone={profiles.length ? "success" : "info"}>{message}</WorkflowNotice>
      <div className="member-directory-grid">
        {profiles.map((profile) => <MemberCard profile={profile} key={text(profile.slug, text(profile.id))} />)}
      </div>
      {!profiles.length ? (
        <WorkflowEmptyState title={busy ? "Loading profiles" : "No profiles shown"}>
          {busy ? "Checking your session and member profile access." : message}
        </WorkflowEmptyState>
      ) : null}
    </section>
  );
}

export function MemberProfileView({ slug }: { slug: string }) {
  const [busy, setBusy] = useState(true);
  const [profile, setProfile] = useState<PublicMemberProfile | null>(null);
  const [message, setMessage] = useState("Loading member profile.");
  const [signedIn, setSignedIn] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const auth = await requireAuth();
    setSignedIn(Boolean(auth.ok));
    if (!auth.ok) {
      setProfile(null);
      setMessage("Choose a sign-in method to view member profiles.");
      setBusy(false);
      return;
    }

    const result = await getPublishedMemberProfile(slug);
    if (!result.ok || !result.data?.profile) {
      setProfile(null);
      setMessage(result.message || "That member profile is not published.");
      setBusy(false);
      return;
    }

    setProfile(result.data.profile);
    setMessage("");
    setBusy(false);
  }, [slug]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    const subscription = onAuthStateChange(() => {
      void load();
    });
    return () => subscription.data?.subscription?.unsubscribe();
  }, [load]);

  if (!profile) {
    return (
      <main className="page-main" id="main">
        <div className="container">
          {!signedIn && !busy ? (
            <GateMessage title="Sign In Required" message={message} />
          ) : (
            <section className="glass-card glass-card--primary glass-pad auth-panel" aria-busy={busy}>
              <p className="kicker">Member Profile</p>
              <h1 className="section-title">{busy ? "Loading" : "Profile unavailable"}</h1>
              <WorkflowNotice tone={busy ? "info" : "warning"}>{message}</WorkflowNotice>
              <div className="auth-actions">
                <Link className="hero-cta" href="/members">Back to members</Link>
              </div>
            </section>
          )}
        </div>
      </main>
    );
  }

  const displayName = text(profile.displayName, "Mōchirīī Member");
  const title = memberTitle(profile);
  return (
    <ProfileDisplay
      page="memberProfile"
      ariaLabel={`${displayName} member profile hero`}
      heroImage={profile.bannerUrl || fallbackBanner}
      heroAlt={`${displayName} profile banner`}
      kicker="Member Profile"
      name={displayName}
      timezone={profile.timezone}
      guildTitle={title}
      avatar={profile.avatarUrl || fallbackAvatar}
      avatarAlt={`${displayName} profile picture`}
      bio={profile.bio || "Profile details are coming soon."}
      details={[
        { label: "Title", value: title },
        { label: "Discord handle", value: profile.discordHandle },
        { label: "Pixelfed", value: profile.socialProfileUrl },
        { label: "Game UID", value: profile.gameUid },
        { label: "Region", value: profile.region },
        { label: "Timezone", value: profile.timezone },
      ]}
      centerHero={false}
    />
  );
}
