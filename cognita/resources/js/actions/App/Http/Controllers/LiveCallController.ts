import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\LiveCallController::show
* @see app/Http/Controllers/LiveCallController.php:27
* @route '/live-calls/{class}'
*/
export const show = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/live-calls/{class}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\LiveCallController::show
* @see app/Http/Controllers/LiveCallController.php:27
* @route '/live-calls/{class}'
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
* @see \App\Http\Controllers\LiveCallController::show
* @see app/Http/Controllers/LiveCallController.php:27
* @route '/live-calls/{class}'
*/
show.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\LiveCallController::show
* @see app/Http/Controllers/LiveCallController.php:27
* @route '/live-calls/{class}'
*/
show.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\LiveCallController::show
* @see app/Http/Controllers/LiveCallController.php:27
* @route '/live-calls/{class}'
*/
const showForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\LiveCallController::show
* @see app/Http/Controllers/LiveCallController.php:27
* @route '/live-calls/{class}'
*/
showForm.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\LiveCallController::show
* @see app/Http/Controllers/LiveCallController.php:27
* @route '/live-calls/{class}'
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

/**
* @see \App\Http\Controllers\LiveCallController::token
* @see app/Http/Controllers/LiveCallController.php:50
* @route '/live-calls/{class}/token'
*/
export const token = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: token.url(args, options),
    method: 'post',
})

token.definition = {
    methods: ["post"],
    url: '/live-calls/{class}/token',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\LiveCallController::token
* @see app/Http/Controllers/LiveCallController.php:50
* @route '/live-calls/{class}/token'
*/
token.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return token.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\LiveCallController::token
* @see app/Http/Controllers/LiveCallController.php:50
* @route '/live-calls/{class}/token'
*/
token.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: token.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\LiveCallController::token
* @see app/Http/Controllers/LiveCallController.php:50
* @route '/live-calls/{class}/token'
*/
const tokenForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: token.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\LiveCallController::token
* @see app/Http/Controllers/LiveCallController.php:50
* @route '/live-calls/{class}/token'
*/
tokenForm.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: token.url(args, options),
    method: 'post',
})

token.form = tokenForm

const LiveCallController = { show, token }

export default LiveCallController