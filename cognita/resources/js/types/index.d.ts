export type BoardSurface = 'canvas' | 'notebook' | 'pdf';

export interface BoardDocument {
    name: string;
    url: string;
    pages: number;
}

export interface BoardStroke {
    id: number;
    tool: 'pen' | 'marker' | 'eraser';
    color: string;
    width: number;
    page: number;
    points: Array<[number, number]>;
}

export interface BoardState {
    surface: BoardSurface;
    title: string;
    document: BoardDocument | null;
    page: number;
    pages: number;
    studentsCanAnnotate: boolean;
    strokes: BoardStroke[];
}

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'instructor' | 'student';
    role_label: string;
    initials: string;
}

export interface FlashMessages {
    success: string | null;
    error: string | null;
}

export interface SharedProps {
    appName: string;
    auth: { user: AuthUser | null };
    flash: FlashMessages;
    errors: Record<string, string>;
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

export interface ClassroomSummary {
    id: number;
    name: string;
    join_code: string;
    course: string | null;
    instructor?: string | null;
    members: number;
    call_url: string;
}

export interface CourseSummary {
    id: number;
    title: string;
    description: string | null;
    classrooms_count: number;
    created_at?: string | null;
}

declare module '@inertiajs/react' {
    interface PageProps extends SharedProps {}
}
