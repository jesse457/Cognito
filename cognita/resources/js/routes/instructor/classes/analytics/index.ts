import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::snapshot
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:61
* @route '/api/instructor/classes/{class}/analytics/snapshot'
*/
export const snapshot = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: snapshot.url(args, options),
    method: 'post',
})

snapshot.definition = {
    methods: ["post"],
    url: '/api/instructor/classes/{class}/analytics/snapshot',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::snapshot
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:61
* @route '/api/instructor/classes/{class}/analytics/snapshot'
*/
snapshot.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { class: args }
    }

    if (Array.isArray(args)) {
        args = {
            class: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        class: args.class,
    }

    return snapshot.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::snapshot
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:61
* @route '/api/instructor/classes/{class}/analytics/snapshot'
*/
snapshot.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: snapshot.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::snapshot
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:61
* @route '/api/instructor/classes/{class}/analytics/snapshot'
*/
const snapshotForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: snapshot.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::snapshot
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:61
* @route '/api/instructor/classes/{class}/analytics/snapshot'
*/
snapshotForm.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: snapshot.url(args, options),
    method: 'post',
})

snapshot.form = snapshotForm

const analytics = {
    snapshot: Object.assign(snapshot, snapshot),
}

export default analytics