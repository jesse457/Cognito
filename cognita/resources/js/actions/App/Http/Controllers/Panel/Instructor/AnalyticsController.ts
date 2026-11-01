import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Panel\Instructor\AnalyticsController::snapshot
* @see app/Http/Controllers/Panel/Instructor/AnalyticsController.php:30
* @route '/instructor/classes/{class}/snapshot'
*/
export const snapshot = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: snapshot.url(args, options),
    method: 'post',
})

snapshot.definition = {
    methods: ["post"],
    url: '/instructor/classes/{class}/snapshot',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Instructor\AnalyticsController::snapshot
* @see app/Http/Controllers/Panel/Instructor/AnalyticsController.php:30
* @route '/instructor/classes/{class}/snapshot'
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
* @see \App\Http\Controllers\Panel\Instructor\AnalyticsController::snapshot
* @see app/Http/Controllers/Panel/Instructor/AnalyticsController.php:30
* @route '/instructor/classes/{class}/snapshot'
*/
snapshot.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: snapshot.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\AnalyticsController::snapshot
* @see app/Http/Controllers/Panel/Instructor/AnalyticsController.php:30
* @route '/instructor/classes/{class}/snapshot'
*/
const snapshotForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: snapshot.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\AnalyticsController::snapshot
* @see app/Http/Controllers/Panel/Instructor/AnalyticsController.php:30
* @route '/instructor/classes/{class}/snapshot'
*/
snapshotForm.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: snapshot.url(args, options),
    method: 'post',
})

snapshot.form = snapshotForm

const AnalyticsController = { snapshot }

export default AnalyticsController