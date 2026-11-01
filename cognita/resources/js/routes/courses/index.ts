import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../wayfinder'
/**
* @see \App\Http\Controllers\Student\CourseController::index
* @see app/Http/Controllers/Student/CourseController.php:17
* @route '/api/courses'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/courses',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Student\CourseController::index
* @see app/Http/Controllers/Student/CourseController.php:17
* @route '/api/courses'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Student\CourseController::index
* @see app/Http/Controllers/Student/CourseController.php:17
* @route '/api/courses'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\CourseController::index
* @see app/Http/Controllers/Student/CourseController.php:17
* @route '/api/courses'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Student\CourseController::index
* @see app/Http/Controllers/Student/CourseController.php:17
* @route '/api/courses'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\CourseController::index
* @see app/Http/Controllers/Student/CourseController.php:17
* @route '/api/courses'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\CourseController::index
* @see app/Http/Controllers/Student/CourseController.php:17
* @route '/api/courses'
*/
indexForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url({
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

index.form = indexForm

/**
* @see \App\Http\Controllers\Student\CourseController::show
* @see app/Http/Controllers/Student/CourseController.php:48
* @route '/api/courses/{course}'
*/
export const show = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/api/courses/{course}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Student\CourseController::show
* @see app/Http/Controllers/Student/CourseController.php:48
* @route '/api/courses/{course}'
*/
show.url = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { course: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { course: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            course: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        course: typeof args.course === 'object'
        ? args.course.id
        : args.course,
    }

    return show.definition.url
            .replace('{course}', parsedArgs.course.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Student\CourseController::show
* @see app/Http/Controllers/Student/CourseController.php:48
* @route '/api/courses/{course}'
*/
show.get = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\CourseController::show
* @see app/Http/Controllers/Student/CourseController.php:48
* @route '/api/courses/{course}'
*/
show.head = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Student\CourseController::show
* @see app/Http/Controllers/Student/CourseController.php:48
* @route '/api/courses/{course}'
*/
const showForm = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\CourseController::show
* @see app/Http/Controllers/Student/CourseController.php:48
* @route '/api/courses/{course}'
*/
showForm.get = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\CourseController::show
* @see app/Http/Controllers/Student/CourseController.php:48
* @route '/api/courses/{course}'
*/
showForm.head = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

show.form = showForm

/**
* @see \App\Http\Controllers\Student\EnrollmentController::enroll
* @see app/Http/Controllers/Student/EnrollmentController.php:18
* @route '/api/courses/{course}/enroll'
*/
export const enroll = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: enroll.url(args, options),
    method: 'post',
})

enroll.definition = {
    methods: ["post"],
    url: '/api/courses/{course}/enroll',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Student\EnrollmentController::enroll
* @see app/Http/Controllers/Student/EnrollmentController.php:18
* @route '/api/courses/{course}/enroll'
*/
enroll.url = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { course: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { course: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            course: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        course: typeof args.course === 'object'
        ? args.course.id
        : args.course,
    }

    return enroll.definition.url
            .replace('{course}', parsedArgs.course.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Student\EnrollmentController::enroll
* @see app/Http/Controllers/Student/EnrollmentController.php:18
* @route '/api/courses/{course}/enroll'
*/
enroll.post = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: enroll.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\EnrollmentController::enroll
* @see app/Http/Controllers/Student/EnrollmentController.php:18
* @route '/api/courses/{course}/enroll'
*/
const enrollForm = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: enroll.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\EnrollmentController::enroll
* @see app/Http/Controllers/Student/EnrollmentController.php:18
* @route '/api/courses/{course}/enroll'
*/
enrollForm.post = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: enroll.url(args, options),
    method: 'post',
})

enroll.form = enrollForm

/**
* @see \App\Http\Controllers\Student\GamificationController::leaderboard
* @see app/Http/Controllers/Student/GamificationController.php:28
* @route '/api/courses/{course}/leaderboard'
*/
export const leaderboard = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: leaderboard.url(args, options),
    method: 'get',
})

leaderboard.definition = {
    methods: ["get","head"],
    url: '/api/courses/{course}/leaderboard',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Student\GamificationController::leaderboard
* @see app/Http/Controllers/Student/GamificationController.php:28
* @route '/api/courses/{course}/leaderboard'
*/
leaderboard.url = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { course: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { course: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            course: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        course: typeof args.course === 'object'
        ? args.course.id
        : args.course,
    }

    return leaderboard.definition.url
            .replace('{course}', parsedArgs.course.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Student\GamificationController::leaderboard
* @see app/Http/Controllers/Student/GamificationController.php:28
* @route '/api/courses/{course}/leaderboard'
*/
leaderboard.get = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: leaderboard.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\GamificationController::leaderboard
* @see app/Http/Controllers/Student/GamificationController.php:28
* @route '/api/courses/{course}/leaderboard'
*/
leaderboard.head = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: leaderboard.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Student\GamificationController::leaderboard
* @see app/Http/Controllers/Student/GamificationController.php:28
* @route '/api/courses/{course}/leaderboard'
*/
const leaderboardForm = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: leaderboard.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\GamificationController::leaderboard
* @see app/Http/Controllers/Student/GamificationController.php:28
* @route '/api/courses/{course}/leaderboard'
*/
leaderboardForm.get = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: leaderboard.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\GamificationController::leaderboard
* @see app/Http/Controllers/Student/GamificationController.php:28
* @route '/api/courses/{course}/leaderboard'
*/
leaderboardForm.head = (args: { course: number | { id: number } } | [course: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: leaderboard.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

leaderboard.form = leaderboardForm

const courses = {
    index: Object.assign(index, index),
    show: Object.assign(show, show),
    enroll: Object.assign(enroll, enroll),
    leaderboard: Object.assign(leaderboard, leaderboard),
}

export default courses