'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Menu,
  Select,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCalendarDue,
  IconCheck,
  IconDots,
  IconEdit,
  IconPlayerPlay,
  IconPlus,
} from '@tabler/icons-react';

import {
  useDecisionActions,
  useTransitionDecisionAction,
} from '@/hooks/use-workspaces';
import { getApiErrorMessage } from '@/services/auth.service';
import type {
  ActionStatus,
  DecisionAction,
  WorkspaceMember,
} from '@/services/workspace.service';

import { ActionItemModal } from './action-item-modal';
import styles from './decision-room.module.css';

type DecisionActionsPanelProps = {
  workspaceId: string;
  decisionId: string;
  members: WorkspaceMember[];
  currentUserId: string;
  canCreateActions: boolean;
  canManageActions: boolean;
};

const activeStatuses: ActionStatus[] = ['todo', 'in_progress', 'blocked'];

const statusLabel: Record<ActionStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  blocked: 'Blocked',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusColor: Record<ActionStatus, string> = {
  todo: 'gray',
  in_progress: 'blue',
  blocked: 'orange',
  completed: 'green',
  cancelled: 'gray',
};

const transitionTargets: Record<ActionStatus, ActionStatus[]> = {
  todo: ['in_progress', 'blocked', 'completed', 'cancelled'],
  in_progress: ['todo', 'blocked', 'completed', 'cancelled'],
  blocked: ['todo', 'in_progress', 'completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export function DecisionActionsPanel({
  workspaceId,
  decisionId,
  members,
  currentUserId,
  canCreateActions,
  canManageActions,
}: DecisionActionsPanelProps) {
  const actions = useDecisionActions(workspaceId, decisionId);
  const transitionAction = useTransitionDecisionAction(workspaceId, decisionId);
  const [statusFilter, setStatusFilter] = useState('active');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [editorAction, setEditorAction] = useState<DecisionAction | null | undefined>();
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member])),
    [members],
  );
  const [referenceTime] = useState(() => Date.now());
  const actionItems = actions.data ?? [];
  const isOverdue = (action: DecisionAction) =>
    Boolean(
      action.due_at &&
        activeStatuses.includes(action.status) &&
        new Date(action.due_at).getTime() < referenceTime,
    );
  const filteredActions = actionItems
    .filter((action) =>
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
          ? activeStatuses.includes(action.status)
          : action.status === statusFilter,
    )
    .filter((action) =>
      assigneeFilter === 'all' ? true : action.assignee_id === assigneeFilter,
    )
    .sort((left, right) => {
      if (isOverdue(left) !== isOverdue(right)) return isOverdue(left) ? -1 : 1;
      if (!left.due_at) return 1;
      if (!right.due_at) return -1;
      return new Date(left.due_at).getTime() - new Date(right.due_at).getTime();
    });
  const overdueCount = actionItems.filter(isOverdue).length;
  const blockedCount = actionItems.filter((action) => action.status === 'blocked').length;
  const completedCount = actionItems.filter(
    (action) => action.status === 'completed',
  ).length;

  const changeStatus = (action: DecisionAction, status: ActionStatus) => {
    const execute = async () => {
      try {
        await transitionAction.mutateAsync({
          actionId: action.id,
          payload: { status },
        });
        notifications.show({
          color: status === 'completed' ? 'green' : 'blue',
          title: 'Action status updated',
          message: `${action.title} is now ${statusLabel[status].toLowerCase()}.`,
        });
      } catch {
        // The panel exposes the backend error.
      }
    };

    if (status === 'completed' || status === 'cancelled') {
      modals.openConfirmModal({
        title: status === 'completed' ? 'Complete this action?' : 'Cancel this action?',
        children: (
          <p className={styles.confirmCopy}>
            {status === 'completed'
              ? 'The completion time will be recorded in the decision history.'
              : 'The action remains visible for traceability and cannot be treated as completed.'}
          </p>
        ),
        labels: {
          confirm: status === 'completed' ? 'Mark completed' : 'Cancel action',
          cancel: 'Keep current status',
        },
        confirmProps: { color: status === 'completed' ? 'green' : 'red' },
        onConfirm: execute,
      });
      return;
    }

    void execute();
  };

  if (actions.isPending) {
    return (
      <div className={styles.followThroughState}>
        <Loader color="rust" size="xs" /> Loading implementation actions…
      </div>
    );
  }

  if (actions.isError) {
    return (
      <Alert color="red" title="Actions could not be loaded">
        {getApiErrorMessage(
          actions.error,
          'ForkRoom could not load follow-through actions.',
        )}
      </Alert>
    );
  }

  return (
    <section className={styles.followThroughPanel}>
      <div className={styles.followThroughHeading}>
        <div>
          <div className={styles.sectionIndex}>01 / IMPLEMENTATION</div>
          <h2>Owned action items</h2>
          <p>
            Track the work required to carry the locked outcome into practice.
          </p>
        </div>
        {canCreateActions && (
          <Button
            color="rust"
            leftSection={<IconPlus size={16} />}
            onClick={() => setEditorAction(null)}
          >
            Add action
          </Button>
        )}
      </div>

      <div className={styles.followThroughMetrics}>
        <div className={overdueCount > 0 ? styles.metricAttention : undefined}>
          <span>OVERDUE</span>
          <strong>{overdueCount}</strong>
        </div>
        <div>
          <span>BLOCKED</span>
          <strong>{blockedCount}</strong>
        </div>
        <div>
          <span>COMPLETED</span>
          <strong>{completedCount}</strong>
        </div>
      </div>

      <div className={styles.followThroughFilters}>
        <Select
          label="Status"
          data={[
            { value: 'active', label: 'Active' },
            { value: 'all', label: 'All statuses' },
            ...Object.entries(statusLabel).map(([value, label]) => ({ value, label })),
          ]}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value ?? 'active')}
          allowDeselect={false}
        />
        <Select
          label="Assignee"
          data={[
            { value: 'all', label: 'All assignees' },
            ...members.map((member) => ({
              value: member.user_id,
              label: member.display_name ?? member.email,
            })),
          ]}
          value={assigneeFilter}
          onChange={(value) => setAssigneeFilter(value ?? 'all')}
          searchable
          allowDeselect={false}
        />
      </div>

      {transitionAction.error && (
        <Alert color="red" title="Action status was not changed">
          {getApiErrorMessage(
            transitionAction.error,
            'ForkRoom rejected this action transition.',
          )}
        </Alert>
      )}

      {filteredActions.length === 0 ? (
        <div className={styles.followThroughEmpty}>
          <IconCheck size={24} />
          <strong>{actionItems.length === 0 ? 'No action items yet' : 'No matching actions'}</strong>
          <p>
            {actionItems.length === 0
              ? 'Add the first owned task required to implement this decision.'
              : 'Change the status or assignee filters to see other actions.'}
          </p>
        </div>
      ) : (
        <div className={styles.actionList}>
          {filteredActions.map((action) => {
            const assignee = memberById.get(action.assignee_id);
            const canTransition =
              canManageActions || action.assignee_id === currentUserId;
            const overdue = isOverdue(action);

            return (
              <article key={action.id} className={styles.actionRow}>
                <div className={styles.actionIdentity}>
                  <Group gap="xs">
                    <Badge color={statusColor[action.status]} variant="light">
                      {statusLabel[action.status]}
                    </Badge>
                    {overdue && (
                      <Badge color="red" variant="light">
                        Overdue
                      </Badge>
                    )}
                  </Group>
                  <strong>{action.title}</strong>
                  {action.description && <p>{action.description}</p>}
                </div>

                <div className={styles.actionMetadata}>
                  <span>ASSIGNEE</span>
                  <strong>{assignee?.display_name ?? assignee?.email ?? 'Unknown member'}</strong>
                </div>

                <div className={styles.actionMetadata}>
                  <span>DUE</span>
                  <strong className={overdue ? styles.overdueText : undefined}>
                    {action.due_at ? formatDateTime(action.due_at) : 'No due date'}
                  </strong>
                </div>

                {(canTransition || canManageActions) && (
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <Button
                        variant="default"
                        size="xs"
                        rightSection={<IconDots size={14} />}
                        aria-label={`Manage ${action.title}`}
                      >
                        Update
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {canManageActions && activeStatuses.includes(action.status) && (
                        <Menu.Item
                          leftSection={<IconEdit size={15} />}
                          onClick={() => setEditorAction(action)}
                        >
                          Edit or reassign
                        </Menu.Item>
                      )}
                      {canTransition &&
                        transitionTargets[action.status].map((status) => (
                          <Menu.Item
                            key={status}
                            color={status === 'cancelled' ? 'red' : undefined}
                            leftSection={
                              status === 'completed' ? (
                                <IconCheck size={15} />
                              ) : status === 'blocked' ? (
                                <IconAlertTriangle size={15} />
                              ) : status === 'in_progress' ? (
                                <IconPlayerPlay size={15} />
                              ) : (
                                <IconCalendarDue size={15} />
                              )
                            }
                            onClick={() => changeStatus(action, status)}
                          >
                            {statusLabel[status]}
                          </Menu.Item>
                        ))}
                    </Menu.Dropdown>
                  </Menu>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ActionItemModal
        workspaceId={workspaceId}
        decisionId={decisionId}
        members={members}
        action={editorAction ?? null}
        opened={editorAction !== undefined}
        onClose={() => setEditorAction(undefined)}
      />
    </section>
  );
}
