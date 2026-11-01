import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
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

/**
* @see \App\Http\Controllers\Student\GamificationController::profile
* @see app/Http/Controllers/Student/GamificationController.php:20
* @route '/api/profile/xp'
*/
export const profile = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: profile.url(options),
    method: 'get',
})

profile.definition = {
    methods: ["get","head"],
    url: '/api/profile/xp',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Student\GamificationController::profile
* @see app/Http/Controllers/Student/GamificationController.php:20
* @route '/api/profile/xp'
*/
profile.url = (options?: RouteQueryOptions) => {
    return profile.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Student\GamificationController::profile
* @see app/Http/Controllers/Student/GamificationController.php:20
* @route '/api/profile/xp'
*/
profile.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: profile.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\GamificationController::profile
* @see app/Http/Controllers/Student/GamificationController.php:20
* @route '/api/profile/xp'
*/
profile.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: profile.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Student\GamificationController::profile
* @see app/Http/Controllers/Student/GamificationController.php:20
* @route '/api/profile/xp'
*/
const profileForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: profile.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\GamificationController::profile
* @see app/Http/Controllers/Student/GamificationController.php:20
* @route '/api/profile/xp'
*/
profileForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: profile.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\GamificationController::profile
* @see app/Http/Controllers/Student/GamificationController.php:20
* @route '/api/profile/xp'
*/
profileForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: profile.url({
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

profile.form = profileForm

const GamificationController = { leaderboard, profile }

export default GamificationController