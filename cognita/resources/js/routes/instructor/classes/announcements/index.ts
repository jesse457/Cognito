import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\Instructor\InstructorAnnouncementController::index
* @see app/Http/Controllers/Instructor/InstructorAnnouncementController.php:28
* @route '/api/instructor/classes/{class}/announcements'
*/
export const index = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(args, options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/instructor/classes/{class}/announcements',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorAnnouncementController::index
* @see app/Http/Controllers/Instructor/InstructorAnnouncementController.php:28
* @route '/api/instructor/classes/{class}/announcements'
*/
index.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return index.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorAnnouncementController::index
* @see app/Http/Controllers/Instructor/InstructorAnnouncementController.php:28
* @route '/api/instructor/classes/{class}/announcements'
*/
index.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnnouncementController::index
* @see app/Http/Controllers/Instructor/InstructorAnnouncementController.php:28
* @route '/api/instructor/classes/{class}/announcements'
*/
index.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnnouncementController::index
* @see app/Http/Controllers/Instructor/InstructorAnnouncementController.php:28
* @route '/api/instructor/classes/{class}/announcements'
*/
const indexForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnnouncementController::index
* @see app/Http/Controllers/Instructor/InstructorAnnouncementController.php:28
* @route '/api/instructor/classes/{class}/announcements'
*/
indexForm.get = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnnouncementController::index
* @see app/Http/Controllers/Instructor/InstructorAnnouncementController.php:28
* @route '/api/instructor/classes/{class}/announcements'
*/
indexForm.head = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

index.form = indexForm

/**
* @see \App\Http\Controllers\Instructor\InstructorAnnouncementController::store
* @see app/Http/Controllers/Instructor/InstructorAnnouncementController.php:39
* @route '/api/instructor/classes/{class}/announcements'
*/
export const store = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/instructor/classes/{class}/announcements',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorAnnouncementController::store
* @see app/Http/Controllers/Instructor/InstructorAnnouncementController.php:39
* @route '/api/instructor/classes/{class}/announcements'
*/
store.url = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return store.definition.url
            .replace('{class}', parsedArgs.class.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Instructor\InstructorAnnouncementController::store
* @see app/Http/Controllers/Instructor/InstructorAnnouncementController.php:39
* @route '/api/instructor/classes/{class}/announcements'
*/
store.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnnouncementController::store
* @see app/Http/Controllers/Instructor/InstructorAnnouncementController.php:39
* @route '/api/instructor/classes/{class}/announcements'
*/
const storeForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorAnnouncementController::store
* @see app/Http/Controllers/Instructor/InstructorAnnouncementController.php:39
* @route '/api/instructor/classes/{class}/announcements'
*/
storeForm.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(args, options),
    method: 'post',
})

store.form = storeForm

const announcements = {
    index: Object.assign(index, index),
    store: Object.assign(store, store),
}

export default announcements