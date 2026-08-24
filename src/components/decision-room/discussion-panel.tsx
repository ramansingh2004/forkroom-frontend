"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Avatar,
  Button,
  Loader,
  ScrollArea,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconAt,
  IconEdit,
  IconRefresh,
  IconSend,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

import {
  useCreateDecisionComment,
  useDecisionComments,
  useDeleteDecisionComment,
  useUpdateDecisionComment,
} from "@/hooks/use-comments";
import { getApiErrorMessage } from "@/services/auth.service";
import type {
  CommentNode,
  DecisionComment,
  StructuredCommentBody,
} from "@/services/comment.service";
import type { WorkspaceMember } from "@/services/workspace.service";

import styles from "./discussion-panel.module.css";

type SelectedMember = Pick<WorkspaceMember, "user_id" | "display_name">;

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "FR"
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function selectedFromComment(comment: DecisionComment): SelectedMember[] {
  const byId = new Map<string, SelectedMember>();
  for (const node of comment.structured_body.content) {
    if (node.type === "mention") {
      byId.set(node.user_id, {
        user_id: node.user_id,
        display_name: node.label,
      });
    }
  }
  return [...byId.values()];
}

function structuredBody(
  body: string,
  selectedMembers: SelectedMember[],
): StructuredCommentBody {
  const memberByLabel = new Map(
    selectedMembers.map((member) => [member.display_name, member]),
  );
  const occurrences = [...memberByLabel.values()]
    .flatMap((member) => {
      const token = `@${member.display_name}`;
      const positions: Array<{ start: number; end: number; member: SelectedMember }> = [];
      let from = 0;
      while (from < body.length) {
        const start = body.indexOf(token, from);
        if (start < 0) break;
        positions.push({ start, end: start + token.length, member });
        from = start + token.length;
      }
      return positions;
    })
    .sort((left, right) => left.start - right.start || right.end - left.end);

  const content: CommentNode[] = [];
  let cursor = 0;
  for (const occurrence of occurrences) {
    if (occurrence.start < cursor) continue;
    if (occurrence.start > cursor) {
      content.push({ type: "text", text: body.slice(cursor, occurrence.start) });
    }
    content.push({
      type: "mention",
      user_id: occurrence.member.user_id,
      label: occurrence.member.display_name,
    });
    cursor = occurrence.end;
  }
  if (cursor < body.length) content.push({ type: "text", text: body.slice(cursor) });
  if (content.length === 0) content.push({ type: "text", text: body });
  return { content };
}

function CommentBody({ nodes, fallback }: { nodes: CommentNode[]; fallback: string }) {
  if (nodes.length === 0) return <>{fallback}</>;
  return (
    <>
      {nodes.map((node, index) =>
        node.type === "mention" ? (
          <span className={styles.inlineMention} key={`${node.user_id}-${index}`}>
            @{node.label}
          </span>
        ) : (
          <span key={`text-${index}`}>{node.text}</span>
        ),
      )}
    </>
  );
}

export function DiscussionPanel({
  workspaceId,
  decisionId,
  members,
  currentUserId,
  canModerate,
  targetCommentId,
}: {
  workspaceId: string;
  decisionId: string;
  members: WorkspaceMember[];
  currentUserId: string;
  canModerate: boolean;
  targetCommentId: string | null;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const comments = useDecisionComments(workspaceId, decisionId);
  const createComment = useCreateDecisionComment(workspaceId, decisionId);
  const updateComment = useUpdateDecisionComment(workspaceId, decisionId);
  const deleteComment = useDeleteDecisionComment(workspaceId, decisionId);
  const [body, setBody] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [editing, setEditing] = useState<DecisionComment | null>(null);
  const [caret, setCaret] = useState(0);
  const items = useMemo(
    () => comments.data?.pages.flatMap((page) => page) ?? [],
    [comments.data],
  );
  const fetchNextCommentsPage = comments.fetchNextPage;
  const mentionMatch = body.slice(0, caret).match(/@([^@\n]{0,50})$/);
  const mentionQuery = mentionMatch?.[1].trim().toLowerCase() ?? null;
  const suggestions =
    mentionQuery === null
      ? []
      : members
          .filter((member) =>
            `${member.display_name} ${member.email}`
              .toLowerCase()
              .includes(mentionQuery),
          )
          .slice(0, 6);

  useEffect(() => {
    if (
      targetCommentId &&
      !items.some((comment) => comment.id === targetCommentId) &&
      comments.hasNextPage &&
      !comments.isFetchingNextPage
    ) {
      void fetchNextCommentsPage();
    }
  }, [
    fetchNextCommentsPage,
    comments.hasNextPage,
    comments.isFetchingNextPage,
    items,
    targetCommentId,
  ]);

  useEffect(() => {
    if (!targetCommentId || items.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`comment-${targetCommentId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [items.length, targetCommentId]);

  const resetComposer = () => {
    setBody("");
    setSelectedMembers([]);
    setEditing(null);
    setCaret(0);
  };

  const handleBodyChange = (value: string) => {
    setBody(value);
    setSelectedMembers((current) =>
      current.filter((member) => value.includes(`@${member.display_name}`)),
    );
  };

  const insertMention = (member: WorkspaceMember) => {
    const start = mentionMatch ? caret - mentionMatch[0].length : caret;
    const token = `@${member.display_name}`;
    const nextBody = `${body.slice(0, start)}${token} ${body.slice(caret)}`;
    const nextCaret = start + token.length + 1;
    setBody(nextBody);
    setSelectedMembers((current) => [
      ...current.filter((item) => item.display_name !== member.display_name),
      { user_id: member.user_id, display_name: member.display_name },
    ]);
    setCaret(nextCaret);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const beginEditing = (comment: DecisionComment) => {
    setEditing(comment);
    setBody(comment.body);
    setSelectedMembers(selectedFromComment(comment));
    setCaret(comment.body.length);
    textareaRef.current?.focus();
  };

  const submit = async () => {
    const normalized = body.trim();
    if (!normalized) return;
    const payload = {
      body: normalized,
      structured_body: structuredBody(normalized, selectedMembers),
    };
    try {
      if (editing) {
        await updateComment.mutateAsync({ commentId: editing.id, payload });
      } else {
        await createComment.mutateAsync(payload);
      }
      notifications.show({
        color: "green",
        title: editing ? "Comment updated" : "Comment posted",
        message: editing
          ? "The discussion and its mentions now reflect your changes."
          : "Your comment is now visible to workspace members.",
      });
      resetComposer();
    } catch (error) {
      notifications.show({
        color: "red",
        title: editing ? "Comment was not updated" : "Comment was not posted",
        message: getApiErrorMessage(
          error,
          "ForkRoom could not save this comment. Review its mentions and try again.",
        ),
      });
    }
  };

  const confirmDelete = (comment: DecisionComment) => {
    modals.openConfirmModal({
      title: "Delete this comment?",
      children: "The comment and every mention created from it will be removed.",
      labels: { confirm: "Delete comment", cancel: "Keep comment" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteComment.mutateAsync(comment.id);
          if (editing?.id === comment.id) resetComposer();
          notifications.show({
            color: "green",
            title: "Comment deleted",
            message: "The discussion entry and its mentions were removed.",
          });
        } catch (error) {
          notifications.show({
            color: "red",
            title: "Comment was not deleted",
            message: getApiErrorMessage(
              error,
              "ForkRoom could not delete this comment.",
            ),
          });
        }
      },
    });
  };

  const submitting = createComment.isPending || updateComment.isPending;

  return (
    <div className={styles.discussionBody}>
      {comments.isPending && !comments.data ? (
        <div className={styles.commentState}>
          <Loader color="rust" size="sm" /> Loading discussion…
        </div>
      ) : comments.isError && !comments.data ? (
        <Alert color="red" title="Discussion is unavailable" className={styles.errorState}>
          {getApiErrorMessage(
            comments.error,
            "ForkRoom could not load this decision discussion.",
          )}
          <Button
            mt="sm"
            size="compact-sm"
            variant="default"
            leftSection={<IconRefresh size={14} />}
            onClick={() => void comments.refetch()}
          >
            Retry
          </Button>
        </Alert>
      ) : (
        <ScrollArea className={styles.commentScroll} type="auto">
          {comments.isError && comments.data && (
            <Alert color="orange" title="Showing the last loaded discussion" className={styles.staleAlert}>
              ForkRoom could not refresh these comments.
              <Button
                ml="sm"
                size="compact-sm"
                variant="subtle"
                color="dark"
                onClick={() => void comments.refetch()}
              >
                Retry
              </Button>
            </Alert>
          )}
          <div className={styles.threadMeta}>
            <span>{items.length} loaded comment{items.length === 1 ? "" : "s"}</span>
            <span>Use @ to mention a member</span>
          </div>
          {items.length === 0 ? (
            <div className={styles.emptyDiscussion}>
              <IconAt size={25} />
              <strong>Start the decision discussion</strong>
              <span>Write a comment or mention a member whose attention is needed.</span>
            </div>
          ) : (
            items.map((comment) => {
              const canChange = comment.author.id === currentUserId || canModerate;
              return (
                <article
                  id={`comment-${comment.id}`}
                  key={comment.id}
                  className={`${styles.comment} ${targetCommentId === comment.id ? styles.targetComment : ""}`}
                >
                  <Avatar
                    src={comment.author.avatar_url}
                    color="rust"
                    radius="xl"
                    size={30}
                  >
                    {initials(comment.author.display_name)}
                  </Avatar>
                  <div>
                    <header>
                      <strong>{comment.author.display_name}</strong>
                      <time dateTime={comment.created_at}>{formatTime(comment.created_at)}</time>
                    </header>
                    <p>
                      <CommentBody
                        nodes={comment.structured_body.content}
                        fallback={comment.body}
                      />
                    </p>
                    <footer>
                      {comment.updated_at !== comment.created_at && <span>Edited</span>}
                      {canChange && (
                        <>
                          <button type="button" onClick={() => beginEditing(comment)}>
                            <IconEdit size={13} /> Edit
                          </button>
                          <button type="button" onClick={() => confirmDelete(comment)}>
                            <IconTrash size={13} /> Delete
                          </button>
                        </>
                      )}
                    </footer>
                  </div>
                </article>
              );
            })
          )}
          {comments.hasNextPage && (
            <div className={styles.loadOlder}>
              <Button
                size="compact-sm"
                variant="default"
                loading={comments.isFetchingNextPage}
                onClick={() => void comments.fetchNextPage()}
              >
                Load more comments
              </Button>
            </div>
          )}
        </ScrollArea>
      )}

      <div className={styles.composer}>
        {editing && (
          <div className={styles.editingNotice}>
            <span>Editing your comment</span>
            <ActionIcon
              variant="subtle"
              color="dark"
              size="sm"
              aria-label="Cancel comment editing"
              onClick={resetComposer}
            >
              <IconX size={15} />
            </ActionIcon>
          </div>
        )}
        <div className={styles.composerField}>
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(event) => {
              handleBodyChange(event.currentTarget.value);
              setCaret(event.currentTarget.selectionStart);
            }}
            onClick={(event) => setCaret(event.currentTarget.selectionStart)}
            onKeyUp={(event) => setCaret(event.currentTarget.selectionStart)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                void submit();
              }
            }}
            autosize
            minRows={2}
            maxRows={5}
            maxLength={50_000}
            placeholder="Add to the discussion… Type @ to mention a member"
            aria-label="Decision comment"
          />
          {suggestions.length > 0 && (
            <div className={styles.mentionSuggestions} role="listbox" aria-label="Mention a workspace member">
              {suggestions.map((member) => (
                <button
                  type="button"
                  role="option"
                  aria-selected="false"
                  key={member.user_id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertMention(member)}
                >
                  <Avatar src={member.avatar_url} size={25} radius="xl" color="rust">
                    {initials(member.display_name)}
                  </Avatar>
                  <span><strong>{member.display_name}</strong><small>{member.email}</small></span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={styles.composerActions}>
          <span><IconAt size={14} /> Mentions use verified workspace members.</span>
          <Tooltip label="Post with Ctrl/⌘ + Enter">
            <Button
              size="xs"
              color="rust"
              leftSection={<IconSend size={14} />}
              disabled={!body.trim()}
              loading={submitting}
              onClick={() => void submit()}
            >
              {editing ? "Save" : "Comment"}
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
