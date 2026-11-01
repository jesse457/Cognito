/**
 * Console URLs for the optional instructor portal.
 *
 * Why this exists instead of Wayfinder generated helpers: `routes/web.php`
 * mounts the instructor portal only when `features.instructor_path` is true,
 * and the Wayfinder Vite plugin regenerates `resources/js/routes` on every
 * build. With the flag off (the default deployment) those generated helpers
 * disappear and any page importing them fails to build. This module keeps a
 * single, typed source of truth for the ten console endpoints so the instructor
 * pages build and typecheck in both flag states.
 *
 * The admin panel is always mounted, so it keeps using generated Wayfinder
 * helpers (`@/routes/panel/admin`).
 */

type IdArg =
    | number
    | string
    | { class?: number | string; student?: number | string; id?: number | string }
    | undefined;

function idFrom(value: IdArg): string {
    if (value === undefined) {
        throw new Error('A class id is required.');
    }

    if (typeof value === 'object') {
        const candidate = value.class ?? value.id;

        if (candidate === undefined) {
            throw new Error('A class id is required.');
        }

        return String(candidate);
    }

    return String(value);
}

function pair(value: { class: number | string; student: number | string }): string {
    return `/instructor/classes/${String(value.class)}/students/${String(value.student)}`;
}

const instructor = {
    dashboard: {
        url: (): string => '/instructor',
    },
    classes: {
        index: {
            url: (): string => '/instructor/classes',
        },
        show: {
            url: (args?: IdArg): string => `/instructor/classes/${idFrom(args)}`,
        },
        students: {
            show: {
                url: (args: { class: number | string; student: number | string }): string => pair(args),
            },
            lessons: {
                store: {
                    url: (args: { class: number | string; student: number | string }): string =>
                        `${pair(args)}/lessons`,
                },
            },
            notes: {
                store: {
                    url: (args: { class: number | string; student: number | string }): string =>
                        `${pair(args)}/notes`,
                },
            },
        },
        announcements: {
            store: {
                url: (args?: IdArg): string => `/instructor/classes/${idFrom(args)}/announcements`,
            },
        },
        courses: {
            store: {
                url: (args?: IdArg): string => `/instructor/classes/${idFrom(args)}/courses`,
            },
        },
        invitations: {
            store: {
                url: (args?: IdArg): string => `/instructor/classes/${idFrom(args)}/invitations`,
            },
        },
        snapshot: {
            url: (args?: IdArg): string => `/instructor/classes/${idFrom(args)}/snapshot`,
        },
    },
};

export default instructor;
