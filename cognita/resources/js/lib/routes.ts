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
    profile: '/profile',
    join: '/join',

    community: {
        courses: '/community/courses',
        course: (id: number) => `/community/courses/${id}`,
        lesson: (id: number) => `/community/lessons/${id}`,
        lessonProgress: (id: number) => `/community/lessons/${id}/progress`,
        groups: {
            index: '/community/groups',
            store: '/community/groups',
            show: (id: number) => `/community/groups/${id}`,
            join: (id: number) => `/community/groups/${id}/join`,
            leave: (id: number) => `/community/groups/${id}/leave`,
        },
    },

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
        courseSections: (id: number) => `/instructor/courses/${id}/sections`,
        section: (id: number) => `/instructor/sections/${id}`,
        sectionLessons: (id: number) => `/instructor/sections/${id}/lessons`,
        lesson: (id: number) => `/instructor/lessons/${id}`,
        courseMaterials: (id: number) => `/instructor/courses/${id}/materials`,
        courseMaterial: (courseId: number, materialId: number) =>
            `/instructor/courses/${courseId}/materials/${materialId}`,
        students: '/instructor/students',
        attendance: '/instructor/attendance',
        classrooms: '/instructor/classes',
        classroom: (id: number) => `/instructor/classes/${id}`,
        classroomKey: (id: number) => `/instructor/classes/${id}/key`,
        classMaterials: (id: number) => `/instructor/classes/${id}/materials`,
        classMaterial: (classroomId: number, documentId: number) =>
            `/instructor/classes/${classroomId}/materials/${documentId}`,
        classroomAttendance: (id: number, date?: string) =>
            `/instructor/classes/${id}/attendance${date === undefined ? '' : `?date=${encodeURIComponent(date)}`}`,
        studentDrawing: (classroomId: number, studentId: number) =>
            `/instructor/classes/${classroomId}/students/${studentId}/drawing`,
        studentPayment: (classroomId: number, studentId: number) =>
            `/instructor/classes/${classroomId}/students/${studentId}/payment`,
        attendanceExport: (classroomId: number, format: 'xlsx' | 'pdf', date: string) =>
            `/instructor/classes/${classroomId}/attendance/export/${format}?date=${encodeURIComponent(date)}`,
    },

    student: {
        home: '/my-classes',
        classrooms: '/my-classes/classes',
        classroom: (id: number) => `/my-classes/classes/${id}`,
        payment: (id: number) => `/my-classes/classes/${id}/payment`,
        attendance: '/my-classes/attendance',
        materials: '/my-classes/materials',
        courses: '/my-classes/courses',
        course: (id: number) => `/my-classes/courses/${id}`,
        lesson: (id: number) => `/my-classes/lessons/${id}`,
        lessonProgress: (id: number) => `/my-classes/lessons/${id}/progress`,
    },

    courseMaterial: (id: number) => `/course-materials/${id}`,
    call: (classroomId: number) => `/classes/${classroomId}/call`,
    callSessionSchedule: (classroomId: number) => `/classes/${classroomId}/call/session/schedule`,
    callSessionStart: (classroomId: number) => `/classes/${classroomId}/call/session/start`,
    callToken: (classroomId: number) => `/classes/${classroomId}/call/token`,
    callParticipantRemove: (classroomId: number, identity: string) =>
        `/classes/${classroomId}/call/participants/${encodeURIComponent(identity)}/remove`,
    callParticipantPermission: (classroomId: number, identity: string) =>
        `/classes/${classroomId}/call/participants/${encodeURIComponent(identity)}/permission`,
    board: (classroomId: number) => `/classes/${classroomId}/board`,
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
