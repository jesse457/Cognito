import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::index
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:24
* @route '/api/instructor/dashboard'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/instructor/dashboard',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::index
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:24
* @route '/api/instructor/dashboard'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::index
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:24
* @route '/api/instructor/dashboard'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::index
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:24
* @route '/api/instructor/dashboard'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::index
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:24
* @route '/api/instructor/dashboard'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::index
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:24
* @route '/api/instructor/dashboard'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::index
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:24
* @route '/api/instructor/dashboard'
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
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::show
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:34
* @route '/api/instructor/classes/{class}/dashboard'
*/
export const show = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes/{class}/dashboard',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::show
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:34
* @route '/api/instructor/classes/{class}/dashboard'
*/
show.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return show.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::show
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:34
* @route '/api/instructor/classes/{class}/dashboard'
*/
show.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::show
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:34
* @route '/api/instructor/classes/{class}/dashboard'
*/
show.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::show
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:34
* @route '/api/instructor/classes/{class}/dashboard'
*/
const showForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::show
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:34
* @route '/api/instructor/classes/{class}/dashboard'
*/
showForm.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::show
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:34
* @route '/api/instructor/classes/{class}/dashboard'
*/
showForm.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

show.form = showForm

const InstructorDashboardController = { index, show }

export default InstructorDashboardController