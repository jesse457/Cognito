export interface AuthUser {
    id: number;
    name: string;
    display_name: string | null;
    display_label: string;
    initials: string;
    email: string;
    role: string;
    role_label: string;
    role_rank: number;
    is_staff: boolean;
    is_instructor: boolean;
    status: string;
}

export interface FlashMessages {
    success: string | null;
    error: string | null;
}

export interface Features {
    instructorPath: boolean;
    social: boolean;
    liveCalls: boolean;
    ktEngine: string;
}

export interface SharedProps {
    appName: string;
    panel: 'admin' | 'instructor' | null;
    auth: { user: AuthUser | null };
    features: Features;
    flash: FlashMessages;
    [key: string]: unknown;
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
}

export interface PanelUser {
    id: number;
    name: string;
    display_name: string | null;
    display_label: string;
    email: string | null;
    role: string;
    role_label: string;
    status: string;
    is_staff: boolean;
    is_banned: boolean;
    is_suspended: boolean;
    created_at: string | null;
    last_seen_at?: string | null;
}
