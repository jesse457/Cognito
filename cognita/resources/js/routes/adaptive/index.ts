import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../wayfinder'
/**
* @see \App\Http\Controllers\Student\AdaptiveController::index
* @see app/Http/Controllers/Student/AdaptiveController.php:20
* @route '/api/adaptive/recommendations'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/adaptive/recommendations',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Student\AdaptiveController::index
* @see app/Http/Controllers/Student/AdaptiveController.php:20
* @route '/api/adaptive/recommendations'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Student\AdaptiveController::index
* @see app/Http/Controllers/Student/AdaptiveController.php:20
* @route '/api/adaptive/recommendations'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\AdaptiveController::index
* @see app/Http/Controllers/Student/AdaptiveController.php:20
* @route '/api/adaptive/recommendations'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Student\AdaptiveController::index
* @see app/Http/Controllers/Student/AdaptiveController.php:20
* @route '/api/adaptive/recommendations'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\AdaptiveController::index
* @see app/Http/Controllers/Student/AdaptiveController.php:20
* @route '/api/adaptive/recommendations'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Student\AdaptiveController::index
* @see app/Http/Controllers/Student/AdaptiveController.php:20
* @route '/api/adaptive/recommendations'
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

const adaptive = {
    index: Object.assign(index, index),
}

export default adaptive