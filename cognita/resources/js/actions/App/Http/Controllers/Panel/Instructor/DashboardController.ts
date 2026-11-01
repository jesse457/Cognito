import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Panel\Instructor\DashboardController::index
* @see app/Http/Controllers/Panel/Instructor/DashboardController.php:25
* @route '/instructor'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/instructor',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Panel\Instructor\DashboardController::index
* @see app/Http/Controllers/Panel/Instructor/DashboardController.php:25
* @route '/instructor'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Instructor\DashboardController::index
* @see app/Http/Controllers/Panel/Instructor/DashboardController.php:25
* @route '/instructor'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\DashboardController::index
* @see app/Http/Controllers/Panel/Instructor/DashboardController.php:25
* @route '/instructor'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\DashboardController::index
* @see app/Http/Controllers/Panel/Instructor/DashboardController.php:25
* @route '/instructor'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\DashboardController::index
* @see app/Http/Controllers/Panel/Instructor/DashboardController.php:25
* @route '/instructor'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\DashboardController::index
* @see app/Http/Controllers/Panel/Instructor/DashboardController.php:25
* @route '/instructor'
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

const DashboardController = { index }

export default DashboardController