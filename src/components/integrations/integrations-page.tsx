"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Modal,
  Select,
  Skeleton,
  Switch,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconBrandSlack,
  IconCheck,
  IconExternalLink,
  IconLock,
  IconPlugConnected,
  IconRefresh,
  IconSend,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";

import { useCurrentUser } from "@/hooks/use-auth";
import {
  useAuthorizeIntegration,
  useDisconnectIntegration,
  useIntegrationDestinations,
  useIntegrationProviders,
  useIntegrationSubscriptions,
  useTestIntegration,
  useUpdateIntegrationSubscriptions,
  useWorkspaceIntegrations,
} from "@/hooks/use-integrations";
import { useWorkspaceMembers } from "@/hooks/use-workspaces";
import type {
  IntegrationConnection,
  IntegrationEventType,
  IntegrationProvider,
  IntegrationSubscription,
  IntegrationSubscriptionUpdate,
} from "@/services/integration.service";
import { getIntegrationErrorMessage } from "@/services/integration.service";

import styles from "./integrations.module.css";

const eventDefinitions: Array<{
  eventType: IntegrationEventType;
  label: string;
  description: string;
}> = [
  {
    eventType: "decision_activated",
    label: "Decision activated",
    description: "Notify the channel when deliberation begins.",
  },
  {
    eventType: "voting_opened",
    label: "Voting opened",
    description: "Let participants know that a ballot is ready.",
  },
  {
    eventType: "voting_closed",
    label: "Voting closed",
    description: "Share that voting ended and results are available.",
  },
  {
    eventType: "decision_locked",
    label: "Decision locked",
    description: "Publish the final immutable decision milestone.",
  },
];

const callbackErrors: Record<string, string> = {
  access_denied: "Slack authorization was cancelled. Nothing was connected.",
  oauth_failed:
    "Slack did not complete authorization. Start the connection again.",
  provider_failed:
    "Slack could not verify the installation. Check the app scopes and try again.",
  permission_denied:
    "Your workspace role no longer allows integration changes.",
  configuration_error:
    "The Slack integration is not fully configured on the ForkRoom server.",
  invalid_state:
    "The connection request expired or was already used. Start a fresh connection.",
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function providerIcon(provider: string) {
  return provider === "slack" ? IconBrandSlack : IconPlugConnected;
}

function statusColor(status: IntegrationConnection["status"]) {
  if (status === "active") return "green";
  if (status === "pending") return "orange";
  return "red";
}

function initialEventState(subscriptions: IntegrationSubscription[]) {
  return Object.fromEntries(
    eventDefinitions.map(({ eventType }) => [
      eventType,
      subscriptions.find((item) => item.event_type === eventType)?.enabled ??
        false,
    ]),
  ) as Record<IntegrationEventType, boolean>;
}

export function IntegrationsPage({ workspaceId }: { workspaceId: string }) {
  const providers = useIntegrationProviders();
  const connections = useWorkspaceIntegrations(workspaceId);
  const currentUser = useCurrentUser();
  const members = useWorkspaceMembers(workspaceId);
  const authorize = useAuthorizeIntegration(workspaceId);
  const refetchConnections = connections.refetch;

  const membership = members.data?.find(
    (item) => item.user_id === currentUser.data?.id,
  );
  const canManage = ["owner", "admin"].includes(membership?.role ?? "viewer");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const connected = query.get("connected");
    const callbackError = query.get("integration_error");
    if (!connected && !callbackError) return;

    if (connected) {
      notifications.show({
        color: "green",
        title: `${connected === "slack" ? "Slack" : connected} connected`,
        message: "Choose a destination and the ForkRoom events to publish.",
      });
      void refetchConnections();
    } else if (callbackError) {
      notifications.show({
        color: "red",
        title: "Integration was not connected",
        message:
          callbackErrors[callbackError] ??
          "The provider did not complete the connection.",
      });
    }

    query.delete("connected");
    query.delete("integration_error");
    const nextQuery = query.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`,
    );
  }, [refetchConnections]);

  const startAuthorization = async (provider: IntegrationProvider) => {
    try {
      const result = await authorize.mutateAsync(provider.provider);
      window.location.assign(result.authorization_url);
    } catch (error) {
      notifications.show({
        color: "red",
        title: `Could not connect ${provider.name}`,
        message: getIntegrationErrorMessage(
          error,
          "ForkRoom could not start the provider authorization flow.",
        ),
      });
    }
  };

  if (
    providers.isPending ||
    connections.isPending ||
    currentUser.isPending ||
    members.isPending
  ) {
    return <IntegrationsSkeleton />;
  }

  const loadError =
    providers.error ?? connections.error ?? currentUser.error ?? members.error;
  if (loadError || !providers.data || !connections.data || !currentUser.data) {
    return (
      <Alert color="red" title="Integrations are unavailable">
        {getIntegrationErrorMessage(
          loadError,
          "ForkRoom could not load providers or workspace connections.",
        )}
        <Button
          mt="sm"
          size="compact-sm"
          variant="default"
          leftSection={<IconRefresh size={15} />}
          onClick={() =>
            void Promise.all([
              providers.refetch(),
              connections.refetch(),
              currentUser.refetch(),
              members.refetch(),
            ])
          }
        >
          Retry
        </Button>
      </Alert>
    );
  }

  const visibleConnections = connections.data.filter(
    (connection) => connection.status !== "revoked",
  );

  return (
    <div className={styles.integrationStack}>
      {!canManage && (
        <section className={styles.permissionNotice}>
          <IconLock size={20} aria-hidden="true" />
          <div>
            <strong>Read-only integration access</strong>
            <p>
              You can review connected providers and notification rules. Only
              workspace owners and administrators can connect or reconfigure
              them.
            </p>
          </div>
        </section>
      )}

      <section className={styles.section} aria-labelledby="provider-heading">
        <div className={styles.sectionHeading}>
          <div>
            <span>PROVIDER CATALOG</span>
            <h2 id="provider-heading">Available connections</h2>
          </div>
          <p>
            Provider credentials stay on the ForkRoom server. The browser never
            receives Slack tokens or secrets.
          </p>
        </div>

        <div className={styles.providerList}>
          {providers.data.map((provider) => {
            const ProviderIcon = providerIcon(provider.provider);
            const activeCount = visibleConnections.filter(
              (connection) =>
                connection.provider === provider.provider &&
                connection.status === "active",
            ).length;
            const connectDisabled = !canManage || !provider.available;
            const connectReason = !provider.available
              ? `${provider.name} is not fully configured on the ForkRoom server.`
              : !canManage
                ? "Only a workspace owner or administrator can connect a provider."
                : null;

            return (
              <article className={styles.providerRow} key={provider.provider}>
                <div className={styles.providerIdentity}>
                  <span className={styles.providerIcon}>
                    <ProviderIcon size={24} aria-hidden="true" />
                  </span>
                  <div>
                    <div className={styles.providerTitle}>
                      <h3>{provider.name}</h3>
                      <Badge
                        variant="light"
                        color={
                          activeCount > 0
                            ? "green"
                            : provider.available
                              ? "gray"
                              : "orange"
                        }
                      >
                        {activeCount > 0
                          ? `${activeCount} connected`
                          : provider.available
                            ? "Available"
                            : "Unavailable"}
                      </Badge>
                    </div>
                    <p>{provider.description}</p>
                    <div className={styles.capabilities}>
                      {provider.capabilities.map((capability) => (
                        <span key={capability}>
                          {capability.replaceAll("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <Tooltip
                  label={connectReason}
                  disabled={!connectReason}
                  withArrow
                >
                  <span>
                    <Button
                      variant={activeCount > 0 ? "default" : "filled"}
                      color={activeCount > 0 ? "dark" : "orange"}
                      leftSection={<IconExternalLink size={16} />}
                      disabled={connectDisabled}
                      loading={
                        authorize.isPending &&
                        authorize.variables === provider.provider
                      }
                      onClick={() => void startAuthorization(provider)}
                    >
                      {activeCount > 0
                        ? `Connect another ${provider.name}`
                        : `Connect ${provider.name}`}
                    </Button>
                  </span>
                </Tooltip>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="connection-heading">
        <div className={styles.sectionHeading}>
          <div>
            <span>WORKSPACE CONNECTIONS</span>
            <h2 id="connection-heading">Connected accounts</h2>
          </div>
          <p>
            Choose where ForkRoom posts milestone notifications and which
            decision events trigger them.
          </p>
        </div>

        {visibleConnections.length === 0 ? (
          <div className={styles.emptyState}>
            <IconPlugConnected size={30} aria-hidden="true" />
            <strong>No provider is connected</strong>
            <p>
              Connect Slack above to publish decision lifecycle updates to a
              workspace channel.
            </p>
          </div>
        ) : (
          <div className={styles.connectionList}>
            {visibleConnections.map((connection) => (
              <ConnectionPanel
                canManage={canManage}
                connection={connection}
                key={connection.id}
                workspaceId={workspaceId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ConnectionPanel({
  workspaceId,
  connection,
  canManage,
}: {
  workspaceId: string;
  connection: IntegrationConnection;
  canManage: boolean;
}) {
  const active = connection.status === "active";
  const destinations = useIntegrationDestinations(
    workspaceId,
    connection.id,
    canManage && active,
  );
  const subscriptions = useIntegrationSubscriptions(workspaceId, connection.id);
  const updateSubscriptions = useUpdateIntegrationSubscriptions(
    workspaceId,
    connection.id,
  );
  const sendTest = useTestIntegration(workspaceId, connection.id);
  const disconnect = useDisconnectIntegration(workspaceId, connection.id);
  const [disconnectOpened, setDisconnectOpened] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState("");
  const [enabledEvents, setEnabledEvents] = useState<
    Record<IntegrationEventType, boolean>
  >(() => initialEventState([]));
  const [dirty, setDirty] = useState(false);

  const destinationById = useMemo(
    () => new Map((destinations.data ?? []).map((item) => [item.id, item])),
    [destinations.data],
  );

  useEffect(() => {
    if (!subscriptions.data || dirty) return;
    setEnabledEvents(initialEventState(subscriptions.data));
    setSelectedDestinationId(
      subscriptions.data.find((item) => item.destination_id)?.destination_id ??
        "",
    );
  }, [dirty, subscriptions.data]);

  const actionError =
    updateSubscriptions.error ?? sendTest.error ?? disconnect.error;
  const anyEventEnabled = eventDefinitions.some(
    ({ eventType }) => enabledEvents[eventType],
  );
  const selectionMissing = anyEventEnabled && !selectedDestinationId;
  const destinationOptions = (destinations.data ?? []).map((destination) => ({
    value: destination.id,
    label: `${destination.type === "private_channel" ? "Private · " : "#"}${destination.name}`,
  }));

  const saveConfiguration = async () => {
    if (selectionMissing) return;
    const destination = destinationById.get(selectedDestinationId);
    const payload: IntegrationSubscriptionUpdate[] = eventDefinitions.map(
      ({ eventType }) => ({
        event_type: eventType,
        enabled: enabledEvents[eventType],
        destination_id: enabledEvents[eventType]
          ? selectedDestinationId || null
          : null,
        destination_name: enabledEvents[eventType]
          ? (destination?.name ?? null)
          : null,
        configuration: {},
      }),
    );

    try {
      await updateSubscriptions.mutateAsync(payload);
      setDirty(false);
      notifications.show({
        color: "green",
        title: "Slack notifications saved",
        message: anyEventEnabled
          ? `ForkRoom will publish selected events to ${destination ? `#${destination.name}` : "the chosen channel"}.`
          : "All Slack event notifications are disabled.",
      });
    } catch {
      // The contextual error remains visible without discarding the selections.
    }
  };

  const sendTestMessage = async () => {
    try {
      await sendTest.mutateAsync(selectedDestinationId || null);
      const destination = destinationById.get(selectedDestinationId);
      notifications.show({
        color: "green",
        title: "Test message sent",
        message: destination
          ? `Check #${destination.name} in Slack.`
          : "Check the configured Slack channel.",
      });
    } catch {
      // The contextual error is rendered below the account header.
    }
  };

  const confirmDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      setDisconnectOpened(false);
      notifications.show({
        color: "green",
        title: "Slack disconnected",
        message: `${connection.external_account_name} will no longer receive ForkRoom events.`,
      });
    } catch {
      // Keep the confirmation open so the user can retry or cancel.
    }
  };

  const resetConfiguration = () => {
    const current = subscriptions.data ?? [];
    setEnabledEvents(initialEventState(current));
    setSelectedDestinationId(
      current.find((item) => item.destination_id)?.destination_id ?? "",
    );
    setDirty(false);
    updateSubscriptions.reset();
    sendTest.reset();
  };

  const ProviderIcon = providerIcon(connection.provider);

  return (
    <article className={styles.connectionCard}>
      <header className={styles.connectionHeader}>
        <div className={styles.connectionIdentity}>
          <span className={styles.providerIcon}>
            <ProviderIcon size={24} aria-hidden="true" />
          </span>
          <div>
            <div className={styles.connectionTitle}>
              <h3>{connection.external_account_name}</h3>
              <Badge variant="light" color={statusColor(connection.status)}>
                {connection.status}
              </Badge>
            </div>
            <p>
              {connection.provider === "slack" ? "Slack workspace" : "Account"}
              {" · "}
              Connected {formatDateTime(connection.created_at)}
            </p>
          </div>
        </div>

        {canManage && (
          <Button
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={() => setDisconnectOpened(true)}
          >
            Disconnect
          </Button>
        )}
      </header>

      {!active && (
        <Alert
          className={styles.connectionAlert}
          color="orange"
          icon={<IconAlertTriangle size={18} />}
          title="This connection needs attention"
        >
          {connection.last_error ||
            "ForkRoom cannot send notifications while this connection is not active. Reconnect the provider to refresh access."}
        </Alert>
      )}

      {actionError && (
        <Alert
          className={styles.connectionAlert}
          color="red"
          title="The integration action did not complete"
        >
          {getIntegrationErrorMessage(
            actionError,
            "ForkRoom could not update this provider connection.",
          )}
        </Alert>
      )}

      {subscriptions.isPending ? (
        <div className={styles.innerSkeleton}>
          <Skeleton height={54} />
          <Skeleton height={70} />
          <Skeleton height={70} />
        </div>
      ) : subscriptions.isError ? (
        <Alert
          className={styles.connectionAlert}
          color="red"
          title="Notification rules are unavailable"
        >
          {getIntegrationErrorMessage(
            subscriptions.error,
            "ForkRoom could not load this connection's subscriptions.",
          )}
          <Button
            mt="sm"
            size="compact-sm"
            variant="default"
            leftSection={<IconRefresh size={15} />}
            onClick={() => void subscriptions.refetch()}
          >
            Retry
          </Button>
        </Alert>
      ) : (
        <div className={styles.configurationGrid}>
          <section
            className={styles.destinationPanel}
            aria-labelledby={`destination-${connection.id}`}
          >
            <div className={styles.panelTitle}>
              <IconSettings size={18} aria-hidden="true" />
              <div>
                <h4 id={`destination-${connection.id}`}>Destination</h4>
                <p>One Slack channel receives the selected milestone events.</p>
              </div>
            </div>

            {canManage ? (
              destinations.isPending ? (
                <Skeleton height={42} />
              ) : destinations.isError ? (
                <Alert color="red" title="Slack channels are unavailable">
                  {getIntegrationErrorMessage(
                    destinations.error,
                    "ForkRoom could not read channels from Slack. Check the app scopes and channel access.",
                  )}
                  <Button
                    mt="sm"
                    size="compact-sm"
                    variant="default"
                    leftSection={<IconRefresh size={15} />}
                    onClick={() => void destinations.refetch()}
                  >
                    Retry
                  </Button>
                </Alert>
              ) : (
                <Select
                  aria-label="Slack destination channel"
                  data={destinationOptions}
                  disabled={!active}
                  label="Slack channel"
                  nothingFoundMessage="No accessible channels found"
                  placeholder="Select a channel"
                  searchable
                  value={selectedDestinationId}
                  onChange={(value) => {
                    setSelectedDestinationId(value ?? "");
                    setDirty(true);
                    updateSubscriptions.reset();
                    sendTest.reset();
                  }}
                />
              )
            ) : (
              <ReadOnlyDestination subscriptions={subscriptions.data ?? []} />
            )}

            {canManage && active && (
              <Tooltip
                label="Select a Slack channel before sending a test."
                disabled={Boolean(selectedDestinationId)}
                withArrow
              >
                <span className={styles.fullWidthAction}>
                  <Button
                    fullWidth
                    variant="default"
                    leftSection={<IconSend size={16} />}
                    disabled={!selectedDestinationId}
                    loading={sendTest.isPending}
                    onClick={() => void sendTestMessage()}
                  >
                    Send test message
                  </Button>
                </span>
              </Tooltip>
            )}

            <dl className={styles.connectionMetadata}>
              <div>
                <dt>External account</dt>
                <dd>{connection.external_account_id}</dd>
              </div>
              <div>
                <dt>Last verified</dt>
                <dd>
                  {formatDateTime(
                    connection.last_synced_at ?? connection.updated_at,
                  )}
                </dd>
              </div>
              <div>
                <dt>Granted scopes</dt>
                <dd>{connection.scopes.join(", ") || "Not reported"}</dd>
              </div>
            </dl>
          </section>

          <section
            className={styles.eventsPanel}
            aria-labelledby={`events-${connection.id}`}
          >
            <div className={styles.panelTitle}>
              <IconCheck size={18} aria-hidden="true" />
              <div>
                <h4 id={`events-${connection.id}`}>Published events</h4>
                <p>Keep Slack focused on meaningful lifecycle changes.</p>
              </div>
            </div>

            <div className={styles.eventList}>
              {eventDefinitions.map((event) => (
                <div className={styles.eventRow} key={event.eventType}>
                  <div>
                    <strong>{event.label}</strong>
                    <span>{event.description}</span>
                  </div>
                  <Switch
                    aria-label={event.label}
                    checked={enabledEvents[event.eventType]}
                    disabled={!canManage || !active}
                    onChange={(change) => {
                      const checked = change.currentTarget.checked;
                      setEnabledEvents((current) => ({
                        ...current,
                        [event.eventType]: checked,
                      }));
                      setDirty(true);
                      updateSubscriptions.reset();
                    }}
                  />
                </div>
              ))}
            </div>

            {canManage && (
              <div className={styles.saveArea}>
                {selectionMissing && (
                  <p className={styles.validationMessage}>
                    Select a Slack channel before enabling notifications.
                  </p>
                )}
                <Button
                  variant="default"
                  disabled={!dirty}
                  onClick={resetConfiguration}
                >
                  Cancel changes
                </Button>
                <Tooltip
                  label="Choose a destination before saving enabled events."
                  disabled={!selectionMissing}
                  withArrow
                >
                  <span>
                    <Button
                      color="orange"
                      leftSection={<IconCheck size={16} />}
                      disabled={!dirty || selectionMissing || !active}
                      loading={updateSubscriptions.isPending}
                      onClick={() => void saveConfiguration()}
                    >
                      Save configuration
                    </Button>
                  </span>
                </Tooltip>
              </div>
            )}
          </section>
        </div>
      )}

      <Modal
        centered
        opened={disconnectOpened}
        title={`Disconnect ${connection.external_account_name}?`}
        onClose={() => {
          if (!disconnect.isPending) setDisconnectOpened(false);
        }}
      >
        <div className={styles.disconnectBody}>
          <p>
            ForkRoom will revoke the provider token and stop all workspace
            notifications for this connection. Existing Slack messages are not
            removed.
          </p>
          {disconnect.error && (
            <Alert color="red">
              {getIntegrationErrorMessage(
                disconnect.error,
                "ForkRoom could not disconnect this account.",
              )}
            </Alert>
          )}
          <div className={styles.modalActions}>
            <Button
              variant="default"
              disabled={disconnect.isPending}
              onClick={() => setDisconnectOpened(false)}
            >
              Keep connected
            </Button>
            <Button
              color="red"
              leftSection={<IconTrash size={16} />}
              loading={disconnect.isPending}
              onClick={() => void confirmDisconnect()}
            >
              Disconnect
            </Button>
          </div>
        </div>
      </Modal>
    </article>
  );
}

function ReadOnlyDestination({
  subscriptions,
}: {
  subscriptions: IntegrationSubscription[];
}) {
  const destination = subscriptions.find(
    (subscription) => subscription.enabled && subscription.destination_name,
  );

  return (
    <div className={styles.readOnlyValue}>
      <span>Slack channel</span>
      <strong>
        {destination?.destination_name
          ? `#${destination.destination_name}`
          : "No destination configured"}
      </strong>
    </div>
  );
}

function IntegrationsSkeleton() {
  return (
    <div className={styles.integrationStack} aria-label="Loading integrations">
      <Skeleton height={118} />
      <Skeleton height={330} />
    </div>
  );
}
