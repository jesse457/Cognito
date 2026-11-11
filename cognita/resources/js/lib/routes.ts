/**
 * The app's route table, kept in one small file instead of a generated client.
 * Paths mirror routes/web.php.
 */
export const routes = {
    welcome: '/',
    login: '/login',
    register: '/register',
    logout: '/logout',
    dashboard: '/dashboard',
    join: '/join',

    admin: {
        dashboard: '/admin',
        users: '/admin/users',
        courses: '/admin/courses',
        classrooms: '/admin/classrooms',
        user: (id: number) => `/admin/users/${id}`,
        userRole: (id: number) => `/admin/users/${id}/role`,
    },

    instructor: {
        dashboard: '/instructor',
        courses: '/instructor/courses',
        course: (id: number) => `/instructor/courses/${id}`,
        students: '/instructor/students',
        attendance: '/instructor/attendance',
        classrooms: '/instructor/classes',
        classroom: (id: number) => `/instructor/classes/${id}`,
        classroomKey: (id: number) => `/instructor/classes/${id}/key`,
        classroomAttendance: (id: number, date?: string) =>
            `/instructor/classes/${id}/attendance${date === undefined ? '' : `?date=${encodeURIComponent(date)}`}`,
        studentDrawing: (classroomId: number, studentId: number) =>
            `/instructor/classes/${classroomId}/students/${studentId}/drawing`,
        attendanceExport: (classroomId: number, format: 'xlsx' | 'pdf', date: string) =>
            `/instructor/classes/${classroomId}/attendance/export/${format}?date=${encodeURIComponent(date)}`,
    },

    student: {
        home: '/my-classes',
        classrooms: '/my-classes/classes',
        classroom: (id: number) => `/my-classes/classes/${id}`,
        attendance: '/my-classes/attendance',
        materials: '/my-classes/materials',
        join: '/my-classes/join',
    },

    call: (classroomId: number) => `/classes/${classroomId}/call`,
    callToken: (classroomId: number) => `/classes/${classroomId}/call/token`,
    callParticipantRemove: (classroomId: number, identity: string) =>
        `/classes/${classroomId}/call/participants/${encodeURIComponent(identity)}/remove`,
    callParticipantPermission: (classroomId: number, identity: string) =>
        `/classes/${classroomId}/call/participants/${encodeURIComponent(identity)}/permission`,
    board: (classroomId: number) => `/classes/${classroomId}/board`,
    boardDocument: (classroomId: number) => `/classes/${classroomId}/board/document`,
    callPolls: (classroomId: number) => `/classes/${classroomId}/call/polls`,
    callPollRespond: (classroomId: number, pollId: number) =>
        `/classes/${classroomId}/call/polls/${pollId}/respond`,
    callPollClose: (classroomId: number, pollId: number) =>
        `/classes/${classroomId}/call/polls/${pollId}/close`,

    questions: {
        index: '/questions',
        store: '/questions',
        show: (id: number) => `/questions/${id}`,
        media: (id: number) => `/questions/media/${id}`,
        vote: (id: number) => `/questions/${id}/vote`,
        answers: {
            store: (questionId: number) => `/questions/${questionId}/answers`,
        },
    },

    answers: {
        vote: (id: number) => `/answers/${id}/vote`,
        accept: (id: number) => `/answers/${id}/accept`,
    },
};
