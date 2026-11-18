import type { ReactNode } from 'react';
import AppShell from '@/layouts/AppShell';
import CommunityShell from '@/layouts/CommunityShell';
import DashboardShell from '@/layouts/DashboardShell';
import GuestShell from '@/layouts/GuestShell';

/** Pages that bring their own chrome. */
const BARE_PAGES = ['LiveCall/Room'];

/** Guest pages share the split brand/auth layout. */
const GUEST_PAGES = ['Welcome', 'Auth/SignIn', 'Auth/Register'];

const withBare = (page: ReactNode) => page;

const withGuest = (page: ReactNode) => <GuestShell>{page}</GuestShell>;

const withApp = (page: ReactNode) => <AppShell>{page}</AppShell>;

const withDashboard = (page: ReactNode) => <DashboardShell>{page}</DashboardShell>;

const withCommunity = (page: ReactNode) => <CommunityShell>{page}</CommunityShell>;

/**
 * Which shell a page wears.
 *
 * It lives here rather than in `app.tsx` so it can be read — and tested —
 * without booting the whole application.
 */
export function shellFor(name: string): (page: ReactNode) => ReactNode {
    if (BARE_PAGES.includes(name)) {
        return withBare;
    }

    if (GUEST_PAGES.includes(name)) {
        return withGuest;
    }

    if (name.startsWith('Community/') || name.startsWith('Questions/')) {
        return withCommunity;
    }

    const LEARNING_PAGES = ['Student/Courses', 'Student/Course', 'Student/Lesson', 'Instructor/Curriculum'];

    if (LEARNING_PAGES.includes(name)) {
        return withCommunity;
    }

    if (name.startsWith('Instructor/') || name.startsWith('Student/')) {
        return withDashboard;
    }

    return withApp;
}
