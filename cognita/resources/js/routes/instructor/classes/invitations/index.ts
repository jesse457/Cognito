import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\Instructor\InstructorInvitationController::store
* @see app/Http/Controllers/Instructor/InstructorInvitationController.php:32
* @route '/api/instructor/classes/{class}/invitations'
*/
export const store = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/instructor/classes/{class}/invitations',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Instructor\InstructorInvitationController::store
* @see app/Http/Controllers/Instructor/InstructorInvitationController.php:32
* @route '/api/instructor/classes/{class}/invitations'
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
* @see \App\Http\Controllers\Instructor\InstructorInvitationController::store
* @see app/Http/Controllers/Instructor/InstructorInvitationController.php:32
* @route '/api/instructor/classes/{class}/invitations'
*/
store.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorInvitationController::store
* @see app/Http/Controllers/Instructor/InstructorInvitationController.php:32
* @route '/api/instructor/classes/{class}/invitations'
*/
const storeForm = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Instructor\InstructorInvitationController::store
* @see app/Http/Controllers/Instructor/InstructorInvitationController.php:32
* @route '/api/instructor/classes/{class}/invitations'
*/
storeForm.post = (args: { class: string | number } | [classParam: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(args, options),
    method: 'post',
})

store.form = storeForm

const invitations = {
    store: Object.assign(store, store),
}

export default invitations