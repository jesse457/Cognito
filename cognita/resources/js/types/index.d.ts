/** Two surfaces: a blank canvas, or a PDF the class uploaded. */
export type BoardSurface = 'canvas' | 'pdf';

export interface BoardDocument {
    id: number | null;
    name: string;
    url: string;
    pages: number;
    size: number;
}

export interface BoardDocumentSummary extends BoardDocument {
    id: number;
    selectUrl: string;
    active: boolean;
}

/**
 * A single annotation on the shared board. Free-hands use a point polyline;
 * shapes and the arrow use only the first and last point as endpoints; text
 * anchors at points[0] and carries its string in `text`.
 */
export type BoardTool =
    | 'pen'
    | 'marker'
    | 'eraser'
    | 'laser'
    | 'spotlight'
    | 'rect'
    | 'ellipse'
    | 'line'
    | 'arrow'
    | 'text';

export interface BoardStroke {
    id: number;
    tool: BoardTool;
    color: string;
    width: number;
    /** Ink belongs to one sheet: the canvas and a PDF page do not mix. */
    surface: BoardSurface;
    page: number;
    points: Array<[number, number]>;
    text?: string;
    /** Laser trails are ephemeral; the timestamp is what makes them fade. */
    at?: number;
    /** Who drew it, so a late joiner can still honour personal undo. */
    by?: string;
}

export interface BoardState {
    surface: BoardSurface;
    title: string;
    document: BoardDocument | null;
    documents: BoardDocumentSummary[];
    page: number;
    pages: number;
    /** The page the PDF will come back to while the canvas is showing. */
    pdfPage: number;
    studentsCanAnnotate: boolean;
    allowedDrawerIds: number[];
    /** The room drawing is allowed in; null when no room is live. */
    session: string | null;
    /**
     * The ink on the board. Always empty from the server — drawings are never
     * stored, so this array is filled by the browsers in the room.
     */
    strokes: BoardStroke[];
}

/** A student on the class roster, with their draw permission. */
export interface RoomStudent {
    id: number;
    name: string;
    can_draw: boolean;
}

/** A comment sent during the call. Nothing about it is stored. */
export interface CommentEntry {
    id: string;
    body: string;
    at: number;
    senderName: string;
    mine: boolean;
}

export interface PollOptionView {
    id: number;
    label: string;
    count: number;
}

export interface PollResponseView {
    option_id: number | null;
    body: string | null;
}

/** One live class poll, already shaped for the call panel. */
export interface PollView {
    id: number;
    question: string;
    kind: 'open' | 'choice';
    options: PollOptionView[];
    /** Open-answer texts, anonymous; empty for multiple choice. */
    responses: string[];
    my_response: PollResponseView | null;
    total_responses: number;
    is_open: boolean;
    can_respond: boolean;
    can_close: boolean;
    ends_at: string;
    closed_at: string | null;
    seconds_remaining: number;
    created_at: string;
}

export interface CreatePollInput {
    kind: 'open' | 'choice';
    question: string;
    duration: number;
    options?: string[];
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

/** An image attached to a question or an answer, served through an access check. */
export interface PostMedia {
    id: number;
    url: string;
    name: string;
    mime: string;
    size: number;
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

/** A class as the instructor dashboard lists it: with live state and links out. */
export interface TeachingClassroom extends ClassroomSummary {
    /** A room is open in this class right now. */
    live: boolean;
    /** How many students are in the call this moment. */
    in_call: number;
    /** "Room is open", "Last open 2 h ago", "Not opened yet". */
    last_session: string;
    class_url: string;
    attendance_url: string;
}

/** A course tile: the classes inside it, and how many students that means. */
export interface TeachingCourse extends CourseSummary {
    students: number;
}

/** Tier-1 numbers for the instructor dashboard. */
export interface TeachingStats {
    live_classes: number;
    in_call: number;
    classes: number;
    students: number;
    unassigned: number;
    rooms_this_week: number;
}

/** One line of the instructor activity feed. */
export interface ActivityEntry {
    id: string;
    kind: 'call' | 'enrolment';
    title: string;
    meta: string;
    /** Already phrased by the server: "just now", "2 h ago", "yesterday". */
    at: string;
    href: string;
}

/** A class as the student dashboard lists it. */
export interface StudentClassroom extends ClassroomSummary {
    instructor: string | null;
    live: boolean;
    /** "In the call today", "Last in class Mon 3 Nov", "Not in a call yet". */
    last_attended: string;
}

/** An enrolled course, derived from the classes inside it. */
export interface EnrolledCourse {
    id: number;
    title: string;
    classes: number;
    members: number;
    live: boolean;
}

/** One of the student's own past call sessions. */
export interface StudySession {
    id: number;
    classroom: string;
    classroom_id: number;
    /** "Today · 09:12". */
    when: string;
    duration: string;
    live: boolean;
    href: string;
}

/** Tier-1 numbers for the student dashboard. */
export interface StudyStats {
    classes: number;
    courses: number;
    live: number;
    in_call: number;
    /** Already formatted: "48 min", "1 h 05 min". */
    time_in_class: string;
    sessions: number;
}

declare module '@inertiajs/react' {
    interface PageProps extends SharedProps {}
}
