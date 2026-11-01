import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Panel\Instructor\AnnouncementController::store
* @see app/Http/Controllers/Panel/Instructor/AnnouncementController.php:28
* @route '/instructor/classes/{class}/announcements'
*/
export const store = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/instructor/classes/{class}/announcements',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Instructor\AnnouncementController::store
* @see app/Http/Controllers/Panel/Instructor/AnnouncementController.php:28
* @route '/instructor/classes/{class}/announcements'
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
* @see \App\Http\Controllers\Panel\Instructor\AnnouncementController::store
* @see app/Http/Controllers/Panel/Instructor/AnnouncementController.php:28
* @route '/instructor/classes/{class}/announcements'
*/
store.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\AnnouncementController::store
* @see app/Http/Controllers/Panel/Instructor/AnnouncementController.php:28
* @route '/instructor/classes/{class}/announcements'
*/
const storeForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Instructor\AnnouncementController::store
* @see app/Http/Controllers/Panel/Instructor/AnnouncementController.php:28
* @route '/instructor/classes/{class}/announcements'
*/
storeForm.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(args, options),
    method: 'post',
})

store.form = storeForm

const announcements = {
    store: Object.assign(store, store),
}

export default announcements