import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../wayfinder'
/**
* @see \App\Http\Controllers\Student\ReportController::store
* @see app/Http/Controllers/Student/ReportController.php:25
* @route '/api/reports'
*/
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/reports',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Student\ReportController::store
* @see app/Http/Controllers/Student/ReportController.php:25
* @route '/api/reports'
*/
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Student\ReportController::store
* @see app/Http/Controllers/Student/ReportController.php:25
* @route '/api/reports'
*/
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\ReportController::store
* @see app/Http/Controllers/Student/ReportController.php:25
* @route '/api/reports'
*/
const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Student\ReportController::store
* @see app/Http/Controllers/Student/ReportController.php:25
* @route '/api/reports'
*/
storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(options),
    method: 'post',
})

store.form = storeForm

const reports = {
    store: Object.assign(store, store),
}

export default reports