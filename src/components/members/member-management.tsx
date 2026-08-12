"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Drawer,
  Loader,
  Select,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCalendar,
  IconCrown,
  IconLock,
  IconMail,
  IconSearch,
  IconShieldCheck,
  IconTrash,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  useRemoveWorkspaceMember,
  useUpdateWorkspaceMember,
  useWorkspace,
  useWorkspaceMembers,
} from "@/hooks/use-workspaces";
import { getApiErrorMessage } from "@/services/auth.service";
import type {
  AssignableWorkspaceRole,
  WorkspaceMember,
  WorkspaceRole,
} from "@/services/workspace.service";
import { MemberAddModal } from "./member-add-modal";
import styles from "./members.module.css";

const roleOrder: Record<WorkspaceRole, number> = {
  owner: 0,
  admin: 1,
  member: 2,
  viewer: 3,
};

const roleColor: Record<WorkspaceRole, string> = {
  owner: "gray",
  admin: "gray",
  member: "gray",
  viewer: "gray",
};

const roleDetails: Record<
  WorkspaceRole,
  { title: string; summary: string; capabilities: string[] }
> = {
  owner: {
    title: "Workspace owner",
    summary: "Permanent governance identity for this workspace.",
    capabilities: [
      "Controls membership and administrator roles",
      "Manages decisions, voting, locking, and workspace settings",
      "Owns destructive workspace operations",
    ],
  },
  admin: {
    title: "Administrator",
    summary: "Facilitates decisions and manages day-to-day operations.",
    capabilities: [
      "Adds members with member or viewer access",
      "Removes members and viewers",
      "Manages voting sessions, locking, and non-owner settings",
    ],
  },
  member: {
    title: "Member",
    summary: "Contributes to the structured decision process.",
    capabilities: [
      "Creates decisions and draft proposals",
      "Raises objections, scores criteria, and votes when eligible",
      "Owns and updates assigned follow-through actions",
    ],
  },
  viewer: {
    title: "Viewer",
    summary: "Reads the workspace without changing its record.",
    capabilities: [
      "Reads decisions, results, evidence, and history",
      "Downloads available locked-decision exports",
      "Cannot create, edit, vote, or manage membership",
    ],
  },
};

const assignableRoleOptions: Array<{
  value: AssignableWorkspaceRole;
  label: string;
}> = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

function memberInitials(member: WorkspaceMember) {
  return (
    member.display_name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "FR"
  );
}

function formatJoinedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function MemberDetails({
  actorRole,
  canSeeEmail,
  currentUserId,
  member,
  onRemoved,
  workspaceId,
}: {
  actorRole: WorkspaceRole;
  canSeeEmail: boolean;
  currentUserId: string;
  member: WorkspaceMember;
  onRemoved: () => void;
  workspaceId: string;
}) {
  const updateMember = useUpdateWorkspaceMember(workspaceId);
  const removeMember = useRemoveWorkspaceMember(workspaceId);
  const isOwner = member.role === "owner";
  const isCurrentUser = member.user_id === currentUserId;
  const canChangeRole = actorRole === "owner" && !isOwner && !isCurrentUser;
  const canRemove =
    !isOwner &&
    !isCurrentUser &&
    (actorRole === "owner" ||
      (actorRole === "admin" && ["member", "viewer"].includes(member.role)));
  const details = roleDetails[member.role];

  useEffect(() => {
    updateMember.reset();
    removeMember.reset();
  }, [member.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeRole = (role: AssignableWorkspaceRole | null) => {
    if (!role || role === member.role || !canChangeRole) return;

    modals.openConfirmModal({
      title: "Change workspace role?",
      children: (
        <p className={styles.confirmCopy}>
          {member.display_name} will move from <strong>{member.role}</strong> to{" "}
          <strong>{role}</strong>. Their effective workspace access changes as
          soon as the server accepts this update.
        </p>
      ),
      labels: { confirm: "Change role", cancel: "Keep current role" },
      confirmProps: { color: "rust" },
      onConfirm: async () => {
        try {
          await updateMember.mutateAsync({
            memberUserId: member.user_id,
            payload: { role },
          });
          notifications.show({
            color: "green",
            title: "Role updated",
            message: `${member.display_name} is now a workspace ${role}.`,
          });
        } catch {
          // The inline error keeps server authority visible in the details panel.
        }
      },
    });
  };

  const confirmRemove = () => {
    if (!canRemove) return;

    modals.openConfirmModal({
      title: "Remove workspace access?",
      children: (
        <p className={styles.confirmCopy}>
          Remove <strong>{member.display_name}</strong> from this workspace?
          Their existing attributable contributions remain in the decision
          record, but they will lose workspace access immediately.
        </p>
      ),
      labels: { confirm: "Remove member", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await removeMember.mutateAsync(member.user_id);
          notifications.show({
            color: "green",
            title: "Member removed",
            message: `${member.display_name} no longer has access to this workspace.`,
          });
          onRemoved();
        } catch {
          // The inline error provides the authoritative rejection reason.
        }
      },
    });
  };

  return (
    <div className={styles.memberDetails}>
      <div className={styles.detailsIdentity}>
        <Avatar src={member.avatar_url} color="rust" size={58} radius="xl">
          {memberInitials(member)}
        </Avatar>
        <div>
          <div className={styles.detailsNameLine}>
            <h2>{member.display_name}</h2>
            {isCurrentUser && <Badge variant="light">You</Badge>}
          </div>
          <Badge color={roleColor[member.role]} variant="light" size="lg">
            {member.role}
          </Badge>
        </div>
      </div>

      <div className={styles.detailsMetadata}>
        {canSeeEmail && (
          <div>
            <IconMail size={16} aria-hidden="true" />
            <span>
              <small>ACCOUNT EMAIL</small>
              <strong>{member.email}</strong>
            </span>
          </div>
        )}
        <div>
          <IconCalendar size={16} aria-hidden="true" />
          <span>
            <small>JOINED</small>
            <strong>{formatJoinedAt(member.joined_at)}</strong>
          </span>
        </div>
      </div>

      <section className={styles.accessCard}>
        <div className={styles.accessCardHeading}>
          {isOwner ? (
            <IconCrown size={18} aria-hidden="true" />
          ) : (
            <IconShieldCheck size={18} aria-hidden="true" />
          )}
          <div>
            <strong>{details.title}</strong>
            <span>{details.summary}</span>
          </div>
        </div>
        <ul>
          {details.capabilities.map((capability) => (
            <li key={capability}>{capability}</li>
          ))}
        </ul>
      </section>

      {isOwner ? (
        <Alert
          color="gray"
          icon={<IconLock size={17} />}
          title="Owner is immutable"
        >
          The owner membership cannot be reassigned or removed by the current
          API. Ownership transfer is not part of this release.
        </Alert>
      ) : actorRole === "admin" && member.role === "admin" ? (
        <Alert
          color="gray"
          icon={<IconLock size={17} />}
          title="Administrator access is protected"
        >
          Only the workspace owner can change or remove another administrator.
        </Alert>
      ) : isCurrentUser ? (
        <Alert color="gray" icon={<IconLock size={17} />} title="Your access">
          Self-removal is not exposed because the API has no leave-workspace
          operation.
        </Alert>
      ) : null}

      {actorRole === "owner" && !isOwner && !isCurrentUser && (
        <section className={styles.managementSection}>
          <div>
            <span className={styles.kicker}>ACCESS CONTROL</span>
            <h3>Change role</h3>
            <p>Role changes take effect immediately across this workspace.</p>
          </div>
          <Select
            label="Workspace role"
            data={assignableRoleOptions}
            value={member.role}
            onChange={(value) =>
              changeRole(value as AssignableWorkspaceRole | null)
            }
            disabled={updateMember.isPending}
            allowDeselect={false}
          />
        </section>
      )}

      {(updateMember.error || removeMember.error) && (
        <Alert color="red" title="Access could not be changed">
          {getApiErrorMessage(
            updateMember.error ?? removeMember.error,
            "ForkRoom rejected this membership change. Refresh the member list and try again.",
          )}
        </Alert>
      )}

      {canRemove && (
        <section className={styles.dangerSection}>
          <div>
            <span className={styles.kicker}>REMOVE ACCESS</span>
            <h3>Remove from workspace</h3>
            <p>
              Past contributions remain attributable after access is removed.
            </p>
          </div>
          <Button
            color="red"
            variant="light"
            leftSection={<IconTrash size={16} />}
            onClick={confirmRemove}
            loading={removeMember.isPending}
          >
            Remove member
          </Button>
        </section>
      )}
    </div>
  );
}

export function MemberManagement({ workspaceId }: { workspaceId: string }) {
  const currentUser = useCurrentUser();
  const workspace = useWorkspace(workspaceId);
  const members = useWorkspaceMembers(workspaceId);
  const mobile = useMediaQuery("(max-width: 767px)");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<WorkspaceRole | "all">("all");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [addOpened, setAddOpened] = useState(false);

  const currentMember = members.data?.find(
    (member) => member.user_id === currentUser.data?.id,
  );
  const actorRole = currentMember?.role ?? "viewer";
  const canManageMembership = ["owner", "admin"].includes(actorRole);
  const canSeeEmail = canManageMembership;
  const assignableRoles: AssignableWorkspaceRole[] =
    actorRole === "owner"
      ? ["admin", "member", "viewer"]
      : ["member", "viewer"];

  const orderedMembers = useMemo(
    () =>
      [...(members.data ?? [])].sort(
        (left, right) =>
          roleOrder[left.role] - roleOrder[right.role] ||
          left.display_name.localeCompare(right.display_name),
      ),
    [members.data],
  );

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return orderedMembers.filter((member) => {
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const searchable = [
        member.display_name,
        ...(canSeeEmail ? [member.email] : []),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return (
        matchesRole &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [canSeeEmail, orderedMembers, query, roleFilter]);

  const selectedMember =
    orderedMembers.find((member) => member.user_id === selectedMemberId) ??
    orderedMembers[0];

  if (currentUser.isPending || workspace.isPending || members.isPending) {
    return (
      <div className={styles.centerState}>
        <Loader color="rust" size="sm" />
        <span>Loading workspace access…</span>
      </div>
    );
  }

  if (
    currentUser.isError ||
    workspace.isError ||
    members.isError ||
    !currentUser.data ||
    !workspace.data ||
    !members.data ||
    !currentMember
  ) {
    return (
      <div className={styles.membersPage}>
        <Alert color="red" title="Members unavailable">
          ForkRoom could not load this member directory or you no longer have
          access to the workspace.
        </Alert>
      </div>
    );
  }

  const selectMember = (memberUserId: string) => {
    setSelectedMemberId(memberUserId);
    if (mobile) setMobileDetailsOpen(true);
  };

  const clearRemovedSelection = () => {
    setSelectedMemberId("");
    setMobileDetailsOpen(false);
  };

  return (
    <div className={styles.membersPage}>
      <header className={styles.membersHeader}>
        <div>
          <span className={styles.eyebrow}>WORKSPACE ACCESS</span>
          <h1>Members</h1>
          <p>
            Review who can access {workspace.data.name} and how each role
            participates in the decision lifecycle.
          </p>
        </div>

        {canManageMembership ? (
          <Button
            color="rust"
            leftSection={<IconUserPlus size={17} />}
            onClick={() => setAddOpened(true)}
          >
            Add member
          </Button>
        ) : (
          <Tooltip label="Only the workspace owner or an administrator can add members.">
            <span>
              <Button leftSection={<IconUserPlus size={17} />} disabled>
                Add member
              </Button>
            </span>
          </Tooltip>
        )}
      </header>

      <section className={styles.memberMetrics} aria-label="Member summary">
        <div>
          <strong>{String(members.data.length).padStart(2, "0")}</strong>
          <span>TOTAL MEMBERS</span>
        </div>
        <div>
          <strong>
            {String(
              members.data.filter((member) => member.role === "admin").length,
            ).padStart(2, "0")}
          </strong>
          <span>ADMINISTRATORS</span>
        </div>
        <div>
          <strong>
            {String(
              members.data.filter((member) => member.role === "viewer").length,
            ).padStart(2, "0")}
          </strong>
          <span>VIEW-ONLY</span>
        </div>
      </section>

      {!canManageMembership && (
        <Alert
          className={styles.reducedAccessAlert}
          color="gray"
          icon={<IconShieldCheck size={18} />}
          title="Reduced member directory"
        >
          Member email addresses and access-management controls are visible only
          to workspace owners and administrators.
        </Alert>
      )}

      <div className={styles.memberGrid}>
        <section className={styles.memberListPanel}>
          <div className={styles.memberToolbar}>
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              placeholder={canSeeEmail ? "Search name or email" : "Search name"}
              aria-label="Search workspace members"
            />
            <Select
              value={roleFilter}
              onChange={(value) =>
                setRoleFilter((value ?? "all") as WorkspaceRole | "all")
              }
              data={[
                { value: "all", label: "All roles" },
                { value: "owner", label: "Owner" },
                { value: "admin", label: "Admin" },
                { value: "member", label: "Member" },
                { value: "viewer", label: "Viewer" },
              ]}
              allowDeselect={false}
              aria-label="Filter members by role"
            />
          </div>

          <div className={styles.memberListHeader}>
            <span>MEMBER</span>
            <span>ROLE</span>
          </div>

          {filteredMembers.length === 0 ? (
            <div className={styles.emptyMembers}>
              <IconUsers size={28} aria-hidden="true" />
              <strong>No matching members</strong>
              <span>Clear the search or choose another role filter.</span>
              <Button
                size="xs"
                variant="light"
                color="rust"
                onClick={() => {
                  setQuery("");
                  setRoleFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className={styles.memberRows}>
              {filteredMembers.map((member) => (
                <button
                  key={member.user_id}
                  type="button"
                  className={`${styles.memberRow} ${
                    selectedMember?.user_id === member.user_id
                      ? styles.memberRowSelected
                      : ""
                  }`}
                  onClick={() => selectMember(member.user_id)}
                  aria-pressed={selectedMember?.user_id === member.user_id}
                >
                  <Avatar
                    src={member.avatar_url}
                    color="rust"
                    size={36}
                    radius="xl"
                  >
                    {memberInitials(member)}
                  </Avatar>
                  <span className={styles.memberIdentity}>
                    <strong>
                      {member.display_name}
                      {member.user_id === currentUser.data.id ? " (you)" : ""}
                    </strong>
                    {canSeeEmail && <small>{member.email}</small>}
                  </span>
                  <Badge color={roleColor[member.role]} variant="light">
                    {member.role}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className={styles.memberDetailsPanel}>
          {selectedMember ? (
            <MemberDetails
              key={selectedMember.user_id}
              workspaceId={workspaceId}
              member={selectedMember}
              actorRole={actorRole}
              currentUserId={currentUser.data.id}
              canSeeEmail={canSeeEmail}
              onRemoved={clearRemovedSelection}
            />
          ) : (
            <div className={styles.detailsPlaceholder}>
              <IconUsers size={30} />
              <strong>Select a member</strong>
              <span>Choose a person to review their workspace access.</span>
            </div>
          )}
        </aside>
      </div>

      <Drawer
        opened={Boolean(mobile && mobileDetailsOpen && selectedMember)}
        onClose={() => setMobileDetailsOpen(false)}
        title="Member access"
        position="bottom"
        size="82dvh"
        padding="md"
        classNames={{ content: styles.memberDrawer }}
      >
        {selectedMember && (
          <MemberDetails
            key={`mobile-${selectedMember.user_id}`}
            workspaceId={workspaceId}
            member={selectedMember}
            actorRole={actorRole}
            currentUserId={currentUser.data.id}
            canSeeEmail={canSeeEmail}
            onRemoved={clearRemovedSelection}
          />
        )}
      </Drawer>

      <MemberAddModal
        workspaceId={workspaceId}
        opened={addOpened}
        assignableRoles={assignableRoles}
        onClose={() => setAddOpened(false)}
        onAdded={(memberUserId) => {
          setSelectedMemberId(memberUserId);
          if (mobile) setMobileDetailsOpen(true);
        }}
      />

      {canManageMembership && actorRole === "admin" && (
        <div className={styles.adminBoundary}>
          <IconAlertTriangle size={17} aria-hidden="true" />
          <span>
            Administrators can add members/viewers and remove those roles. Only
            the owner can create administrators or change existing roles.
          </span>
        </div>
      )}
    </div>
  );
}
