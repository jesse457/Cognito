import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../wayfinder'
import classes from './classes'
/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::dashboard
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:24
* @route '/api/instructor/dashboard'
*/
export const dashboard = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: dashboard.url(options),
    method: 'get',
})

dashboard.definition = {
    methods: ["get","head"],
    url: '/api/instructor/dashboard',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::dashboard
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:24
* @route '/api/instructor/dashboard'
*/
dashboard.url = (options?: RouteQueryOptions) => {
    return dashboard.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::dashboard
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:24
* @route '/api/instructor/dashboard'
*/
dashboard.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: dashboard.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::dashboard
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:24
* @route '/api/instructor/dashboard'
*/
dashboard.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: dashboard.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::dashboard
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:24
* @route '/api/instructor/dashboard'
*/
const dashboardForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: dashboard.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::dashboard
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:24
* @route '/api/instructor/dashboard'
*/
dashboardForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: dashboard.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorDashboardController::dashboard
* @see app/Http/Controllers/Instructor/InstructorDashboardController.php:24
* @route '/api/instructor/dashboard'
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