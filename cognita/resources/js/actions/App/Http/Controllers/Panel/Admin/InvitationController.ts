import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::index
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:26
* @route '/admin/invitations'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/admin/invitations',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::index
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:26
* @route '/admin/invitations'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::index
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:26
* @route '/admin/invitations'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::index
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:26
* @route '/admin/invitations'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::index
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:26
* @route '/admin/invitations'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::index
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:26
* @route '/admin/invitations'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::index
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:26
* @route '/admin/invitations'
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

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::store
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:69
* @route '/admin/invitations'
*/
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/admin/invitations',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::store
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:69
* @route '/admin/invitations'
*/
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::store
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:69
* @route '/admin/invitations'
*/
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::store
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:69
* @route '/admin/invitations'
*/
const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::store
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:69
* @route '/admin/invitations'
*/
storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(options),
    method: 'post',
})

store.form = storeForm

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::destroy
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:88
* @route '/admin/invitations/{invitation}'
*/
export const destroy = (args: { invitation: string | number } | [invitation: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

destroy.definition = {
    methods: ["delete"],
    url: '/admin/invitations/{invitation}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::destroy
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:88
* @route '/admin/invitations/{invitation}'
*/
destroy.url = (args: { invitation: string | number } | [invitation: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { invitation: args }
    }

    if (Array.isArray(args)) {
        args = {
            invitation: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        invitation: args.invitation,
    }

    return destroy.definition.url
            .replace('{invitation}', parsedArgs.invitation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::destroy
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:88
* @route '/admin/invitations/{invitation}'
*/
destroy.delete = (args: { invitation: string | number } | [invitation: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::destroy
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:88
* @route '/admin/invitations/{invitation}'
*/
const destroyForm = (args: { invitation: string | number } | [invitation: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: destroy.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\InvitationController::destroy
* @see app/Http/Controllers/Panel/Admin/InvitationController.php:88
* @route '/admin/invitations/{invitation}'
*/
destroyForm.delete = (args: { invitation: string | number } | [invitation: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: destroy.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

destroy.form = destroyForm

const InvitationController = { index, store, destroy }

export default InvitationController