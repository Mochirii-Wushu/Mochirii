const PENDING_BASE_ROLE_ID = "1468659807736299520";
const VERIFIED_ROLE_ID = "1078630751077142615";
const MODERATOR_ROLE_ID = "1078630751165222984";
const PENDING_ALLOWED_CATEGORY_ID = "1468658801388290048";
const VIEW_CHANNEL_PERMISSION = 1n << 10n;
const OTHER_PERMISSION = 1n << 11n;

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function hasPermission(value, bit) {
  return (value & bit) === bit;
}

function isPendingTarget(member) {
  if (member.user?.bot === true) return false;
  const roles = Array.isArray(member.roles) ? member.roles : [];
  if (roles.includes(VERIFIED_ROLE_ID)) return false;
  if (roles.includes(MODERATOR_ROLE_ID)) return false;
  return roles.length === 1 && roles[0] === PENDING_BASE_ROLE_ID;
}

function activeManagedOwned(record, side) {
  if (!record) return false;
  const value = side === "allow" ? record.ownedAllow : record.ownedDeny;
  return hasPermission(value, VIEW_CHANNEL_PERMISSION);
}

function desiredChange(action, overwrite, record = null) {
  const currentAllow = overwrite?.allow || 0n;
  const currentDeny = overwrite?.deny || 0n;
  const ownedAllow = activeManagedOwned(record, "allow");
  const ownedDeny = activeManagedOwned(record, "deny");
  const manualAllow = hasPermission(currentAllow, VIEW_CHANNEL_PERMISSION) && !ownedAllow;
  const manualDeny = hasPermission(currentDeny, VIEW_CHANNEL_PERMISSION) && !ownedDeny;

  if (action === "allow" && manualDeny) {
    return { conflict: "manual member deny inside allowed tree" };
  }

  if (action === "deny" && manualAllow) {
    return { conflict: "manual member allow outside allowed tree" };
  }

  let nextAllow = currentAllow;
  let nextDeny = currentDeny;
  let nextOwnedAllow = 0n;
  let nextOwnedDeny = 0n;

  if (action === "allow") {
    if (!hasPermission(currentAllow, VIEW_CHANNEL_PERMISSION)) {
      nextAllow |= VIEW_CHANNEL_PERMISSION;
      nextOwnedAllow = VIEW_CHANNEL_PERMISSION;
    } else if (ownedAllow) {
      nextOwnedAllow = VIEW_CHANNEL_PERMISSION;
    }
    if (ownedDeny) nextDeny &= ~VIEW_CHANNEL_PERMISSION;
  } else if (action === "deny") {
    if (!hasPermission(currentDeny, VIEW_CHANNEL_PERMISSION)) {
      nextDeny |= VIEW_CHANNEL_PERMISSION;
      nextOwnedDeny = VIEW_CHANNEL_PERMISSION;
    } else if (ownedDeny) {
      nextOwnedDeny = VIEW_CHANNEL_PERMISSION;
    }
    if (ownedAllow) nextAllow &= ~VIEW_CHANNEL_PERMISSION;
  } else {
    if (ownedAllow) nextAllow &= ~VIEW_CHANNEL_PERMISSION;
    if (ownedDeny) nextDeny &= ~VIEW_CHANNEL_PERMISSION;
  }

  return {
    currentAllow,
    currentDeny,
    nextAllow,
    nextDeny,
    nextOwnedAllow,
    nextOwnedDeny,
    shouldDeleteOverwrite: nextAllow === 0n && nextDeny === 0n,
  };
}

function buildPlan(member, channels, managedRecords = new Map()) {
  if (!isPendingTarget(member)) {
    return {
      actions: channels
        .filter((channel) => managedRecords.has(channel.id))
        .map((channel) => ({
          channelId: channel.id,
          action: "clear",
          result: desiredChange("clear", channel.overwrite || null, managedRecords.get(channel.id)),
        })),
    };
  }

  const actions = [];
  for (const channel of channels) {
    const action = channel.id === PENDING_ALLOWED_CATEGORY_ID || channel.parentId === PENDING_ALLOWED_CATEGORY_ID
      ? "allow"
      : "deny";
    const record = managedRecords.get(channel.id) || null;
    const result = desiredChange(action, channel.overwrite || null, record);
    const visible = channel.visible === true;
    const visibilityNeedsChange = action === "allow" ? !visible : visible;
    const hasManagedViewBit = activeManagedOwned(record, "allow") || activeManagedOwned(record, "deny");
    if (result.conflict || visibilityNeedsChange || hasManagedViewBit) {
      actions.push({
        channelId: channel.id,
        action,
        result,
      });
    }
  }

  return { actions };
}

const wwmOnly = { roles: [PENDING_BASE_ROLE_ID], user: { bot: false } };
const verified = { roles: [PENDING_BASE_ROLE_ID, VERIFIED_ROLE_ID], user: { bot: false } };
const extraRole = { roles: [PENDING_BASE_ROLE_ID, "222222222222222222"], user: { bot: false } };
const botMember = { roles: [PENDING_BASE_ROLE_ID], user: { bot: true } };

assert(isPendingTarget(wwmOnly), "WWM-only member should match pending-verification target.");
assert(!isPendingTarget(verified), "Verified member should not match pending-verification target.");
assert(!isPendingTarget(extraRole), "Member with extra roles should not match pending-verification target.");
assert(!isPendingTarget(botMember), "Bot users should not match pending-verification target.");

const channels = [
  { id: PENDING_ALLOWED_CATEGORY_ID, visible: true },
  { id: "1468658801388290049", parentId: PENDING_ALLOWED_CATEGORY_ID, visible: false },
  { id: "1078630751077142610", visible: true },
  { id: "1078630751077142611", visible: false },
];
const targetPlan = buildPlan(wwmOnly, channels);
assert(targetPlan.actions.length === 2, "Planner should write only visibility-changing pending-member overwrites.");
assert(targetPlan.actions[0]?.channelId === "1468658801388290049", "Hidden allowed child should receive the first planned change.");
assert(targetPlan.actions[0]?.action === "allow", "Hidden allowed child should receive a member-specific VIEW_CHANNEL allow.");
assert(hasPermission(targetPlan.actions[0]?.result.nextAllow || 0n, VIEW_CHANNEL_PERMISSION), "Allowed category allow bit should be planned.");
assert(targetPlan.actions[1]?.channelId === "1078630751077142610", "Visible outside channel should receive the second planned change.");
assert(targetPlan.actions[1]?.action === "deny", "Visible outside channels should receive a member-specific VIEW_CHANNEL deny.");
assert(hasPermission(targetPlan.actions[1]?.result.nextDeny || 0n, VIEW_CHANNEL_PERMISSION), "Outside channel deny bit should be planned.");

const cleanupRecords = new Map([
  [PENDING_ALLOWED_CATEGORY_ID, { ownedAllow: VIEW_CHANNEL_PERMISSION, ownedDeny: 0n }],
]);
const verifiedPlan = buildPlan(verified, [
  { id: PENDING_ALLOWED_CATEGORY_ID, overwrite: { allow: VIEW_CHANNEL_PERMISSION, deny: 0n } },
], cleanupRecords);
assert(verifiedPlan.actions[0]?.action === "clear", "Verified members should have Reaper-owned overwrites cleared.");
assert(verifiedPlan.actions[0]?.result.shouldDeleteOverwrite, "Empty Reaper-owned cleanup should delete the member overwrite.");

const preserved = desiredChange(
  "deny",
  { allow: OTHER_PERMISSION, deny: OTHER_PERMISSION },
  null,
);
assert(hasPermission(preserved.nextAllow, OTHER_PERMISSION), "Manual unrelated allow bits should be preserved.");
assert(hasPermission(preserved.nextDeny, OTHER_PERMISSION), "Manual unrelated deny bits should be preserved.");
assert(hasPermission(preserved.nextDeny, VIEW_CHANNEL_PERMISSION), "Reaper should add VIEW_CHANNEL deny outside allowed tree.");

const outsideManualAllow = desiredChange("deny", { allow: VIEW_CHANNEL_PERMISSION, deny: 0n }, null);
assert(outsideManualAllow.conflict === "manual member allow outside allowed tree", "Manual VIEW_CHANNEL allow outside tree should block apply.");

const hiddenManualOutsidePlan = buildPlan(wwmOnly, [
  { id: "1078630751077142612", visible: false, overwrite: { allow: VIEW_CHANNEL_PERMISSION, deny: 0n } },
]);
assert(hiddenManualOutsidePlan.actions[0]?.result.conflict === "manual member allow outside allowed tree", "Hidden manual VIEW_CHANNEL allow outside tree should still block apply.");

const insideManualDeny = desiredChange("allow", { allow: 0n, deny: VIEW_CHANNEL_PERMISSION }, null);
assert(insideManualDeny.conflict === "manual member deny inside allowed tree", "Manual VIEW_CHANNEL deny inside tree should block apply.");

const cleanupWithManualBits = desiredChange(
  "clear",
  { allow: VIEW_CHANNEL_PERMISSION | OTHER_PERMISSION, deny: OTHER_PERMISSION },
  { ownedAllow: VIEW_CHANNEL_PERMISSION, ownedDeny: 0n },
);
assert(!hasPermission(cleanupWithManualBits.nextAllow, VIEW_CHANNEL_PERMISSION), "Cleanup should remove Reaper-owned VIEW_CHANNEL allow.");
assert(hasPermission(cleanupWithManualBits.nextAllow, OTHER_PERMISSION), "Cleanup should preserve manual allow bits.");
assert(hasPermission(cleanupWithManualBits.nextDeny, OTHER_PERMISSION), "Cleanup should preserve manual deny bits.");
assert(!cleanupWithManualBits.shouldDeleteOverwrite, "Cleanup should not delete overwrites with remaining manual bits.");

if (failures.length) {
  console.error("Reaper pending verification validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Reaper pending verification validation OK.");
