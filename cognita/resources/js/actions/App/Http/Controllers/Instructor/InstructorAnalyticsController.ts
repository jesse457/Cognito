import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::heatmap
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:32
* @route '/api/instructor/classes/{class}/heatmap'
*/
export const heatmap = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: heatmap.url(args, options),
    method: 'get',
})

heatmap.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes/{class}/heatmap',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::heatmap
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:32
* @route '/api/instructor/classes/{class}/heatmap'
*/
heatmap.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return heatmap.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::heatmap
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:32
* @route '/api/instructor/classes/{class}/heatmap'
*/
heatmap.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: heatmap.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::heatmap
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:32
* @route '/api/instructor/classes/{class}/heatmap'
*/
heatmap.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: heatmap.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::heatmap
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:32
* @route '/api/instructor/classes/{class}/heatmap'
*/
const heatmapForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: heatmap.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::heatmap
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:32
* @route '/api/instructor/classes/{class}/heatmap'
*/
heatmapForm.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: heatmap.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::heatmap
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:32
* @route '/api/instructor/classes/{class}/heatmap'
*/
heatmapForm.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: heatmap.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

heatmap.form = heatmapForm

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::atRisk
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:45
* @route '/api/instructor/classes/{class}/at-risk'
*/
export const atRisk = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: atRisk.url(args, options),
    method: 'get',
})

atRisk.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes/{class}/at-risk',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::atRisk
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:45
* @route '/api/instructor/classes/{class}/at-risk'
*/
atRisk.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return atRisk.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::atRisk
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:45
* @route '/api/instructor/classes/{class}/at-risk'
*/
atRisk.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: atRisk.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::atRisk
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:45
* @route '/api/instructor/classes/{class}/at-risk'
*/
atRisk.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: atRisk.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::atRisk
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:45
* @route '/api/instructor/classes/{class}/at-risk'
*/
const atRiskForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: atRisk.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::atRisk
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:45
* @route '/api/instructor/classes/{class}/at-risk'
*/
atRiskForm.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: atRisk.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnalyticsController::atRisk
* @see app/Http/Controllers/Instructor/InstructorAnalyticsController.php:45
* @route '/api/instructor/classes/{class}/at-risk'
*/
atRiskForm.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: atRisk.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

atRisk.form = atRiskForm

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

const InstructorAnalyticsController = { heatmap, atRisk, snapshot }

export default InstructorAnalyticsController