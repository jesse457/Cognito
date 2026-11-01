import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Student\LiveCallController::token
* @see app/Http/Controllers/Student/LiveCallController.php:20
* @route '/api/classes/{class}/live-call/token'
*/
export const token = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: token.url(args, options),
    method: 'post',
})

token.definition = {
    methods: ["post"],
    url: '/api/classes/{class}/live-call/token',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Student\LiveCallController::token
* @see app/Http/Controllers/Student/LiveCallController.php:20
* @route '/api/classes/{class}/live-call/token'
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
* @see \App\Http\Controllers\Student\LiveCallController::token
* @see app/Http/Controllers/Student/LiveCallController.php:20
* @route '/api/classes/{class}/live-call/token'
*/
token.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: token.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\LiveCallController::token
* @see app/Http/Controllers/Student/LiveCallController.php:20
* @route '/api/classes/{class}/live-call/token'
*/
const tokenForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: token.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\LiveCallController::token
* @see app/Http/Controllers/Student/LiveCallController.php:20
* @route '/api/classes/{class}/live-call/token'
*/
tokenForm.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: token.url(args, options),
    method: 'post',
})

token.form = tokenForm

const LiveCallController = { token }

export default LiveCallController