import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../wayfinder'
import users from './users'
import reports from './reports'
import courses from './courses'
import audit from './audit'
import settings from './settings'
import invitations from './invitations'
/**
* @see \App\Http\Controllers\Panel\Admin\DashboardController::dashboard
* @see app/Http/Controllers/Panel/Admin/DashboardController.php:28
* @route '/admin'
*/
export const dashboard = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: dashboard.url(options),
    method: 'get',
})

dashboard.definition = {
    methods: ["get","head"],
    url: '/admin',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Panel\Admin\DashboardController::dashboard
* @see app/Http/Controllers/Panel/Admin/DashboardController.php:28
* @route '/admin'
*/
dashboard.url = (options?: RouteQueryOptions) => {
    return dashboard.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\DashboardController::dashboard
* @see app/Http/Controllers/Panel/Admin/DashboardController.php:28
* @route '/admin'
*/
dashboard.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: dashboard.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\DashboardController::dashboard
* @see app/Http/Controllers/Panel/Admin/DashboardController.php:28
* @route '/admin'
*/
dashboard.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: dashboard.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Panel\Admin\DashboardController::dashboard
* @see app/Http/Controllers/Panel/Admin/DashboardController.php:28
* @route '/admin'
*/
const dashboardForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: dashboard.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\DashboardController::dashboard
* @see app/Http/Controllers/Panel/Admin/DashboardController.php:28
* @route '/admin'
*/
dashboardForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: dashboard.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\DashboardController::dashboard
* @see app/Http/Controllers/Panel/Admin/DashboardController.php:28
* @route '/admin'
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

const admin = {
    dashboard: Object.assign(dashboard, dashboard),
    users: Object.assign(users, users),
    reports: Object.assign(reports, reports),
    courses: Object.assign(courses, courses),
    audit: Object.assign(audit, audit),
    settings: Object.assign(settings, settings),
    invitations: Object.assign(invitations, invitations),
}

export default admin