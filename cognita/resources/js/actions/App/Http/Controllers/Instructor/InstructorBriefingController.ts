import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Instructor\InstructorBriefingController::show
* @see app/Http/Controllers/Instructor/InstructorBriefingController.php:24
* @route '/api/instructor/classes/{class}/briefing'
*/
export const show = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes/{class}/briefing',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorBriefingController::show
* @see app/Http/Controllers/Instructor/InstructorBriefingController.php:24
* @route '/api/instructor/classes/{class}/briefing'
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
* @see \App\Http\Controllers\Instructor\InstructorBriefingController::show
* @see app/Http/Controllers/Instructor/InstructorBriefingController.php:24
* @route '/api/instructor/classes/{class}/briefing'
*/
show.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorBriefingController::show
* @see app/Http/Controllers/Instructor/InstructorBriefingController.php:24
* @route '/api/instructor/classes/{class}/briefing'
*/
show.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorBriefingController::show
* @see app/Http/Controllers/Instructor/InstructorBriefingController.php:24
* @route '/api/instructor/classes/{class}/briefing'
*/
const showForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorBriefingController::show
* @see app/Http/Controllers/Instructor/InstructorBriefingController.php:24
* @route '/api/instructor/classes/{class}/briefing'
*/
showForm.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorBriefingController::show
* @see app/Http/Controllers/Instructor/InstructorBriefingController.php:24
* @route '/api/instructor/classes/{class}/briefing'
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

const InstructorBriefingController = { show }

export default InstructorBriefingController