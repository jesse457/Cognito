import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import ModalFooter from '@/components/ui/ModalFooter';
import { Field, TextInput } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { routes } from '@/lib/routes';

export interface CourseOption {
    id: number;
    title: string;
}

/**
 * The one create-class form, shared by the overview and the classes index so a
 * new class can be started from wherever the instructor happens to be.
 */
export default function NewClassModal({
    open,
    courses,
    onClose,
}: {
    open: boolean;
    courses: CourseOption[];
    onClose: () => void;
}) {
    const form = useForm({ name: '', course_id: '' as string });

    function submit(event: FormEvent): void {
        event.preventDefault();
        form.post(routes.instructor.classrooms, {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
                form.reset();
            },
        });
    }

    return (
        <Modal
            open={open}
            title="New class"
            description="Students join this class with the key we generate for it."
            onClose={onClose}
        >
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field label="Class name" error={form.errors.name}>
                    {(id) => (
                        <TextInput
                            id={id}
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            placeholder="Physics Cohort A"
                            invalid={Boolean(form.errors.name)}
                        />
                    )}
                </Field>

                <Field label="Course" hint="Optional. Classes without a course still work." error={form.errors.course_id}>
                    {(id) => (
                        <Select
                            id={id}
                            value={form.data.course_id}
                            onChange={(course) => form.setData('course_id', course)}
                            invalid={Boolean(form.errors.course_id)}
                            options={[
                                { value: '', label: 'No course' },
                                ...courses.map((course) => ({ value: String(course.id), label: course.title })),
                            ]}
                        />
                    )}
                </Field>

                <ModalFooter
                    onCancel={onClose}
                    submitLabel="Create class"
                    busyLabel="Creating"
                    busy={form.processing}
                />
            </form>
        </Modal>
    );
}
