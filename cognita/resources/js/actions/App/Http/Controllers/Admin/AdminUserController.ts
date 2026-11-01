import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Admin\AdminUserController::index
* @see app/Http/Controllers/Admin/AdminUserController.php:33
* @route '/api/admin/users'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/admin/users',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Admin\AdminUserController::index
* @see app/Http/Controllers/Admin/AdminUserController.php:33
* @route '/api/admin/users'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminUserController::index
* @see app/Http/Controllers/Admin/AdminUserController.php:33
* @route '/api/admin/users'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::index
* @see app/Http/Controllers/Admin/AdminUserController.php:33
* @route '/api/admin/users'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::index
* @see app/Http/Controllers/Admin/AdminUserController.php:33
* @route '/api/admin/users'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::index
* @see app/Http/Controllers/Admin/AdminUserController.php:33
* @route '/api/admin/users'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::index
* @see app/Http/Controllers/Admin/AdminUserController.php:33
* @route '/api/admin/users'
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
* @see \App\Http\Controllers\Admin\AdminUserController::show
* @see app/Http/Controllers/Admin/AdminUserController.php:87
* @route '/api/admin/users/{user}'
*/
export const show = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/api/admin/users/{user}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Admin\AdminUserController::show
* @see app/Http/Controllers/Admin/AdminUserController.php:87
* @route '/api/admin/users/{user}'
*/
show.url = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { user: args }
    }

    if (Array.isArray(args)) {
        args = {
            user: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        user: args.user,
    }

    return show.definition.url
            .replace('{user}', parsedArgs.user.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminUserController::show
* @see app/Http/Controllers/Admin/AdminUserController.php:87
* @route '/api/admin/users/{user}'
*/
show.get = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::show
* @see app/Http/Controllers/Admin/AdminUserController.php:87
* @route '/api/admin/users/{user}'
*/
show.head = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::show
* @see app/Http/Controllers/Admin/AdminUserController.php:87
* @route '/api/admin/users/{user}'
*/
const showForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::show
* @see app/Http/Controllers/Admin/AdminUserController.php:87
* @route '/api/admin/users/{user}'
*/
showForm.get = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::show
* @see app/Http/Controllers/Admin/AdminUserController.php:87
* @route '/api/admin/users/{user}'
*/
showForm.head = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

show.form = showForm

/**
* @see \App\Http\Controllers\Admin\AdminUserController::warn
* @see app/Http/Controllers/Admin/AdminUserController.php:99
* @route '/api/admin/users/{user}/warn'
*/
export const warn = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: warn.url(args, options),
    method: 'post',
})

warn.definition = {
    methods: ["post"],
    url: '/api/admin/users/{user}/warn',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\AdminUserController::warn
* @see app/Http/Controllers/Admin/AdminUserController.php:99
* @route '/api/admin/users/{user}/warn'
*/
warn.url = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { user: args }
    }

    if (Array.isArray(args)) {
        args = {
            user: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        user: args.user,
    }

    return warn.definition.url
            .replace('{user}', parsedArgs.user.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminUserController::warn
* @see app/Http/Controllers/Admin/AdminUserController.php:99
* @route '/api/admin/users/{user}/warn'
*/
warn.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: warn.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::warn
* @see app/Http/Controllers/Admin/AdminUserController.php:99
* @route '/api/admin/users/{user}/warn'
*/
const warnForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: warn.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::warn
* @see app/Http/Controllers/Admin/AdminUserController.php:99
* @route '/api/admin/users/{user}/warn'
*/
warnForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: warn.url(args, options),
    method: 'post',
})

warn.form = warnForm

/**
* @see \App\Http\Controllers\Admin\AdminUserController::suspend
* @see app/Http/Controllers/Admin/AdminUserController.php:117
* @route '/api/admin/users/{user}/suspend'
*/
export const suspend = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: suspend.url(args, options),
    method: 'post',
})

suspend.definition = {
    methods: ["post"],
    url: '/api/admin/users/{user}/suspend',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\AdminUserController::suspend
* @see app/Http/Controllers/Admin/AdminUserController.php:117
* @route '/api/admin/users/{user}/suspend'
*/
suspend.url = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { user: args }
    }

    if (Array.isArray(args)) {
        args = {
            user: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        user: args.user,
    }

    return suspend.definition.url
            .replace('{user}', parsedArgs.user.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminUserController::suspend
* @see app/Http/Controllers/Admin/AdminUserController.php:117
* @route '/api/admin/users/{user}/suspend'
*/
suspend.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: suspend.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::suspend
* @see app/Http/Controllers/Admin/AdminUserController.php:117
* @route '/api/admin/users/{user}/suspend'
*/
const suspendForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: suspend.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::suspend
* @see app/Http/Controllers/Admin/AdminUserController.php:117
* @route '/api/admin/users/{user}/suspend'
*/
suspendForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: suspend.url(args, options),
    method: 'post',
})

suspend.form = suspendForm

/**
* @see \App\Http\Controllers\Admin\AdminUserController::ban
* @see app/Http/Controllers/Admin/AdminUserController.php:140
* @route '/api/admin/users/{user}/ban'
*/
export const ban = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: ban.url(args, options),
    method: 'post',
})

ban.definition = {
    methods: ["post"],
    url: '/api/admin/users/{user}/ban',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\AdminUserController::ban
* @see app/Http/Controllers/Admin/AdminUserController.php:140
* @route '/api/admin/users/{user}/ban'
*/
ban.url = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { user: args }
    }

    if (Array.isArray(args)) {
        args = {
            user: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        user: args.user,
    }

    return ban.definition.url
            .replace('{user}', parsedArgs.user.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminUserController::ban
* @see app/Http/Controllers/Admin/AdminUserController.php:140
* @route '/api/admin/users/{user}/ban'
*/
ban.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: ban.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::ban
* @see app/Http/Controllers/Admin/AdminUserController.php:140
* @route '/api/admin/users/{user}/ban'
*/
const banForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: ban.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::ban
* @see app/Http/Controllers/Admin/AdminUserController.php:140
* @route '/api/admin/users/{user}/ban'
*/
banForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: ban.url(args, options),
    method: 'post',
})

ban.form = banForm

/**
* @see \App\Http\Controllers\Admin\AdminUserController::unban
* @see app/Http/Controllers/Admin/AdminUserController.php:157
* @route '/api/admin/users/{user}/unban'
*/
export const unban = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: unban.url(args, options),
    method: 'post',
})

unban.definition = {
    methods: ["post"],
    url: '/api/admin/users/{user}/unban',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\AdminUserController::unban
* @see app/Http/Controllers/Admin/AdminUserController.php:157
* @route '/api/admin/users/{user}/unban'
*/
unban.url = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { user: args }
    }

    if (Array.isArray(args)) {
        args = {
            user: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        user: args.user,
    }

    return unban.definition.url
            .replace('{user}', parsedArgs.user.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminUserController::unban
* @see app/Http/Controllers/Admin/AdminUserController.php:157
* @route '/api/admin/users/{user}/unban'
*/
unban.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: unban.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::unban
* @see app/Http/Controllers/Admin/AdminUserController.php:157
* @route '/api/admin/users/{user}/unban'
*/
const unbanForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: unban.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::unban
* @see app/Http/Controllers/Admin/AdminUserController.php:157
* @route '/api/admin/users/{user}/unban'
*/
unbanForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: unban.url(args, options),
    method: 'post',
})

unban.form = unbanForm

/**
* @see \App\Http\Controllers\Admin\AdminUserController::changeRole
* @see app/Http/Controllers/Admin/AdminUserController.php:177
* @route '/api/admin/users/{user}/role'
*/
export const changeRole = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: changeRole.url(args, options),
    method: 'post',
})

changeRole.definition = {
    methods: ["post"],
    url: '/api/admin/users/{user}/role',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\AdminUserController::changeRole
* @see app/Http/Controllers/Admin/AdminUserController.php:177
* @route '/api/admin/users/{user}/role'
*/
changeRole.url = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { user: args }
    }

    if (Array.isArray(args)) {
        args = {
            user: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        user: args.user,
    }

    return changeRole.definition.url
            .replace('{user}', parsedArgs.user.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminUserController::changeRole
* @see app/Http/Controllers/Admin/AdminUserController.php:177
* @route '/api/admin/users/{user}/role'
*/
changeRole.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: changeRole.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::changeRole
* @see app/Http/Controllers/Admin/AdminUserController.php:177
* @route '/api/admin/users/{user}/role'
*/
const changeRoleForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: changeRole.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::changeRole
* @see app/Http/Controllers/Admin/AdminUserController.php:177
* @route '/api/admin/users/{user}/role'
*/
changeRoleForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: changeRole.url(args, options),
    method: 'post',
})

changeRole.form = changeRoleForm

/**
* @see \App\Http\Controllers\Admin\AdminUserController::impersonate
* @see app/Http/Controllers/Admin/AdminUserController.php:194
* @route '/api/admin/users/{user}/impersonate'
*/
export const impersonate = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: impersonate.url(args, options),
    method: 'post',
})

impersonate.definition = {
    methods: ["post"],
    url: '/api/admin/users/{user}/impersonate',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\AdminUserController::impersonate
* @see app/Http/Controllers/Admin/AdminUserController.php:194
* @route '/api/admin/users/{user}/impersonate'
*/
impersonate.url = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { user: args }
    }

    if (Array.isArray(args)) {
        args = {
            user: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        user: args.user,
    }

    return impersonate.definition.url
            .replace('{user}', parsedArgs.user.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminUserController::impersonate
* @see app/Http/Controllers/Admin/AdminUserController.php:194
* @route '/api/admin/users/{user}/impersonate'
*/
impersonate.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: impersonate.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::impersonate
* @see app/Http/Controllers/Admin/AdminUserController.php:194
* @route '/api/admin/users/{user}/impersonate'
*/
const impersonateForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: impersonate.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Admin\AdminUserController::impersonate
* @see app/Http/Controllers/Admin/AdminUserController.php:194
* @route '/api/admin/users/{user}/impersonate'
*/
impersonateForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: impersonate.url(args, options),
    method: 'post',
})

impersonate.form = impersonateForm

const AdminUserController = { index, show, warn, suspend, ban, unban, changeRole, impersonate }

export default AdminUserController