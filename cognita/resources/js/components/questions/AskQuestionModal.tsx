import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import MediaPicker from '@/components/questions/MediaPicker';
import Button from '@/components/ui/Button';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { routes } from '@/lib/routes';

export interface QuestionClassroomOption {
    id: number;
    name: string;
    course: string | null;
}

export default function AskQuestionModal({
    open,
    scope,
    classrooms,
    onClose,
}: {
    open: boolean;
    scope: 'class' | 'community';
    classrooms: QuestionClassroomOption[];
    onClose: () => void;
}) {
    const form = useForm({
        scope,
        classroom_id: classrooms[0] ? String(classrooms[0].id) : '',
        title: '',
        body: '',
        tags: '',
        media: [] as File[],
    });
    const tagError =
        form.errors.tags ??
        Object.entries(form.errors).find(([field]) => field.startsWith('tags.'))?.[1] ??
        null;
    const mediaError =
        form.errors.media ??
        Object.entries(form.errors).find(([field]) => field.startsWith('media.'))?.[1] ??
        null;
    const destination = form.data.scope === 'community' ? 'community' : form.data.classroom_id;
    const destinationError = form.errors.scope ?? form.errors.classroom_id;

    function chooseDestination(next: string): void {
        if (next === 'community') {
            form.setData('scope', 'community');

            return;
        }

        form.setData('scope', 'class');
        form.setData('classroom_id', next);
    }

    function submit(event: FormEvent): void {
        event.preventDefault();

        form.post(routes.questions.store, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                onClose();
                form.reset();
            },
        });
    }

    return (
        <Modal
            open={open}
            title={scope === 'community' ? 'Ask the community' : 'Ask your class'}
            description="A clear title and the part you are stuck on get the fastest answers."
            onClose={onClose}
        >
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field
                    label="Post to"
                    hint="Community questions are visible to every signed-in student and instructor. Class questions stay inside that class."
                    error={destinationError}
                >
                    {(id) => (
                        <Select
                            id={id}
                            value={destination}
                            onChange={chooseDestination}
                            invalid={Boolean(destinationError)}
                            options={[
                                { value: 'community', label: 'Community · everyone' },
                                ...classrooms.map((classroom) => ({
                                    value: String(classroom.id),
                                    label: classroom.course === null
                                        ? classroom.name
                                        : `${classroom.name} · ${classroom.course}`,
                                })),
                            ]}
                        />
                    )}
                </Field>

                <Field
                    label="Title"
                    hint="One sentence. Imagine the question in a search result."
                    error={form.errors.title}
                >
                    {(id) => (
                        <TextInput
                            id={id}
                            value={form.data.title}
                            onChange={(event) => form.setData('title', event.target.value)}
                            placeholder="Why does the normal force not always equal mg?"
                            maxLength={160}
                            invalid={Boolean(form.errors.title)}
                        />
                    )}
                </Field>

                <Field
                    label="What have you tried?"
                    hint="Share the problem, the notes you checked and where it stopped making sense."
                    error={form.errors.body}
                >
                    {(id) => (
                        <TextArea
                            id={id}
                            value={form.data.body}
                            onChange={(event) => form.setData('body', event.target.value)}
                            placeholder="In the lift example, the normal force changes when the lift accelerates. I thought N always cancelled mg..."
                            className="min-h-32"
                            invalid={Boolean(form.errors.body)}
                        />
                    )}
                </Field>

                <div>
                    <span className="label">
                        Photos <span className="font-normal text-ink-soft">(optional)</span>
                    </span>
                    <MediaPicker
                        files={form.data.media}
                        onChange={(media) => form.setData('media', media)}
                        error={mediaError}
                        disabled={form.processing}
                    />
                </div>

                <Field
                    label="Tags"
                    hint="Optional. Up to five, separated by commas."
                    error={tagError}
                >
                    {(id) => (
                        <TextInput
                            id={id}
                            value={form.data.tags}
                            onChange={(event) => form.setData('tags', event.target.value)}
                            placeholder="momentum, energy, exam"
                            invalid={Boolean(tagError)}
                        />
                    )}
                </Field>

                <div className="flex justify-end gap-2 border-t border-line pt-4">
                    <Button variant="quiet" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={form.processing}>
                        {form.processing ? 'Posting' : 'Post question'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
