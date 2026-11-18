import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import MediaPicker from '@/components/questions/MediaPicker';
import { Field } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { routes } from '@/lib/routes';

export interface CommunityGroupOption {
    id: number;
    name: string;
    joined: boolean;
}

export default function AskPostModal({
    open,
    groups,
    defaultGroupId,
    onClose,
}: {
    open: boolean;
    groups: CommunityGroupOption[];
    defaultGroupId?: number | null;
    onClose: () => void;
}) {
    const form = useForm({
        group_id: defaultGroupId ? String(defaultGroupId) : '',
        title: '',
        body: '',
        tags: '',
        media: [] as File[],
    });

    useEffect(() => {
        form.setData('group_id', defaultGroupId ? String(defaultGroupId) : '');
    }, [defaultGroupId]);

    const available = groups.filter((group) => group.joined);
    const options = [
        { value: '', label: 'Community — everyone can see it' },
        ...available.map((group) => ({ value: String(group.id), label: group.name })),
    ];

    function submit(event: React.FormEvent): void {
        event.preventDefault();

        form.post(routes.questions.store, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        });
    }

    return (
        <Modal
            open={open}
            title="Start a post"
            description="Ask the community, or post a question to one of your groups."
            onClose={onClose}
        >
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field label="Where should it go?" hint="General posts are public. Group posts reach the members of that group.">
                    {(id) => (
                        <Select
                            id={id}
                            value={form.data.group_id}
                            onChange={(value) => form.setData('group_id', value)}
                            options={options}
                        />
                    )}
                </Field>

                <Field label="Title" error={form.errors.title}>
                    {(id) => (
                        <input
                            id={id}
                            className="input"
                            value={form.data.title}
                            onChange={(event) => form.setData('title', event.target.value)}
                            placeholder="What are you working through?"
                            maxLength={160}
                        />
                    )}
                </Field>

                <Field label="Details" error={form.errors.body}>
                    {(id) => (
                        <textarea
                            id={id}
                            className="textarea"
                            rows={6}
                            value={form.data.body}
                            onChange={(event) => form.setData('body', event.target.value)}
                            placeholder="Explain what you have tried and where you got stuck."
                        />
                    )}
                </Field>

                <Field label="Tags" error={form.errors.tags} hint="Up to five, separated by commas.">
                    {(id) => (
                        <input
                            id={id}
                            className="input"
                            value={form.data.tags}
                            onChange={(event) => form.setData('tags', event.target.value)}
                            placeholder="momentum, exam"
                        />
                    )}
                </Field>

                <MediaPicker
                    files={form.data.media}
                    onChange={(files) => form.setData('media', files)}
                    error={form.errors.media ?? form.errors['media.0']}
                    disabled={form.processing}
                />

                <div className="flex justify-end gap-2 border-t border-line pt-3">
                    <button type="button" className="btn btn-quiet" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={form.processing}>
                        {form.processing ? 'Posting…' : 'Post'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
