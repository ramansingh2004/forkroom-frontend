'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Textarea, TextInput } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateWorkspace } from '@/hooks/use-workspaces';
import { getApiErrorMessage } from '@/services/auth.service';
import styles from './workspace.module.css';

const schema = z.object({
  name: z.string().trim().min(2, 'Use at least 2 characters.').max(120, 'Keep the name under 120 characters.'),
  description: z.string().trim().max(500, 'Keep the description under 500 characters.'),
});

type FormValues = z.infer<typeof schema>;

export function CreateWorkspaceForm() {
  const router = useRouter();
  const createWorkspace = useCreateWorkspace();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    const workspace = await createWorkspace.mutateAsync({
      name: values.name.trim(),
      description: values.description.trim() || null,
    });
    router.replace(`/w/${workspace.id}`);
  });

  return (
    <div className={styles.formPage}>
      <header className={styles.formIntro}>
        <span className={styles.eyebrow}>NEW WORKSPACE</span>
        <h1>Create a shared decision space</h1>
        <p>You will be the workspace owner. You can invite teammates after creation.</p>
      </header>

      <form className={styles.formCard} onSubmit={submit} noValidate>
        <TextInput
          label="Workspace name"
          placeholder="Platform Architecture"
          autoFocus
          {...form.register('name')}
          error={form.formState.errors.name?.message}
        />
        <Textarea
          label="Description"
          description="Optional — one sentence is enough."
          placeholder="Architecture decisions for the platform team."
          minRows={4}
          autosize
          {...form.register('description')}
          error={form.formState.errors.description?.message}
        />

        {createWorkspace.isError && (
          <p className={styles.formError} role="alert">
            {getApiErrorMessage(createWorkspace.error, 'Could not create the workspace. Try again.')}
          </p>
        )}

        <div className={styles.formActions}>
          <Button component={Link} href="/workspaces" variant="default">
            Cancel
          </Button>
          <Button type="submit" color="rust" loading={createWorkspace.isPending}>
            Create workspace
          </Button>
        </div>
      </form>
    </div>
  );
}
