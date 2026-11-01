import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\Admin\ImpersonationController::stop
* @see app/Http/Controllers/Admin/ImpersonationController.php:27
* @route '/api/admin/impersonation/stop'
*/
export const stop = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: stop.url(options),
    method: 'post',
})

stop.definition = {
    methods: ["post"],
    url: '/api/admin/impersonation/stop',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\ImpersonationController::stop
* @see app/Http/Controllers/Admin/ImpersonationController.php:27
* @route '/api/admin/impersonation/stop'
*/
stop.url = (options?: RouteQueryOptions) => {
    return stop.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\ImpersonationController::stop
* @see app/Http/Controllers/Admin/ImpersonationController.php:27
* @route '/api/admin/impersonation/stop'
*/
stop.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: stop.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\ImpersonationController::stop
* @see app/Http/Controllers/Admin/ImpersonationController.php:27
* @route '/api/admin/impersonation/stop'
*/
const stopForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: stop.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\ImpersonationController::stop
* @see app/Http/Controllers/Admin/ImpersonationController.php:27
* @route '/api/admin/impersonation/stop'
*/
stopForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: stop.url(options),
    method: 'post',
})

stop.form = stopForm

const impersonation = {
    stop: Object.assign(stop, stop),
}

export default impersonation