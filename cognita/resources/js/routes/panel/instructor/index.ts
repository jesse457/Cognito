import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../wayfinder'
import classes from './classes'
/**
* @see \App\Http\Controllers\Panel\Instructor\DashboardController::dashboard
* @see app/Http/Controllers/Panel/Instructor/DashboardController.php:25
* @route '/instructor'
*/
export const dashboard = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: dashboard.url(options),
    method: 'get',
})

dashboard.definition = {
    methods: ["get","head"],
    url: '/instructor',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Panel\Instructor\DashboardController::dashboard
* @see app/Http/Controllers/Panel/Instructor/DashboardController.php:25
* @route '/instructor'
*/
dashboard.url = (options?: RouteQueryOptions) => {
    return dashboard.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Instructor\DashboardController::dashboard
* @see app/Http/Controllers/Panel/Instructor/DashboardController.php:25
* @route '/instructor'
*/
dashboard.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: dashboard.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\DashboardController::dashboard
* @see app/Http/Controllers/Panel/Instructor/DashboardController.php:25
* @route '/instructor'
*/
dashboard.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: dashboard.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\DashboardController::dashboard
* @see app/Http/Controllers/Panel/Instructor/DashboardController.php:25
* @route '/instructor'
*/
const dashboardForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: dashboard.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\DashboardController::dashboard
* @see app/Http/Controllers/Panel/Instructor/DashboardController.php:25
* @route '/instructor'
*/
dashboardForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: dashboard.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\DashboardController::dashboard
* @see app/Http/Controllers/Panel/Instructor/DashboardController.php:25
* @route '/instructor'
*/
dashboardForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: dashboard.url({
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

dashboard.form = dashboardForm

const instructor = {
    dashboard: Object.assign(dashboard, dashboard),
    classes: Object.assign(classes, classes),
}

export default instructor