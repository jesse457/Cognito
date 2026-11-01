import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Auth\LogoutController::__invoke
* @see app/Http/Controllers/Auth/LogoutController.php:14
* @route '/logout'
*/
const LogoutController = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: LogoutController.url(options),
    method: 'post',
})

LogoutController.definition = {
    methods: ["post"],
    url: '/logout',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Auth\LogoutController::__invoke
* @see app/Http/Controllers/Auth/LogoutController.php:14
* @route '/logout'
*/
LogoutController.url = (options?: RouteQueryOptions) => {
    return LogoutController.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Auth\LogoutController::__invoke
* @see app/Http/Controllers/Auth/LogoutController.php:14
* @route '/logout'
*/
LogoutController.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: LogoutController.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Auth\LogoutController::__invoke
* @see app/Http/Controllers/Auth/LogoutController.php:14
* @route '/logout'
*/
const LogoutControllerForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: LogoutController.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Auth\LogoutController::__invoke
* @see app/Http/Controllers/Auth/LogoutController.php:14
* @route '/logout'
*/
LogoutControllerForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: LogoutController.url(options),
    method: 'post',
})

LogoutController.form = LogoutControllerForm

export default LogoutController