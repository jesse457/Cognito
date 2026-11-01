import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::warn
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:28
* @route '/admin/users/{user}/warn'
*/
export const warn = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: warn.url(args, options),
    method: 'post',
})

warn.definition = {
    methods: ["post"],
    url: '/admin/users/{user}/warn',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::warn
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:28
* @route '/admin/users/{user}/warn'
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
* @see \App\Http\Controllers\Panel\Admin\UserActionController::warn
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:28
* @route '/admin/users/{user}/warn'
*/
warn.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: warn.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::warn
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:28
* @route '/admin/users/{user}/warn'
*/
const warnForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: warn.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::warn
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:28
* @route '/admin/users/{user}/warn'
*/
warnForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: warn.url(args, options),
    method: 'post',
})

warn.form = warnForm

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::suspend
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:41
* @route '/admin/users/{user}/suspend'
*/
export const suspend = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: suspend.url(args, options),
    method: 'post',
})

suspend.definition = {
    methods: ["post"],
    url: '/admin/users/{user}/suspend',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::suspend
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:41
* @route '/admin/users/{user}/suspend'
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
* @see \App\Http\Controllers\Panel\Admin\UserActionController::suspend
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:41
* @route '/admin/users/{user}/suspend'
*/
suspend.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: suspend.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::suspend
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:41
* @route '/admin/users/{user}/suspend'
*/
const suspendForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: suspend.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::suspend
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:41
* @route '/admin/users/{user}/suspend'
*/
suspendForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: suspend.url(args, options),
    method: 'post',
})

suspend.form = suspendForm

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::ban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:55
* @route '/admin/users/{user}/ban'
*/
export const ban = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: ban.url(args, options),
    method: 'post',
})

ban.definition = {
    methods: ["post"],
    url: '/admin/users/{user}/ban',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::ban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:55
* @route '/admin/users/{user}/ban'
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
* @see \App\Http\Controllers\Panel\Admin\UserActionController::ban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:55
* @route '/admin/users/{user}/ban'
*/
ban.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: ban.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::ban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:55
* @route '/admin/users/{user}/ban'
*/
const banForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: ban.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::ban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:55
* @route '/admin/users/{user}/ban'
*/
banForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: ban.url(args, options),
    method: 'post',
})

ban.form = banForm

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::unban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:68
* @route '/admin/users/{user}/unban'
*/
export const unban = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: unban.url(args, options),
    method: 'post',
})

unban.definition = {
    methods: ["post"],
    url: '/admin/users/{user}/unban',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::unban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:68
* @route '/admin/users/{user}/unban'
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
* @see \App\Http\Controllers\Panel\Admin\UserActionController::unban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:68
* @route '/admin/users/{user}/unban'
*/
unban.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: unban.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::unban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:68
* @route '/admin/users/{user}/unban'
*/
const unbanForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: unban.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::unban
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:68
* @route '/admin/users/{user}/unban'
*/
unbanForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: unban.url(args, options),
    method: 'post',
})

unban.form = unbanForm

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::changeRole
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:81
* @route '/admin/users/{user}/role'
*/
export const changeRole = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: changeRole.url(args, options),
    method: 'post',
})

changeRole.definition = {
    methods: ["post"],
    url: '/admin/users/{user}/role',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::changeRole
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:81
* @route '/admin/users/{user}/role'
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
* @see \App\Http\Controllers\Panel\Admin\UserActionController::changeRole
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:81
* @route '/admin/users/{user}/role'
*/
changeRole.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: changeRole.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::changeRole
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:81
* @route '/admin/users/{user}/role'
*/
const changeRoleForm = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: changeRole.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Panel\Admin\UserActionController::changeRole
* @see app/Http/Controllers/Panel/Admin/UserActionController.php:81
* @route '/admin/users/{user}/role'
*/
changeRoleForm.post = (args: { user: string | number } | [user: string | number ] | string | number, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: changeRole.url(args, options),
    method: 'post',
})

changeRole.form = changeRoleForm

const UserActionController = { warn, suspend, ban, unban, changeRole }

export default UserActionController