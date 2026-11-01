import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::accept
* @see app/Http/Controllers/Admin/StaffInvitationController.php:73
* @route '/api/admin/staff/invitations/{token}/accept'
*/
export const accept = (args: { token: string | number } | [token: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: accept.url(args, options),
    method: 'post',
})

accept.definition = {
    methods: ["post"],
    url: '/api/admin/staff/invitations/{token}/accept',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::accept
* @see app/Http/Controllers/Admin/StaffInvitationController.php:73
* @route '/api/admin/staff/invitations/{token}/accept'
*/
accept.url = (args: { token: string | number } | [token: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { token: args }
    }

    if (Array.isArray(args)) {
        args = {
            token: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        token: args.token,
    }

    return accept.definition.url
            .replace('{token}', parsedArgs.token.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::accept
* @see app/Http/Controllers/Admin/StaffInvitationController.php:73
* @route '/api/admin/staff/invitations/{token}/accept'
*/
accept.post = (args: { token: string | number } | [token: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: accept.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::accept
* @see app/Http/Controllers/Admin/StaffInvitationController.php:73
* @route '/api/admin/staff/invitations/{token}/accept'
*/
const acceptForm = (args: { token: string | number } | [token: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: accept.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::accept
* @see app/Http/Controllers/Admin/StaffInvitationController.php:73
* @route '/api/admin/staff/invitations/{token}/accept'
*/
acceptForm.post = (args: { token: string | number } | [token: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: accept.url(args, options),
    method: 'post',
})

accept.form = acceptForm

/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::store
* @see app/Http/Controllers/Admin/StaffInvitationController.php:35
* @route '/api/admin/staff/invitations'
*/
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/admin/staff/invitations',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::store
* @see app/Http/Controllers/Admin/StaffInvitationController.php:35
* @route '/api/admin/staff/invitations'
*/
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::store
* @see app/Http/Controllers/Admin/StaffInvitationController.php:35
* @route '/api/admin/staff/invitations'
*/
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::store
* @see app/Http/Controllers/Admin/StaffInvitationController.php:35
* @route '/api/admin/staff/invitations'
*/
const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::store
* @see app/Http/Controllers/Admin/StaffInvitationController.php:35
* @route '/api/admin/staff/invitations'
*/
storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(options),
    method: 'post',
})

store.form = storeForm

/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::revoke
* @see app/Http/Controllers/Admin/StaffInvitationController.php:52
* @route '/api/admin/staff/invitations/{invitation}'
*/
export const revoke = (args: { invitation: string | number } | [invitation: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: revoke.url(args, options),
    method: 'delete',
})

revoke.definition = {
    methods: ["delete"],
    url: '/api/admin/staff/invitations/{invitation}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::revoke
* @see app/Http/Controllers/Admin/StaffInvitationController.php:52
* @route '/api/admin/staff/invitations/{invitation}'
*/
revoke.url = (args: { invitation: string | number } | [invitation: string | number ] | string | number, options?: RouteQueryOptions) => {
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

    return revoke.definition.url
            .replace('{invitation}', parsedArgs.invitation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::revoke
* @see app/Http/Controllers/Admin/StaffInvitationController.php:52
* @route '/api/admin/staff/invitations/{invitation}'
*/
revoke.delete = (args: { invitation: string | number } | [invitation: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: revoke.url(args, options),
    method: 'delete',
})

/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::revoke
* @see app/Http/Controllers/Admin/StaffInvitationController.php:52
* @route '/api/admin/staff/invitations/{invitation}'
*/
const revokeForm = (args: { invitation: string | number } | [invitation: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: revoke.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\StaffInvitationController::revoke
* @see app/Http/Controllers/Admin/StaffInvitationController.php:52
* @route '/api/admin/staff/invitations/{invitation}'
*/
revokeForm.delete = (args: { invitation: string | number } | [invitation: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: revoke.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'DELETE',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'post',
})

revoke.form = revokeForm

const StaffInvitationController = { accept, store, revoke }

export default StaffInvitationController