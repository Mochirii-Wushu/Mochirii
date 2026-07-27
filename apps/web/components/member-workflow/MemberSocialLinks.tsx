"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  MEMBER_SOCIAL_LINK_LIMIT,
  MEMBER_SOCIAL_LINK_PROVIDERS,
  memberSocialLinkProviderLabel,
  type MemberSocialLinkProvider,
} from "@/lib/member-social-links/profile-links-core";
import {
  createMemberSocialLink,
  deleteMemberSocialLink,
  listMyMemberSocialLinks,
  reorderMemberSocialLinks,
  updateMemberSocialLinkVisibility,
} from "@/lib/supabase/member-social-links";
import { type MemberSocialLink } from "@/lib/supabase/types";
import { WorkflowEmptyState, WorkflowNotice } from "./WorkflowState";

type MemberSocialLinksProps = {
  currentUserId: string;
};

function linkHostname(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "Profile link";
  }
}

export function MemberSocialLinks({ currentUserId }: MemberSocialLinksProps) {
  const [links, setLinks] = useState<MemberSocialLink[]>([]);
  const [provider, setProvider] = useState<MemberSocialLinkProvider>("instagram");
  const [profileUrl, setProfileUrl] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [shareWithGuild, setShareWithGuild] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const selectedProvider = useMemo(
    () => MEMBER_SOCIAL_LINK_PROVIDERS.find(({ id }) => id === provider) || MEMBER_SOCIAL_LINK_PROVIDERS[0],
    [provider],
  );

  const loadLinks = useCallback(async () => {
    setError("");
    const result = await listMyMemberSocialLinks();
    if (!result.ok) {
      setLinks([]);
      setError("Profile links could not be loaded. Please try again.");
      return;
    }
    setLinks(result.data || []);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    void Promise.resolve().then(loadLinks);
  }, [currentUserId, loadLinks]);

  async function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyId) return;
    setBusyId("new");
    setStatus("");
    setError("");

    const result = await createMemberSocialLink({
      provider,
      displayLabel: customLabel,
      profileUrl,
      isVisible: shareWithGuild,
    });

    if (!result.ok || !result.data) {
      setError(result.message || "Profile link could not be added.");
      setBusyId(null);
      return;
    }

    setLinks((current) => [...current, result.data as MemberSocialLink]);
    setProfileUrl("");
    setCustomLabel("");
    setShareWithGuild(false);
    setStatus("Profile link added.");
    setBusyId(null);
  }

  async function changeVisibility(link: MemberSocialLink) {
    if (busyId) return;
    const nextVisible = !link.is_visible;
    setBusyId(link.id);
    setStatus("");
    setError("");
    const result = await updateMemberSocialLinkVisibility(link.id, nextVisible);
    if (!result.ok || !result.data) {
      setError(nextVisible
        ? "Current member verification is required before sharing a profile link with the guild."
        : "Profile-link visibility could not be updated.");
    } else {
      setLinks((current) => current.map((item) => item.id === link.id ? result.data as MemberSocialLink : item));
      setStatus(nextVisible ? "Profile link shared with verified guild members." : "Profile link hidden from other members.");
    }
    setBusyId(null);
  }

  async function moveLink(linkId: string, direction: -1 | 1) {
    if (busyId) return;
    const index = links.findIndex(({ id }) => id === linkId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= links.length) return;

    const ordered = [...links];
    [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
    setBusyId(linkId);
    setStatus("");
    setError("");
    setLinks(ordered.map((link, sortOrder) => ({ ...link, sort_order: sortOrder })));

    const result = await reorderMemberSocialLinks(ordered.map(({ id }) => id));
    if (!result.ok) {
      setError("Profile-link order could not be saved. The current order has been restored.");
      await loadLinks();
    } else {
      setStatus("Profile-link order saved.");
    }
    setBusyId(null);
  }

  async function removeLink(linkId: string) {
    if (busyId) return;
    setBusyId(linkId);
    setStatus("");
    setError("");
    const result = await deleteMemberSocialLink(linkId);
    if (!result.ok) {
      setError("Profile link could not be removed.");
    } else {
      setLinks((current) => current.filter(({ id }) => id !== linkId));
      setPendingRemoveId(null);
      setStatus("Profile link removed.");
    }
    setBusyId(null);
  }

  async function shareLink(link: MemberSocialLink) {
    setStatus("");
    setError("");
    const shareData = {
      title: `${link.display_label} profile`,
      text: `View this ${link.display_label} profile.`,
      url: link.profile_url,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setStatus("Profile link shared.");
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(link.profile_url);
      setStatus("Profile link copied.");
    } catch {
      setError("Copying is unavailable in this browser. Open the profile and copy its address.");
    }
  }

  return (
    <section className="glass-card glass-card--soft glass-pad auth-panel member-social-links" aria-labelledby="memberSocialLinksTitle">
      <div className="auth-panel__head">
        <div>
          <p className="kicker">Profile Links</p>
          <h2 className="section-title section-title--sm" id="memberSocialLinksTitle">Connected Profiles</h2>
        </div>
        <p className="status-pill status-pill--muted">{links.length} / {MEMBER_SOCIAL_LINK_LIMIT}</p>
      </div>

      <p>Add direct links to profiles you already manage. Links stay private unless you share them with verified guild members.</p>

      <form className="member-social-links__form" onSubmit={addLink}>
        <label className="form-field">
          <span>Profile type</span>
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value as MemberSocialLinkProvider)}
            disabled={Boolean(busyId) || links.length >= MEMBER_SOCIAL_LINK_LIMIT}
          >
            {MEMBER_SOCIAL_LINK_PROVIDERS.map((option) => (
              <option value={option.id} key={option.id}>{option.label}</option>
            ))}
          </select>
        </label>

        {provider === "custom" ? (
          <label className="form-field">
            <span>Profile label</span>
            <input
              value={customLabel}
              onChange={(event) => setCustomLabel(event.target.value)}
              maxLength={40}
              autoComplete="off"
              required
              disabled={Boolean(busyId)}
            />
          </label>
        ) : null}

        <label className="form-field">
          <span>HTTPS profile link</span>
          <input
            type="url"
            inputMode="url"
            value={profileUrl}
            onChange={(event) => setProfileUrl(event.target.value)}
            placeholder={selectedProvider.placeholder}
            maxLength={2048}
            autoComplete="url"
            required
            disabled={Boolean(busyId) || links.length >= MEMBER_SOCIAL_LINK_LIMIT}
          />
        </label>

        <label className="member-social-links__visibility">
          <input
            type="checkbox"
            checked={shareWithGuild}
            onChange={(event) => setShareWithGuild(event.target.checked)}
            disabled={Boolean(busyId) || links.length >= MEMBER_SOCIAL_LINK_LIMIT}
          />
          <span>Share with verified guild members</span>
        </label>

        <div className="auth-actions">
          <button className="hero-cta hero-cta--primary" type="submit" disabled={Boolean(busyId) || links.length >= MEMBER_SOCIAL_LINK_LIMIT}>
            {busyId === "new" ? "Adding…" : "Add profile link"}
          </button>
        </div>
      </form>

      <div className="member-social-links__list" aria-label="Saved profile links">
        {links.length ? links.map((link, index) => (
          <article className="member-social-link" key={link.id}>
            <div className="member-social-link__identity">
              <a href={link.profile_url} target="_blank" rel="noopener noreferrer nofollow ugc">
                {link.display_label || memberSocialLinkProviderLabel(link.provider as MemberSocialLinkProvider)}
              </a>
              <small>{linkHostname(link.profile_url)}</small>
              <span>{link.is_visible ? "Shared with verified guild members" : "Private"}</span>
            </div>

            <div className="member-social-link__controls" aria-label={`${link.display_label} actions`}>
              <button type="button" onClick={() => moveLink(link.id, -1)} disabled={Boolean(busyId) || index === 0} aria-label={`Move ${link.display_label} up`}>↑</button>
              <button type="button" onClick={() => moveLink(link.id, 1)} disabled={Boolean(busyId) || index === links.length - 1} aria-label={`Move ${link.display_label} down`}>↓</button>
              <button type="button" onClick={() => changeVisibility(link)} disabled={Boolean(busyId)}>
                {link.is_visible ? "Hide" : "Share with guild"}
              </button>
              <button type="button" onClick={() => shareLink(link)} disabled={Boolean(busyId)}>Share link</button>
              {pendingRemoveId === link.id ? (
                <span className="member-social-link__remove-confirm">
                  <button type="button" onClick={() => removeLink(link.id)} disabled={Boolean(busyId)}>Confirm removal</button>
                  <button type="button" onClick={() => setPendingRemoveId(null)} disabled={Boolean(busyId)}>Keep</button>
                </span>
              ) : (
                <button type="button" onClick={() => setPendingRemoveId(link.id)} disabled={Boolean(busyId)}>Remove</button>
              )}
            </div>
          </article>
        )) : (
          <WorkflowEmptyState title="No profile links saved">
            Add a direct HTTPS link when you want one available from your account.
          </WorkflowEmptyState>
        )}
      </div>

      <WorkflowNotice hidden={!status} role="status">{status}</WorkflowNotice>
      <WorkflowNotice hidden={!error} tone="danger" role="alert">{error}</WorkflowNotice>
    </section>
  );
}
