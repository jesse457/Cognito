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
        classrooms: '/instructor/classes',
        classroom: (id: number) => `/instructor/classes/${id}`,
        classroomKey: (id: number) => `/instructor/classes/${id}/key`,
    },

    student: {
        home: '/my-classes',
        join: '/my-classes/join',
    },

    call: (classroomId: number) => `/classes/${classroomId}/call`,
    callToken: (classroomId: number) => `/classes/${classroomId}/call/token`,
    board: (classroomId: number) => `/classes/${classroomId}/board`,
    boardDocument: (classroomId: number) => `/classes/${classroomId}/board/document`,
};
