import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Panel\Instructor\ClassController::index
* @see app/Http/Controllers/Panel/Instructor/ClassController.php:51
* @route '/instructor/classes'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/instructor/classes',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Panel\Instructor\ClassController::index
* @see app/Http/Controllers/Panel/Instructor/ClassController.php:51
* @route '/instructor/classes'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Instructor\ClassController::index
* @see app/Http/Controllers/Panel/Instructor/ClassController.php:51
* @route '/instructor/classes'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\ClassController::index
* @see app/Http/Controllers/Panel/Instructor/ClassController.php:51
* @route '/instructor/classes'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\ClassController::index
* @see app/Http/Controllers/Panel/Instructor/ClassController.php:51
* @route '/instructor/classes'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\ClassController::index
* @see app/Http/Controllers/Panel/Instructor/ClassController.php:51
* @route '/instructor/classes'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\ClassController::index
* @see app/Http/Controllers/Panel/Instructor/ClassController.php:51
* @route '/instructor/classes'
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
* @see \App\Http\Controllers\Panel\Instructor\ClassController::show
* @see app/Http/Controllers/Panel/Instructor/ClassController.php:80
* @route '/instructor/classes/{class}'
*/
export const show = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/instructor/classes/{class}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Panel\Instructor\ClassController::show
* @see app/Http/Controllers/Panel/Instructor/ClassController.php:80
* @route '/instructor/classes/{class}'
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
* @see \App\Http\Controllers\Panel\Instructor\ClassController::show
* @see app/Http/Controllers/Panel/Instructor/ClassController.php:80
* @route '/instructor/classes/{class}'
*/
show.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\ClassController::show
* @see app/Http/Controllers/Panel/Instructor/ClassController.php:80
* @route '/instructor/classes/{class}'
*/
show.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\ClassController::show
* @see app/Http/Controllers/Panel/Instructor/ClassController.php:80
* @route '/instructor/classes/{class}'
*/
const showForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\ClassController::show
* @see app/Http/Controllers/Panel/Instructor/ClassController.php:80
* @route '/instructor/classes/{class}'
*/
showForm.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\ClassController::show
* @see app/Http/Controllers/Panel/Instructor/ClassController.php:80
* @route '/instructor/classes/{class}'
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

const ClassController = { index, show }

export default ClassController