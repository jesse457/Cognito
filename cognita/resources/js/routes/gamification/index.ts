import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../wayfinder'
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

const gamification = {
    profile: Object.assign(profile, profile),
}

export default gamification