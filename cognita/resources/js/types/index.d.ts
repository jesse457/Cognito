/** Two surfaces: a blank canvas, or a PDF the class uploaded. */
export type BoardSurface = 'canvas' | 'pdf';

export interface BoardDocument {
    id: number;
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
    /**
     * The students who may draw right now.
     *
     * There is no class-wide switch: the instructor hands the pen to one
     * student at a time, and the list dies with the lesson.
     */
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
    status?: CourseStatus;
    status_label?: string;
    classrooms_count: number;
    created_at?: string | null;
    /** A paid course keeps its live rooms locked until a student's payment is confirmed. */
    is_paid: boolean;
    price_cents: number;
    currency: CurrencyCode;
    /** Already formatted: "$49.00"; null for a free course. */
    price_label: string | null;
    payment_url: string | null;
    payment_instructions: string | null;
}

/* --- Curriculum and progress --------------------------------------------- */

/** The publishing state of a course. */
export type CourseStatus = 'draft' | 'published' | 'archived';

/** How a lesson is learned. */
export type LessonType = 'video' | 'article' | 'quiz';

/** Whether students can open a lesson. */
export type LessonStatus = 'draft' | 'published';

/** How far a student is through one lesson. */
export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed';

/** Currencies Cognita can price courses in. */
export type CurrencyCode = 'XAF' | 'USD' | 'EUR';

/** A label/value pair for a select box. */
export interface EnumOption {
    value: string;
    label: string;
}

/** A file attached to one lesson. */
export interface CourseMaterialView {
    id: number;
    title: string;
    lesson_id: number | null;
    lesson_title?: string | null;
    mime_type: string | null;
    size_label: string;
    kind: 'video' | 'image' | 'pdf' | 'document' | 'archive';
    url: string;
    download_url: string;
}

/** One lesson in the instructor's curriculum. */
export interface CurriculumLessonView {
    id: number;
    title: string;
    type: LessonType;
    type_label: string;
    status: LessonStatus;
    status_label: string;
    content: string | null;
    video_url: string | null;
    duration_minutes: number | null;
    position: number;
    materials_count: number;
}

/** One module of a course. */
export interface CurriculumSectionView {
    id: number;
    title: string;
    description: string | null;
    position: number;
    lessons: CurriculumLessonView[];
}

/** A course a student can study at their own pace. */
export interface StudentCourseView {
    id: number;
    title: string;
    description: string | null;
    instructor: string | null;
    sections_count: number;
    lessons_count: number;
    is_paid: boolean;
    price_label: string | null;
    enrolled: boolean;
    owned: boolean;
    progress: { completed: number; total: number; percent: number };
    continue_url: string | null;
    url: string;
}

/** One lesson in a student's course outline. */
export interface StudentLessonRow {
    id: number;
    title: string;
    type: LessonType;
    type_label: string;
    duration_minutes: number | null;
    progress: LessonProgressStatus;
    completed: boolean;
    url: string;
}

/** One module as a student sees it. */
export interface StudentSectionView {
    id: number;
    title: string;
    description: string | null;
    lessons: StudentLessonRow[];
}

/** A live session linked to a course or one of its lessons. */
export interface StudentCourseSessionView {
    id: number;
    title: string;
    description: string | null;
    lesson: string | null;
    classroom: string | null;
    state: SessionState;
    starts_at: string | null;
    ends_at: string | null;
    join_url: string;
}

/** The lesson a student is reading. */
export interface StudentLessonView {
    id: number;
    title: string;
    type: LessonType;
    type_label: string;
    content: string | null;
    video_url: string | null;
    duration_minutes: number | null;
    section: string | null;
    course: {
        id: number;
        title: string;
        url: string;
    };
    materials: CourseMaterialView[];
    progress: LessonProgressStatus;
    completed: boolean;
    completed_at: string | null;
}

/** The lesson before or after the one being read. */
export interface LessonNeighbourView {
    id: number;
    title: string;
    url: string;
}

/** How far a student is through paying for a course. */
export type PaymentStatus = 'free' | 'unpaid' | 'pending' | 'paid';

/** The payment side of a class, as the call page and class pages see it. */
export interface PaymentState {
    required: boolean;
    can_access: boolean;
    status: PaymentStatus;
    status_label: string;
    price_cents: number;
    currency: string;
    price_label: string | null;
    payment_url: string | null;
    payment_instructions: string | null;
    reference: string | null;
    paid_at: string | null;
    /** Where a student can tell the instructor they have paid. */
    submit_url: string | null;
}

/**
 * The state of the session a student is looking at.
 *
 * - `live`     the instructor has the room open,
 * - `waiting`  a session was announced and has not started yet,
 * - `passed`   the session is over and cannot be rejoined,
 * - `none`     the instructor has not announced anything.
 */
export type SessionState = 'live' | 'waiting' | 'passed' | 'none';

/** A PDF the instructor attached to a session for students to download. */
export interface SessionMaterial {
    id: number;
    name: string;
    pages: number;
    size: number;
    url: string;
}

/** One session of a class, as the instructor and the student see it. */
export interface ClassSession {
    id: number;
    /** The instructor's name for this session; may be empty. */
    title: string | null;
    /** What the session covers, written by the instructor. */
    description: string | null;
    state: SessionState;
    starts_at: string | null;
    ends_at: string | null;
    /** "Today · 15:00". */
    when: string;
    /** "in 20 min", "Tomorrow · 09:00". */
    until: string;
    /** What to read or print before the room opens. */
    materials: SessionMaterial[];
}

/** The next session a class is waiting for. */
export interface NextSession {
    when: string;
    until: string;
    title: string | null;
    description: string | null;
    state: SessionState;
    materials: SessionMaterial[];
}

/** A PDF in the instructor's class library. */
export interface ClassMaterial extends SessionMaterial {
    /** "Added 2 h ago". */
    added: string;
}

/** A class as the instructor dashboard lists it: with live state and links out. */
export interface TeachingClassroom extends ClassroomSummary {
    /** A room is open in this class right now. */
    live: boolean;
    /** How many students are in the call this moment. */
    in_call: number;
    /** "Room is open", "Last open 2 h ago", "Not opened yet". */
    last_session: string;
    /** The next session the instructor announced, if there is one. */
    next_session?: NextSession | null;
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
    /** The next session this student may enter, if the instructor announced one. */
    next_session?: NextSession | null;
    /** Whether the live room is unlocked for this student. */
    payment: PaymentState;
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
